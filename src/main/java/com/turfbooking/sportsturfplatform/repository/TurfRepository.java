package com.turfbooking.sportsturfplatform.repository;

import com.turfbooking.sportsturfplatform.model.Turf;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface TurfRepository extends JpaRepository<Turf, Long> {
    List<Turf> findByIsActiveTrue();
    
    List<Turf> findBySportsTypeIgnoreCaseAndIsActiveTrue(String sportsType);
    
    List<Turf> findByPricePerHourLessThanEqualAndIsActiveTrue(BigDecimal maxPrice);
    
    List<Turf> findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String name, String description);

    List<Turf> findByDistrictIdAndIsActiveTrue(Long districtId);

    List<Turf> findByDistrictNameIgnoreCaseAndIsActiveTrue(String districtName);

    @org.springframework.data.jpa.repository.Query("SELECT t FROM Turf t WHERE t.isActive = true ORDER BY (POWER(t.latitude - :lat, 2) + POWER(t.longitude - :lng, 2)) ASC")
    List<Turf> findNearbyTurfs(double lat, double lng);

    // Dynamic pgvector cosine similarity search using native SQL
    @Query(value = "SELECT * FROM turfs WHERE is_active = true ORDER BY description_embedding <=> CAST(?1 AS vector) LIMIT ?2", nativeQuery = true)
    List<Turf> findSimilarTurfs(String embeddingString, int limit);
}
