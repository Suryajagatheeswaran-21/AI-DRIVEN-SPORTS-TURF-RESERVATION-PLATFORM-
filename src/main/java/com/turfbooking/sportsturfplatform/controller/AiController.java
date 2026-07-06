package com.turfbooking.sportsturfplatform.controller;

import com.turfbooking.sportsturfplatform.dto.ChatRequestDto;
import com.turfbooking.sportsturfplatform.dto.ChatResponseDto;
import com.turfbooking.sportsturfplatform.dto.VectorSearchResult;
import com.turfbooking.sportsturfplatform.dto.AiRecommendationResponse;
import com.turfbooking.sportsturfplatform.service.ChatService;
import com.turfbooking.sportsturfplatform.service.RecommendationService;
import com.turfbooking.sportsturfplatform.service.VectorSearchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AiController {

    private final ChatService chatService;
    private final RecommendationService recommendationService;
    private final VectorSearchService vectorSearchService;

    /**
     * Endpoint for AI Arena Smart Assistant Bot.
     * Maps to POST /api/v1/chat/messages
     */
    @PostMapping("/chat/messages")
    public ResponseEntity<ChatResponseDto> sendChatMessage(
            @RequestParam(name = "session", defaultValue = "guest-session") String sessionId,
            @Valid @RequestBody ChatRequestDto requestDto
    ) {
        log.info("REST API request: Chat message in session {}", sessionId);
        ChatResponseDto response = chatService.processChatMessage(sessionId, requestDto);
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves conversational history for a given session.
     * Maps to GET /api/v1/chat/history
     */
    @GetMapping("/chat/history")
    public ResponseEntity<List<ChatResponseDto>> getChatHistory(
            @RequestParam(name = "session", defaultValue = "guest-session") String sessionId
    ) {
        log.info("REST API request: Get chat history for session {}", sessionId);
        List<ChatResponseDto> history = chatService.getSessionHistory(sessionId);
        return ResponseEntity.ok(history);
    }

    /**
     * Clears conversational history for a given session.
     * Maps to DELETE /api/v1/chat/history
     */
    @DeleteMapping("/chat/history")
    public ResponseEntity<Void> clearChatHistory(
            @RequestParam(name = "session", defaultValue = "guest-session") String sessionId
    ) {
        log.info("REST API request: Clear chat history for session {}", sessionId);
        chatService.clearHistory(sessionId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Endpoint for fetching smart recommendations with detailed reasoning from Gemini.
     * Maps to GET /api/v1/ai/recommendations
     */
    @GetMapping("/ai/recommendations")
    public ResponseEntity<String> getSmartRecommendations(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String sportsType,
            @RequestParam(required = false) BigDecimal maxPrice
    ) {
        log.info("REST API request: Get smart turf recommendations");
        String recommendations = recommendationService.generateRecommendationExplanation(query, sportsType, maxPrice);
        return ResponseEntity.ok(recommendations);
    }

    /**
     * Feature 1: Nearby Turf Recommendations using pgvector cosine similarity.
     * Maps to GET /api/v1/ai/recommendations/nearby
     */
    @GetMapping("/ai/recommendations/nearby")
    public ResponseEntity<AiRecommendationResponse> getNearbyRecommendations(
            @RequestParam(required = false) String location
    ) {
        log.info("REST API request: Get nearby recommendations for location '{}'", location);
        AiRecommendationResponse response = recommendationService.getNearbyRecommendations(location);
        return ResponseEntity.ok(response);
    }

    /**
     * Feature 2: Best Time Slot Recommendations.
     * Maps to GET /api/v1/ai/recommendations/best-time
     */
    @GetMapping("/ai/recommendations/best-time")
    public ResponseEntity<AiRecommendationResponse> getBestTimeRecommendations(
            @RequestParam Long turfId,
            @RequestParam(required = false) String date
    ) {
        log.info("REST API request: Get best time slot recommendations for turf ID: {} and date: {}", turfId, date);
        AiRecommendationResponse response = recommendationService.getBestTimeRecommendations(turfId, date);
        return ResponseEntity.ok(response);
    }

    /**
     * Feature 3: Budget Recommendations.
     * Maps to GET /api/v1/ai/recommendations/budget
     */
    @GetMapping("/ai/recommendations/budget")
    public ResponseEntity<AiRecommendationResponse> getBudgetRecommendations(
            @RequestParam BigDecimal maxPrice
    ) {
        log.info("REST API request: Get budget-friendly recommendations for limit: {}", maxPrice);
        AiRecommendationResponse response = recommendationService.getBudgetRecommendations(maxPrice);
        return ResponseEntity.ok(response);
    }

    /**
     * Feature 4: Alternative Turf Suggestions.
     * Maps to GET /api/v1/ai/recommendations/alternative
     */
    @GetMapping("/ai/recommendations/alternative")
    public ResponseEntity<AiRecommendationResponse> getAlternativeRecommendations(
            @RequestParam Long turfId
    ) {
        log.info("REST API request: Get alternative suggestions for turf ID: {}", turfId);
        AiRecommendationResponse response = recommendationService.getAlternativeRecommendations(turfId);
        return ResponseEntity.ok(response);
    }

    /**
     * Feature 5: Intelligent Hybrid Natural Language Search (Vector search + RAG + Gemini).
     * Maps to GET /api/v1/ai/recommendations/natural-search
     */
    @GetMapping("/ai/recommendations/natural-search")
    public ResponseEntity<AiRecommendationResponse> getNaturalLanguageRecommendations(
            @RequestParam String query
    ) {
        log.info("REST API request: Natural language search and recommendation for query: '{}'", query);
        AiRecommendationResponse response = recommendationService.getNaturalLanguageRecommendations(query);
        return ResponseEntity.ok(response);
    }

    /**
     * Feature 6: Personalized Recommendations based on user history.
     * Maps to GET /api/v1/ai/recommendations/personalized
     */
    @GetMapping("/ai/recommendations/personalized")
    public ResponseEntity<AiRecommendationResponse> getPersonalizedRecommendations(
            @RequestParam(required = false) Long userId
    ) {
        log.info("REST API request: Get personalized recommendations for user ID: {}", userId);
        AiRecommendationResponse response = recommendationService.getPersonalizedRecommendations(userId);
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint for performing real-time pgvector similarity semantic search.
     * Maps to GET /api/v1/ai/vector-search
     */
    @GetMapping("/ai/vector-search")
    public ResponseEntity<List<VectorSearchResult>> performVectorSearch(
            @RequestParam String query,
            @RequestParam(required = false, defaultValue = "ALL") String category,
            @RequestParam(required = false, defaultValue = "5") int topK
    ) {
        log.info("REST API request: Semantic pgvector search for query '{}'", query);
        List<VectorSearchResult> results = vectorSearchService.searchVectorStore(query, category, topK);
        return ResponseEntity.ok(results);
    }

    /**
     * Endpoint to manually trigger pgvector indexing of all Turfs, Facilities, FAQs, and Reviews.
     * Maps to POST /api/v1/ai/vector-search/sync
     */
    @PostMapping("/ai/vector-search/sync")
    public ResponseEntity<String> triggerVectorSync() {
        log.info("REST API request: Manually triggering vector database synchronization...");
        vectorSearchService.synchronizeEmbeddings();
        return ResponseEntity.ok("Successfully synchronized pgvector semantic database embeddings.");
    }
}
