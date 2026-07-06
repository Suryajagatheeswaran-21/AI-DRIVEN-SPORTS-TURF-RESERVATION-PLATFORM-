package com.turfbooking.sportsturfplatform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TurfDto {
    private Long id;
    private Long districtId;
    private String districtName;
    private String name;
    private String location;
    private String address;
    private Double latitude;
    private Double longitude;
    private String sportsType;
    private String description;
    private BigDecimal pricePerHour;
    private String availability;
    private Boolean isActive;
    private Double rating;
}
