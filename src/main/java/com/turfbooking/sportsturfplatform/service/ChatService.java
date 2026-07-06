package com.turfbooking.sportsturfplatform.service;

import com.turfbooking.sportsturfplatform.dto.ChatRequestDto;
import com.turfbooking.sportsturfplatform.dto.ChatResponseDto;
import com.turfbooking.sportsturfplatform.model.ChatHistory;
import com.turfbooking.sportsturfplatform.model.Document;
import com.turfbooking.sportsturfplatform.model.Turf;
import com.turfbooking.sportsturfplatform.model.User;
import com.turfbooking.sportsturfplatform.repository.ChatHistoryRepository;
import com.turfbooking.sportsturfplatform.repository.DocumentRepository;
import com.turfbooking.sportsturfplatform.repository.TurfRepository;
import com.turfbooking.sportsturfplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatHistoryRepository chatHistoryRepository;
    private final DocumentRepository documentRepository;
    private final TurfRepository turfRepository;
    private final UserRepository userRepository;
    private final ChatClient chatClient;
    private final VectorSearchService vectorSearchService;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("hh:mm a");

    /**
     * Processes a chat message using Gemini, persistent history (Memory), and rule sheets (RAG).
     */
    @Transactional
    public ChatResponseDto processChatMessage(String sessionId, ChatRequestDto requestDto) {
        log.info("Processing chat message for session {}: '{}'", sessionId, requestDto.getContent());

        // Resolve current authenticated user if possible
        User currentUser = null;
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        if (email != null && !email.equals("anonymousUser")) {
            currentUser = userRepository.findByEmail(email).orElse(null);
        }

        // Save USER message to database
        ChatHistory userMessage = ChatHistory.builder()
                .sessionId(sessionId)
                .user(currentUser)
                .sender("USER")
                .message(requestDto.getContent())
                .build();
        chatHistoryRepository.save(userMessage);

        // 1. RAG Component: Query pgvector semantic search engine
        String ragContext = vectorSearchService.buildSemanticContext(requestDto.getContent(), "ALL", 3);

        // 2. Load available active Turfs so Gemini knows exactly what facilities exist
        List<Turf> turfs = turfRepository.findByIsActiveTrue();
        StringBuilder turfContext = new StringBuilder();
        if (!turfs.isEmpty()) {
            turfContext.append("--- AVAILABLE ACTIVE TURF FACILITIES ---\n");
            for (Turf t : turfs) {
                turfContext.append(String.format("Turf ID: %d, Name: '%s', Location: '%s', Sport: %s, Price: $%s/hr, Description: %s\n",
                        t.getId(), t.getName(), t.getLocation(), t.getSportsType(), t.getPricePerHour(), t.getDescription()));
            }
        }

        // 3. Conversation Memory Component: Load past history
        List<ChatHistory> history = chatHistoryRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        StringBuilder conversationHistory = new StringBuilder();
        if (!history.isEmpty()) {
            conversationHistory.append("--- CONVERSATION HISTORY (Memory Context) ---\n");
            // Only take the last 10 messages for token efficiency
            int startIndex = Math.max(0, history.size() - 11); // EXCLUDE the current one we just saved
            for (int i = startIndex; i < history.size() - 1; i++) {
                ChatHistory h = history.get(i);
                conversationHistory.append(String.format("%s: %s\n", h.getSender(), h.getMessage()));
            }
        }

        // Build System Instructions
        String systemInstruction = """
                You are the "Gemini Arena Scheduler Bot", a highly intelligent, polite, and helpful sports coordinator assistant.
                Your job is to assist players in finding turfs, understanding cancellation/overlap policies, and booking slots.
                
                You have access to:
                1. RAG Context (Rules & policies)
                2. Real-time active turfs in the system
                3. Past conversation history (for memory)
                
                Guidelines:
                - ALWAYS answer rules queries based on the RAG context provided.
                - When recommending a turf, recommend actual active turfs from the "AVAILABLE ACTIVE TURF FACILITIES" list. Mention their names, locations, and prices.
                - If the user asks about booking, reserve, or express interest in a specific turf, suggest they book it.
                - KEYWORD COMMAND: If you recommend or discuss a specific turf from the list, append a special tag at the very end of your response: `[RECOMMEND_TURF_ID: <id>]` where <id> is the Turf ID. Ensure this tag is on its own line.
                - Keep your tone athletic, inviting, professional, and friendly.
                """;

        // Build User Prompt combining all components
        String userPrompt = """
                %s
                
                %s
                
                %s
                
                Current User Question: "%s"
                
                Please generate your helpful response. Include the `[RECOMMEND_TURF_ID: <id>]` command tag if referencing a specific turf.
                """.formatted(ragContext, turfContext.toString(), conversationHistory.toString(), requestDto.getContent());

        String aiResponseText;
        try {
            // Call Gemini via the spring-ai chatClient
            aiResponseText = chatClient.prompt()
                    .system(systemInstruction)
                    .user(userPrompt)
                    .call()
                    .content();
        } catch (Exception e) {
            log.error("Failed to generate AI response from Gemini: ", e);
            aiResponseText = "I apologize, but I am experiencing some connectivity issues with my Gemini intelligence core. However, I can let you know that we have Starfire Arena Turf A and Redmond Futsal Hub available for your booking needs today! Please try again in a moment.";
        }

        // Parse recommendation command if present
        Long recommendedTurfId = null;
        String recommendedTurfName = null;

        Pattern pattern = Pattern.compile("\\[RECOMMEND_TURF_ID:\\s*(\\d+)\\]");
        Matcher matcher = pattern.matcher(aiResponseText);
        if (matcher.find()) {
            try {
                recommendedTurfId = Long.parseLong(matcher.group(1));
                // Clear the command block from the user-facing text to keep it polished
                aiResponseText = aiResponseText.replaceAll("\\[RECOMMEND_TURF_ID:\\s*\\d+\\]", "").trim();

                // Look up turf name
                Optional<Turf> recommendedTurf = turfRepository.findById(recommendedTurfId);
                if (recommendedTurf.isPresent()) {
                    recommendedTurfName = recommendedTurf.get().getName();
                }
            } catch (Exception ex) {
                log.warn("Failed to parse recommended turf ID from AI response", ex);
            }
        }

        // Save AI response to database chat history
        ChatHistory aiMessage = ChatHistory.builder()
                .sessionId(sessionId)
                .user(currentUser)
                .sender("AI")
                .message(aiResponseText)
                .build();
        chatHistoryRepository.save(aiMessage);

        return ChatResponseDto.builder()
                .id("ai-" + System.currentTimeMillis())
                .sender("AI")
                .message(aiResponseText)
                .timestamp(LocalDateTime.now().format(TIME_FORMATTER))
                .actionTurfId(recommendedTurfId)
                .actionTurfName(recommendedTurfName)
                .build();
    }

    /**
     * Clears chat history for a given session.
     */
    @Transactional
    public void clearHistory(String sessionId) {
        log.info("Clearing chat history for session {}", sessionId);
        chatHistoryRepository.deleteBySessionId(sessionId);
    }

    /**
     * Retrieves all history for a session formatted as DTOs.
     */
    @Transactional(readOnly = true)
    public List<ChatResponseDto> getSessionHistory(String sessionId) {
        return chatHistoryRepository.findBySessionIdOrderByCreatedAtAsc(sessionId).stream()
                .map(h -> ChatResponseDto.builder()
                        .id(h.getId().toString())
                        .sender(h.getSender())
                        .message(h.getMessage())
                        .timestamp(h.getCreatedAt().format(TIME_FORMATTER))
                        .build())
                .toList();
    }
}
