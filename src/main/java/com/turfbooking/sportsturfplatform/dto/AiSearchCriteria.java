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
public class AiSearchCriteria {
    private String sportsType;
    private String districtName;
    private BigDecimal maxPrice;
    private String targetTime;
    private String reasoning;
}
