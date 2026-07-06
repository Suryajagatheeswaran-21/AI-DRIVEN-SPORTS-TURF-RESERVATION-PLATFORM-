package com.turfbooking.sportsturfplatform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequestDto {
    @NotBlank(message = "Sender cannot be blank")
    private String sender;

    @NotBlank(message = "Content cannot be blank")
    private String content;
}
