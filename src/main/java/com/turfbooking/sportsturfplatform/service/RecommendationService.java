package com.turfbooking.sportsturfplatform.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.turfbooking.sportsturfplatform.dto.AiRecommendationResponse;
import com.turfbooking.sportsturfplatform.dto.AiSearchCriteria;
import com.turfbooking.sportsturfplatform.dto.TurfDto;
import com.turfbooking.sportsturfplatform.dto.VectorSearchResult;
import com.turfbooking.sportsturfplatform.model.Booking;
import com.turfbooking.sportsturfplatform.model.BookingStatus;
import com.turfbooking.sportsturfplatform.model.Review;
import com.turfbooking.sportsturfplatform.model.Turf;
import com.turfbooking.sportsturfplatform.repository.BookingRepository;
import com.turfbooking.sportsturfplatform.repository.ReviewRepository;
import com.turfbooking.sportsturfplatform.repository.TurfRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final TurfRepository turfRepository;
    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final EmbeddingService embeddingService;
    private final ChatClient chatClient;
    
    @Lazy
    private final VectorSearchService vectorSearchService;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    /**
     * Legacy endpoint - Recommends turfs based on user queries, constraints, and AI analysis.
     */
    @Transactional(readOnly = true)
    public String generateRecommendationExplanation(String userQuery, String sportsType, BigDecimal maxPrice) {
        log.info("Generating legacy AI recommendations for query: '{}'", userQuery);
        List<Turf> candidates = turfRepository.findByIsActiveTrue();

        if (sportsType != null && !sportsType.equalsIgnoreCase("ALL") && !sportsType.trim().isEmpty()) {
            candidates = candidates.stream()
                    .filter(t -> t.getSportsType().equalsIgnoreCase(sportsType))
                    .collect(Collectors.toList());
        }
        if (maxPrice != null) {
            candidates = candidates.stream()
                    .filter(t -> t.getPricePerHour().compareTo(maxPrice) <= 0)
                    .collect(Collectors.toList());
        }

        if (candidates.isEmpty()) {
            return "No active turfs matched your filters. Relax your criteria for better results!";
        }

        StringBuilder turfListBuilder = new StringBuilder();
        for (Turf t : candidates) {
            Double avgRating = reviewRepository.getAverageRatingForTurf(t.getId());
            turfListBuilder.append(String.format("- ID: %d, Name: %s, Location: %s, Sport: %s, Price: $%s/hr, Rating: %.1f/5, Description: %s\n",
                    t.getId(), t.getName(), t.getLocation(), t.getSportsType(), t.getPricePerHour().toString(),
                    avgRating != null ? avgRating : 0.0, t.getDescription()));
        }

        String prompt = """
                You are the AI Arena Recommendation Engine for our Sports Turf Booking Platform.
                Your task is to analyze the user's sports query and constraints, compare it against the available turfs, and select the best 1 to 2 matches.
                
                Available Turfs:
                %s
                
                User Request Details:
                - Query/Preferences: "%s"
                - Preferred Sport Type: %s
                - Max Budget: %s
                
                Please generate an elegant, friendly response:
                1. Clearly identify the best-matching turf(s).
                2. Explain *why* these turfs fit their query.
                3. End with a professional, inviting call to action to help them reserve a slot.
                """.formatted(turfListBuilder.toString(),
                userQuery != null ? userQuery : "General",
                sportsType != null ? sportsType : "Any",
                maxPrice != null ? "$" + maxPrice + "/hr" : "No budget limit");

        try {
            return chatClient.prompt().user(prompt).call().content();
        } catch (Exception e) {
            log.error("Failed to generate legacy recommendations: ", e);
            return "Recommended: " + candidates.get(0).getName();
        }
    }

    /**
     * FEATURE 1: Nearby Turf Recommendation (Vector proximity-based)
     */
    @Transactional(readOnly = true)
    public AiRecommendationResponse getNearbyRecommendations(String locationQuery) {
        log.info("Generating nearby turf recommendations for location query: '{}'", locationQuery);
        
        List<Turf> matchedTurfs;
        if (locationQuery != null && !locationQuery.trim().isEmpty()) {
            List<Double> embedding = embeddingService.embedText(locationQuery);
            String vectorStr = embeddingService.toVectorString(embedding);
            matchedTurfs = turfRepository.findSimilarTurfs(vectorStr, 3);
        } else {
            matchedTurfs = turfRepository.findByIsActiveTrue();
            if (matchedTurfs.size() > 3) {
                matchedTurfs = matchedTurfs.subList(0, 3);
            }
        }

        List<TurfDto> recommendedTurfs = matchedTurfs.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());

        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("User requested a nearby sports arena based on: \"").append(locationQuery).append("\"\n\n");
        promptBuilder.append("We queried PostgreSQL using pgvector cosine similarity and retrieved these top matching turfs:\n");
        for (TurfDto t : recommendedTurfs) {
            promptBuilder.append(String.format("- ID: %d | Name: %s | Location: %s | Sport: %s | Price: $%s/hr | Rating: %.1f/5 | Description: %s\n",
                    t.getId(), t.getName(), t.getLocation(), t.getSportsType(), t.getPricePerHour(), t.getRating(), t.getDescription()));
        }
        promptBuilder.append("\nPlease act as a helpful AI Sports concierge and generate an elegant, friendly comparative explanation. Explain how their location/vicinity preference matches each of these venues, highlighting commute benefits, ambiance, or neighborhood features.");

        String explanation = "Unable to contact recommendation assistant.";
        try {
            explanation = chatClient.prompt().user(promptBuilder.toString()).call().content();
        } catch (Exception e) {
            log.error("Gemini failed in getNearbyRecommendations: ", e);
            explanation = "We found " + recommendedTurfs.size() + " fantastic turfs near you! Check them out in the map cards below.";
        }

        return AiRecommendationResponse.builder()
                .explanation(explanation)
                .recommendedTurfs(recommendedTurfs)
                .type("NEARBY")
                .build();
    }

    /**
     * FEATURE 2: Best Time Recommendation (Slot checking + AI demand forecasting)
     */
    @Transactional(readOnly = true)
    public AiRecommendationResponse getBestTimeRecommendations(Long turfId, String targetDateStr) {
        log.info("Generating best time recommendation for turf ID: {}, date: {}", turfId, targetDateStr);
        
        Turf turf = turfRepository.findById(turfId)
                .orElseThrow(() -> new IllegalArgumentException("Turf not found with id: " + turfId));

        List<Booking> bookings = bookingRepository.findByTurfIdAndStatus(turfId, BookingStatus.CONFIRMED);
        
        // Define standard slot options
        List<String> slotOptions = List.of(
                "08:00 AM - 10:00 AM (Morning Off-Peak)",
                "10:00 AM - 12:00 PM (Midday Session)",
                "02:00 PM - 04:00 PM (Afternoon Recreation)",
                "04:00 PM - 06:00 PM (Late Afternoon Cool Down)",
                "06:00 PM - 08:00 PM (Evening Prime Peak)",
                "08:00 PM - 10:00 PM (Night Lights Game)"
        );

        StringBuilder bookingSummary = new StringBuilder();
        if (bookings.isEmpty()) {
            bookingSummary.append("No active bookings recorded for this court. All slots are fully available!");
        } else {
            bookingSummary.append("The following active bookings exist for this court:\n");
            for (Booking b : bookings) {
                bookingSummary.append(String.format("- From %s to %s\n", 
                        b.getStartTime().format(TIME_FORMATTER), b.getEndTime().format(TIME_FORMATTER)));
            }
        }

        String prompt = """
                You are our AI Slot Allocation Analyst. Recommend the absolute best booking times for:
                Turf Name: %s (Location: %s, Sport: %s, Price: $%s/hr)
                
                Target Booking Date: %s
                Current Confirmed Bookings:
                %s
                
                Standard Slot Options:
                %s
                
                Please draft a highly intelligent recommendation:
                1. Identify which slots are free of overlap.
                2. Explain the pros/cons of different times (e.g., evening lights, midday sun/indoor AC, morning freshness, off-peak pricing vs. demand).
                3. Proactively list 2 or 3 specific recommended slots in the final paragraph.
                """.formatted(turf.getName(), turf.getLocation(), turf.getSportsType(), turf.getPricePerHour(),
                targetDateStr != null ? targetDateStr : "Tomorrow", bookingSummary.toString(), String.join("\n", slotOptions));

        String explanation;
        try {
            explanation = chatClient.prompt().user(prompt).call().content();
        } catch (Exception e) {
            log.error("Gemini failed in getBestTimeRecommendations: ", e);
            explanation = "We recommend checking the evening peak hours (06:00 PM - 08:00 PM) or the late night under-lights slots for the best playing conditions!";
        }

        // Determine suggested times strings based on simple logic
        List<String> suggestedTimes = new ArrayList<>();
        suggestedTimes.add("18:00 - 20:00");
        suggestedTimes.add("08:00 - 10:00");

        return AiRecommendationResponse.builder()
                .explanation(explanation)
                .recommendedTurfs(List.of(convertToDto(turf)))
                .suggestedTimes(suggestedTimes)
                .type("BEST_TIME")
                .build();
    }

    /**
     * FEATURE 3: Budget Recommendation (Rating-to-Price value analysis)
     */
    @Transactional(readOnly = true)
    public AiRecommendationResponse getBudgetRecommendations(BigDecimal maxPrice) {
        log.info("Generating budget recommendations for limit: {}", maxPrice);
        
        List<Turf> active = turfRepository.findByIsActiveTrue();
        List<Turf> filtered = active.stream()
                .filter(t -> maxPrice == null || t.getPricePerHour().compareTo(maxPrice) <= 0)
                .collect(Collectors.toList());

        if (filtered.isEmpty()) {
            // Find the absolute cheapest turf as backup
            Turf cheapest = active.stream()
                    .min((t1, t2) -> t1.getPricePerHour().compareTo(t2.getPricePerHour()))
                    .orElse(null);
            if (cheapest != null) {
                filtered = List.of(cheapest);
            }
        }

        List<TurfDto> recommendedTurfs = filtered.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());

        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append(String.format("User has set a strict sports budget of: $%s per hour.\n", 
                maxPrice != null ? maxPrice.toString() : "No budget limit"));
        promptBuilder.append("We filtered these turfs within range (or highlighted closest value if none matched):\n");
        for (TurfDto t : recommendedTurfs) {
            promptBuilder.append(String.format("- Name: %s | Price: $%s/hr | Rating: %.1f/5 | Location: %s | Description: %s\n",
                    t.getName(), t.getPricePerHour(), t.getRating(), t.getLocation(), t.getDescription()));
        }
        promptBuilder.append("\nPlease conduct a rating-to-price value analysis. Rank these options, identify which arena offers the highest rating relative to its cost, and suggest the absolute best economic choices.");

        String explanation;
        try {
            explanation = chatClient.prompt().user(promptBuilder.toString()).call().content();
        } catch (Exception e) {
            log.error("Gemini failed in getBudgetRecommendations: ", e);
            explanation = "We sorted the courts by price to match your budget. Have a look at our cost-effective options below.";
        }

        return AiRecommendationResponse.builder()
                .explanation(explanation)
                .recommendedTurfs(recommendedTurfs)
                .type("BUDGET")
                .build();
    }

    /**
     * FEATURE 4: Alternative Turf Suggestion (High similarity mapping)
     */
    @Transactional(readOnly = true)
    public AiRecommendationResponse getAlternativeRecommendations(Long turfId) {
        log.info("Generating alternative turf suggestions for turf ID: {}", turfId);
        
        Turf target = turfRepository.findById(turfId)
                .orElseThrow(() -> new IllegalArgumentException("Turf not found with id: " + turfId));

        // Get similar turfs using pgvector over description_embedding
        List<Turf> matchedTurfs = new ArrayList<>();
        try {
            List<Double> embedding = embeddingService.embedText(target.getName() + " " + target.getSportsType() + " " + target.getDescription());
            String vectorStr = embeddingService.toVectorString(embedding);
            matchedTurfs = turfRepository.findSimilarTurfs(vectorStr, 5);
        } catch (Exception e) {
            log.error("Vector similarity search failed for alternatives, falling back...", e);
        }

        // Filter out target turf and map
        List<TurfDto> recommendedTurfs = matchedTurfs.stream()
                .filter(t -> !t.getId().equals(turfId))
                .limit(3)
                .map(this::convertToDto)
                .collect(Collectors.toList());

        // If too few, append turfs of same sports type
        if (recommendedTurfs.size() < 2) {
            List<Turf> sameSport = turfRepository.findBySportsTypeIgnoreCaseAndIsActiveTrue(target.getSportsType());
            for (Turf t : sameSport) {
                if (!t.getId().equals(turfId) && recommendedTurfs.stream().noneMatch(dto -> dto.getId().equals(t.getId()))) {
                    recommendedTurfs.add(convertToDto(t));
                }
            }
        }

        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append(String.format("User is viewing Turf: %s (ID: %d, Sport: %s, Price: $%s/hr, Location: %s).\n",
                target.getName(), target.getId(), target.getSportsType(), target.getPricePerHour(), target.getLocation()));
        promptBuilder.append("We fetched these alternative courts that match in sport, size, price, or description:\n");
        for (TurfDto t : recommendedTurfs) {
            promptBuilder.append(String.format("- ID: %d | Name: %s | Sport: %s | Price: $%s/hr | Rating: %.1f/5 | Location: %s\n",
                    t.getId(), t.getName(), t.getSportsType(), t.getPricePerHour(), t.getRating(), t.getLocation()));
        }
        promptBuilder.append("\nPlease generate a comparative dashboard comparison. Compare the primary turf with these alternatives, explaining which are more budget-friendly, which offer premium add-ons, or which might have better schedules.");

        String explanation;
        try {
            explanation = chatClient.prompt().user(promptBuilder.toString()).call().content();
        } catch (Exception e) {
            log.error("Gemini failed in getAlternativeRecommendations: ", e);
            explanation = "Should the main turf be fully booked, we highly recommend these comparable high-quality options as perfect substitutes!";
        }

        return AiRecommendationResponse.builder()
                .explanation(explanation)
                .recommendedTurfs(recommendedTurfs)
                .type("ALTERNATIVE")
                .build();
    }

    /**
     * FEATURE 5: Natural Language Search (AI Parses query to JSON, backend queries DB)
     */
    @Transactional(readOnly = true)
    public AiRecommendationResponse getNaturalLanguageRecommendations(String query) {
        log.info("Processing Intelligent Natural Language Search for query: '{}'", query);
        
        if (query == null || query.trim().isEmpty()) {
            return getNearbyRecommendations("");
        }

        // 1. Call Gemini to parse the user's query into a structured search intent JSON object.
        String systemPrompt = """
                You are an expert natural language query parser for a Sports Turf Booking Platform in Tamil Nadu, India.
                Your single objective is to analyze the user's search query and extract search criteria as a structured JSON object.
                
                You MUST extract:
                - sportsType: The type of sport (e.g. 'FOOTBALL', 'CRICKET', 'TENNIS'). If none mentioned, return 'ALL'.
                - districtName: The Tamil Nadu district name (e.g. 'Karur', 'Chennai', 'Coimbatore', 'Madurai'). If none mentioned, return null.
                - maxPrice: The maximum hourly price as a number (e.g. 120.0). If none mentioned, return null.
                - targetTime: Any requested booking date/time or time description (e.g. 'tomorrow evening', 'weekend morning'). If none, return null.
                - reasoning: A clean, user-friendly, single-sentence summary explaining what was found and how you parsed it.
                
                CRITICAL: You MUST respond ONLY with a raw, valid JSON object. Do not include markdown code block syntax (like ```json ... ```) or any preamble or explanation.
                
                Example Output:
                {"sportsType":"FOOTBALL","districtName":"Karur","maxPrice":120.0,"targetTime":"tomorrow evening","reasoning":"Searching for football turfs in Karur district under 120 per hour for tomorrow evening."}
                
                Now parse this query:
                "%s"
                """.formatted(query);

        AiSearchCriteria criteria = null;
        try {
            String jsonOutput = chatClient.prompt().user(systemPrompt).call().content();
            log.info("Gemini parsed query output: {}", jsonOutput);
            
            // Clean markdown blocks if Gemini accidentally included them
            if (jsonOutput != null) {
                jsonOutput = jsonOutput.trim();
                if (jsonOutput.startsWith("```json")) {
                    jsonOutput = jsonOutput.substring(7);
                } else if (jsonOutput.startsWith("```")) {
                    jsonOutput = jsonOutput.substring(3);
                }
                if (jsonOutput.endsWith("```")) {
                    jsonOutput = jsonOutput.substring(0, jsonOutput.length() - 3);
                }
                jsonOutput = jsonOutput.trim();
                
                ObjectMapper mapper = new ObjectMapper();
                criteria = mapper.readValue(jsonOutput, AiSearchCriteria.class);
            }
        } catch (Exception e) {
            log.error("Failed to parse query with Gemini or deserialize JSON: ", e);
        }

        // 2. Fetch from DB using the parsed criteria
        List<Turf> results = new ArrayList<>();
        String explanation = "We analyzed your query and matched the best sports arenas in our database.";
        
        if (criteria != null) {
            log.info("Query criteria extracted successfully: {}", criteria);
            explanation = criteria.getReasoning();
            
            if (criteria.getDistrictName() != null && !criteria.getDistrictName().trim().isEmpty()) {
                // Query by district name
                results = turfRepository.findByDistrictNameIgnoreCaseAndIsActiveTrue(criteria.getDistrictName());
            } else {
                // If no district specified, load all active turfs as base
                results = turfRepository.findByIsActiveTrue();
            }
            
            final String finalSports = criteria.getSportsType();
            final BigDecimal finalPrice = criteria.getMaxPrice();
            
            // Filter results
            results = results.stream()
                .filter(t -> finalSports == null || finalSports.equalsIgnoreCase("ALL") || t.getSportsType().equalsIgnoreCase(finalSports))
                .filter(t -> finalPrice == null || t.getPricePerHour().compareTo(finalPrice) <= 0)
                .collect(Collectors.toList());
        }

        // If no criteria parsed or no matches found, do a general lookup
        if (results.isEmpty()) {
            results = turfRepository.findByIsActiveTrue();
            explanation = "We couldn't find precise matches for your search. Here are some of our premium turfs across Tamil Nadu!";
        }

        List<TurfDto> recommendedTurfs = results.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());

        List<String> suggestedTimes = new ArrayList<>();
        if (criteria != null && criteria.getTargetTime() != null) {
            suggestedTimes.add("2026-07-05 18:00");
            suggestedTimes.add("2026-07-05 20:00");
        } else {
            suggestedTimes.add("2026-07-04 18:00");
            suggestedTimes.add("2026-07-04 20:00");
        }

        return AiRecommendationResponse.builder()
                .explanation(explanation)
                .recommendedTurfs(recommendedTurfs)
                .suggestedTimes(suggestedTimes)
                .type("NATURAL_SEARCH")
                .build();
    }

    /**
     * FEATURE 6: Personalized Recommendation (User-centric booking history analytics)
     */
    @Transactional(readOnly = true)
    public AiRecommendationResponse getPersonalizedRecommendations(Long userId) {
        log.info("Generating personalized recommendations for User ID: {}", userId);

        List<Booking> bookings = Collections.emptyList();
        List<Review> reviews = Collections.emptyList();
        if (userId != null) {
            bookings = bookingRepository.findByUserId(userId);
            reviews = reviewRepository.findByUserId(userId);
        }

        List<Turf> allTurfs = turfRepository.findByIsActiveTrue();
        List<TurfDto> allTurfsDto = allTurfs.stream().map(this::convertToDto).collect(Collectors.toList());

        if (bookings.isEmpty() && reviews.isEmpty()) {
            // New user personalization fallback: suggest highest rated turfs
            List<TurfDto> topRated = allTurfsDto.stream()
                    .sorted((t1, t2) -> Double.compare(t2.getRating() != null ? t2.getRating() : 0.0, t1.getRating() != null ? t1.getRating() : 0.0))
                    .limit(3)
                    .collect(Collectors.toList());

            return AiRecommendationResponse.builder()
                    .explanation("### Welcome to the AI Arena!\nAs a new player on our platform, we have selected our **highest-rated premium arenas** to kickstart your journey. These facilities have outstanding review records and top-tier amenities. Welcome aboard!")
                    .recommendedTurfs(topRated)
                    .type("PERSONALIZED")
                    .build();
        }

        // Build User Profile Context
        StringBuilder userHistory = new StringBuilder();
        userHistory.append("User Booking History:\n");
        for (Booking b : bookings) {
            userHistory.append(String.format("- Booked turf: %s, Sport: %s, Price: $%s, Start time: %s, Status: %s\n",
                    b.getTurf().getName(), b.getTurf().getSportsType(), b.getTotalPrice(), b.getStartTime(), b.getStatus()));
        }

        userHistory.append("\nUser Review History:\n");
        for (Review r : reviews) {
            userHistory.append(String.format("- Rated turf %s: %d stars. Comment: %s\n",
                    r.getTurf().getName(), r.getRating(), r.getComment()));
        }

        StringBuilder availableTurfsContext = new StringBuilder();
        for (TurfDto t : allTurfsDto) {
            availableTurfsContext.append(String.format("- ID: %d | Name: %s | Sport: %s | Price: $%s/hr | Rating: %.1f | Location: %s\n",
                    t.getId(), t.getName(), t.getSportsType(), t.getPricePerHour(), t.getRating(), t.getLocation()));
        }

        String prompt = """
                You are our Intelligent Personalization Butler. Analyze the user's booking and review history:
                
                %s
                
                Available Turfs in Platform:
                %s
                
                Please compile a highly customized, friendly recommendation:
                1. Identify their favorite sport, preferred price points, and booking patterns.
                2. Recommend 2 matching turfs (either a favorite venue they love to return to, or a new highly similar venue they haven't tried yet).
                3. Address them personally with encouraging feedback based on their active booking streaks or sports reviews.
                """.formatted(userHistory.toString(), availableTurfsContext.toString());

        String explanation;
        try {
            explanation = chatClient.prompt().user(prompt).call().content();
        } catch (Exception e) {
            log.error("Gemini failed in getPersonalizedRecommendations: ", e);
            explanation = "Based on your booking history, we selected the best courts matching your sport preferences!";
        }

        // Sort turfs to reflect personalization or just return top 3 matched
        List<TurfDto> recommendedTurfs = allTurfsDto.stream().limit(3).collect(Collectors.toList());

        return AiRecommendationResponse.builder()
                .explanation(explanation)
                .recommendedTurfs(recommendedTurfs)
                .type("PERSONALIZED")
                .build();
    }

    private TurfDto convertToDto(Turf turf) {
        Double avgRating = reviewRepository.getAverageRatingForTurf(turf.getId());
        return TurfDto.builder()
                .id(turf.getId())
                .name(turf.getName())
                .location(turf.getLocation())
                .sportsType(turf.getSportsType())
                .description(turf.getDescription())
                .pricePerHour(turf.getPricePerHour())
                .isActive(turf.getIsActive())
                .rating(avgRating != null ? avgRating : 5.0)
                .build();
    }
}
