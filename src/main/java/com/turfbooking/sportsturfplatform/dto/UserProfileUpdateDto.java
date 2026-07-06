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
public class UserProfileUpdateDto {
    @NotBlank(message = "Full name cannot be blank")
    private String fullName;
    private String currentPassword;
    private String newPassword;
}
