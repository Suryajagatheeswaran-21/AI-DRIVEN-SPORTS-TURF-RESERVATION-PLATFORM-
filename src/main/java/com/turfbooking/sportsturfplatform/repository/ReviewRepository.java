package com.turfbooking.sportsturfplatform.repository;

import com.turfbooking.sportsturfplatform.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByTurfId(Long turfId);
    
    List<Review> findByUserId(Long userId);
    
    @Query("SELECT COALESCE(AVG(r.rating), 5.0) FROM Review r WHERE r.turf.id = :turfId")
    Double getAverageRatingForTurf(@Param("turfId") Long turfId);
}
