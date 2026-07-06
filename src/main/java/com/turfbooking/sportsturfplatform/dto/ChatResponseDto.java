package com.turfbooking.sportsturfplatform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponseDto {
    private String id;
    private String sender;
    private String message;
    private String timestamp;
    private Long actionTurfId;
    private String actionTurfName;
}
