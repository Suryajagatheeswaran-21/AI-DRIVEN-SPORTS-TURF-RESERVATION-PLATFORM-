package com.turfbooking.sportsturfplatform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRecommendationResponse {
    private String explanation;
    private List<TurfDto> recommendedTurfs;
    private List<String> suggestedTimes;
    private String type;
}
