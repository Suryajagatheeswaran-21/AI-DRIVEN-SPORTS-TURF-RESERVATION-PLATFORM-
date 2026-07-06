package com.turfbooking.sportsturfplatform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponseDto {
    private Long id;
    private Long turfId;
    private String turfName;
    private String turfLocation;
    private Long userId;
    private String userEmail;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private BigDecimal totalPrice;
    private String status;
    private String paymentStatus;
    private String transactionId;
    private LocalDateTime createdAt;
}
