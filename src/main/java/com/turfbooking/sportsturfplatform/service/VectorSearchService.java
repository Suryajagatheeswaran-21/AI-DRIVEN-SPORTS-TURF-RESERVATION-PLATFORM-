package com.turfbooking.sportsturfplatform.service;

import com.turfbooking.sportsturfplatform.dto.VectorSearchResult;
import com.turfbooking.sportsturfplatform.model.Document;
import com.turfbooking.sportsturfplatform.model.Review;
import com.turfbooking.sportsturfplatform.model.Turf;
import com.turfbooking.sportsturfplatform.repository.DocumentRepository;
import com.turfbooking.sportsturfplatform.repository.ReviewRepository;
import com.turfbooking.sportsturfplatform.repository.TurfRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class VectorSearchService {

    private final JdbcTemplate jdbcTemplate;
    private final EmbeddingService embeddingService;
    private final DocumentRepository documentRepository;
    private final TurfRepository turfRepository;
    private final ReviewRepository reviewRepository;

    /**
     * Runs automatically on startup when the application context is ready.
     * Guarantees that Turf descriptions, Facilities, FAQs, Policies, and Reviews are
     * seeded as Documents and have high-performance embeddings generated inside pgvector.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void synchronizeEmbeddings() {
        log.info("Starting automatic pgvector semantic database indexing...");
        try {
            // 1. Synchronize FAQs and Booking Policies
            seedDefaultFaqsAndPolicies();

            // 2. Synchronize Turf Descriptions & Facilities
            seedTurfsAndFacilitiesAsDocuments();

            // 3. Synchronize Reviews
            seedReviewsAsDocuments();

            // 4. Generate embeddings for any document lacking one
            generateMissingDocumentEmbeddings();

            // 5. Generate description embeddings for Turfs directly
            generateMissingTurfEmbeddings();

            log.info("Successfully completed pgvector semantic database indexing.");
        } catch (Exception e) {
            log.error("Failed to complete automatic vector database synchronization: ", e);
        }
    }

    /**
     * Seeds initial FAQ and Policy documents into the `documents` table if not already present.
     */
    private void seedDefaultFaqsAndPolicies() {
        if (documentRepository.count() == 0) {
            log.info("Seeding default platform rules, FAQs, and booking policies...");
            
            List<Document> defaults = List.of(
                Document.builder()
                        .title("Cancellation & Refund Policy")
                        .content("Players can cancel their reserved turf slot up to 24 hours prior to the start time to receive a full 100% refund. Cancellations made less than 24 hours in advance are non-refundable to respect slot bookings and facility availability.")
                        .category("POLICY")
                        .build(),
                Document.builder()
                        .title("Appropriate Footwear Regulations")
                        .content("All players must wear non-marking sports shoes or sneakers on indoor hardwood courts and general artificial turfs. Plastic or metal studs/cleats are strictly prohibited except on the full-sized outdoor natural turf field.")
                        .category("FAQ")
                        .build(),
                Document.builder()
                        .title("Equipment Rental Guidelines")
                        .content("Our facilities offer premium sports equipment rentals at the front desk. Footballs are rented for $5 per session, tennis rackets with 3 balls for $8, and cricket bowling machine hires are available for $20 per hour.")
                        .category("FAQ")
                        .build(),
                Document.builder()
                        .title("Pending Booking Lock Policy")
                        .content("When you initiate a booking, the AI scheduler locks the specific turf slot for a maximum of 10 minutes. If the payment flow is not finalized within 10 minutes, the lock is automatically released and made available to other teams.")
                        .category("POLICY")
                        .build(),
                Document.builder()
                        .title("Inclement Weather Guidelines")
                        .content("For outdoor turfs like the Emerald Cricket Grounds, matches interrupted or cancelled due to hazardous weather conditions (such as severe lightning or heavy downpours) are eligible for a free rescheduling slot or an automatic full refund.")
                        .category("POLICY")
                        .build()
            );
            documentRepository.saveAll(defaults);
        }
    }

    /**
     * Syncs all existing active Turfs as Documents under 'TURF' and 'FACILITY' categories
     * so they are indexed in the unified pgvector document search table.
     */
    private void seedTurfsAndFacilitiesAsDocuments() {
        List<Turf> turfs = turfRepository.findByIsActiveTrue();
        for (Turf turf : turfs) {
            // Check if document already exists
            String turfTitle = "Facility Description: " + turf.getName();
            boolean exists = documentRepository.findAll().stream()
                    .anyMatch(d -> d.getTitle().equalsIgnoreCase(turfTitle));
            
            if (!exists) {
                log.info("Indexing Turf facility '{}' as a document...", turf.getName());
                Document doc = Document.builder()
                        .title(turfTitle)
                        .content(String.format("Turf: %s. Location: %s. Sports type: %s. Price: $%s per hour. Facilities: %s",
                                turf.getName(), turf.getLocation(), turf.getSportsType(), turf.getPricePerHour(), turf.getDescription()))
                        .category("FACILITY")
                        .build();
                documentRepository.save(doc);
            }
        }
    }

    /**
     * Syncs all player reviews into the documents table so they can be searched semantically.
     */
    private void seedReviewsAsDocuments() {
        List<Review> reviews = reviewRepository.findAll();
        for (Review review : reviews) {
            String reviewTitle = String.format("Review %d for Turf %s", review.getId(), review.getTurf().getName());
            boolean exists = documentRepository.findAll().stream()
                    .anyMatch(d -> d.getTitle().equalsIgnoreCase(reviewTitle));

            if (!exists) {
                log.info("Indexing Review #{} as a document...", review.getId());
                Document doc = Document.builder()
                        .title(reviewTitle)
                        .content(String.format("Player Review: Rating of %d stars for turf '%s'. Comment: %s",
                                review.getRating(), review.getTurf().getName(), review.getComment()))
                        .category("REVIEW")
                        .build();
                documentRepository.save(doc);
            }
        }
    }

    /**
     * Loops through all documents and ensures they have embeddings inside `document_embeddings`.
     */
    private void generateMissingDocumentEmbeddings() {
        List<Document> docs = documentRepository.findAll();
        for (Document doc : docs) {
            // Check if an embedding already exists
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM document_embeddings WHERE document_id = ?",
                    Integer.class,
                    doc.getId()
            );

            if (count == null || count == 0) {
                log.info("Generating embedding vector for Document #{} ({})", doc.getId(), doc.getTitle());
                List<Double> embedding = embeddingService.embedText(doc.getContent());
                String vectorStr = embeddingService.toVectorString(embedding);

                jdbcTemplate.update(
                        "INSERT INTO document_embeddings (document_id, chunk_content, embedding) VALUES (?, ?, CAST(? AS vector))",
                        doc.getId(),
                        doc.getContent(),
                        vectorStr
                );
            }
        }
    }

    /**
     * Synchronizes any Turf with a null description_embedding column directly.
     */
    private void generateMissingTurfEmbeddings() {
        List<Turf> turfs = turfRepository.findAll();
        for (Turf t : turfs) {
            // Query description_embedding column
            Map<String, Object> map = jdbcTemplate.queryForMap("SELECT description_embedding FROM turfs WHERE id = ?", t.getId());
            Object embeddingObj = map.get("description_embedding");

            if (embeddingObj == null) {
                log.info("Generating direct pgvector embedding for Turf '{}'", t.getName());
                List<Double> embedding = embeddingService.embedText(t.getName() + " " + t.getSportsType() + " " + t.getDescription());
                String vectorStr = embeddingService.toVectorString(embedding);

                jdbcTemplate.update(
                        "UPDATE turfs SET description_embedding = CAST(? AS vector), updated_at = NOW() WHERE id = ?",
                        vectorStr,
                        t.getId()
                );
            }
        }
    }

    /**
     * Performs a unified Cosine Similarity search over document_embeddings.
     * Supports category filtering (FAQ, POLICY, FACILITY, REVIEW) and Top-K retrieval.
     */
    @Transactional(readOnly = true)
    public List<VectorSearchResult> searchVectorStore(String queryText, String categoryFilter, int topK) {
        log.info("Performing pgvector semantic search for query: '{}', category: '{}', topK: {}", queryText, categoryFilter, topK);
        
        List<Double> queryEmbedding = embeddingService.embedText(queryText);
        String embeddingStr = embeddingService.toVectorString(queryEmbedding);

        String sql;
        Object[] params;

        // Construct dynamic filter for category
        if (categoryFilter != null && !categoryFilter.equalsIgnoreCase("ALL") && !categoryFilter.trim().isEmpty()) {
            sql = """
                SELECT de.id, d.id as document_id, d.title, de.chunk_content, d.category,
                       (1 - (de.embedding <=> CAST(? AS vector))) AS similarity
                FROM document_embeddings de
                JOIN documents d ON de.document_id = d.id
                WHERE d.category = ?
                ORDER BY de.embedding <=> CAST(? AS vector)
                LIMIT ?
                """;
            params = new Object[]{embeddingStr, categoryFilter, embeddingStr, topK};
        } else {
            sql = """
                SELECT de.id, d.id as document_id, d.title, de.chunk_content, d.category,
                       (1 - (de.embedding <=> CAST(? AS vector))) AS similarity
                FROM document_embeddings de
                JOIN documents d ON de.document_id = d.id
                ORDER BY de.embedding <=> CAST(? AS vector)
                LIMIT ?
                """;
            params = new Object[]{embeddingStr, embeddingStr, topK};
        }

        List<VectorSearchResult> results = new ArrayList<>();
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params);
            for (Map<String, Object> row : rows) {
                Number similarityVal = (Number) row.get("similarity");
                results.add(VectorSearchResult.builder()
                        .id(((Number) row.get("id")).longValue())
                        .documentId(((Number) row.get("document_id")).longValue())
                        .title((String) row.get("title"))
                        .content((String) row.get("chunk_content"))
                        .category((String) row.get("category"))
                        .similarity(similarityVal != null ? similarityVal.doubleValue() : 0.0)
                        .build());
            }
        } catch (Exception e) {
            log.error("Failed to query vector database: ", e);
        }
        return results;
    }

    /**
     * Builds an elegant prompt context block with semantic matches to inject into Gemini prompts.
     */
    public String buildSemanticContext(String queryText, String categoryFilter, int topK) {
        List<VectorSearchResult> matches = searchVectorStore(queryText, categoryFilter, topK);
        if (matches.isEmpty()) {
            return "No matching guidelines found in local RAG database.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("--- SEMANTIC MATCHES FROM SYSTEM RAG (pgvector Cosine Similarity) ---\n");
        for (VectorSearchResult match : matches) {
            sb.append(String.format("- Match Score: %.2f%% | Category: %s | Title: %s\n  Content: %s\n\n",
                    match.getSimilarity() * 100, match.getCategory(), match.getTitle(), match.getContent()));
        }
        return sb.toString();
    }
}
