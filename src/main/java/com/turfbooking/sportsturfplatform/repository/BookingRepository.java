package com.turfbooking.sportsturfplatform.repository;

import com.turfbooking.sportsturfplatform.model.Booking;
import com.turfbooking.sportsturfplatform.model.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUserId(Long userId);
    
    List<Booking> findByTurfId(Long turfId);
    
    List<Booking> findByTurfIdAndStatus(Long turfId, BookingStatus status);

    // Dynamic interval overlap check to prevent overlapping bookings
    @Query("SELECT COUNT(b) > 0 FROM Booking b " +
           "WHERE b.turf.id = :turfId " +
           "AND b.status = 'CONFIRMED' " +
           "AND b.startTime < :endTime " +
           "AND b.endTime > :startTime")
    boolean existsOverlappingBooking(
            @Param("turfId") Long turfId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime
    );
}
