package com.turfbooking.sportsturfplatform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VectorSearchResult {
    private Long id;
    private Long documentId;
    private String title;
    private String content;
    private String category;
    private Double similarity;
}
