package com.turfbooking.sportsturfplatform.service;

import com.turfbooking.sportsturfplatform.dto.UserProfileUpdateDto;
import com.turfbooking.sportsturfplatform.dto.UserResponseDto;
import com.turfbooking.sportsturfplatform.exception.InvalidBookingException;
import com.turfbooking.sportsturfplatform.exception.ResourceNotFoundException;
import com.turfbooking.sportsturfplatform.model.User;
import com.turfbooking.sportsturfplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UserResponseDto getProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return convertToDto(user);
    }

    @Transactional
    public UserResponseDto updateProfile(String email, UserProfileUpdateDto dto) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        user.setFullName(dto.getFullName());

        // Optional password change
        if (dto.getNewPassword() != null && !dto.getNewPassword().trim().isEmpty()) {
            if (dto.getCurrentPassword() == null || dto.getCurrentPassword().trim().isEmpty()) {
                throw new InvalidBookingException("Current password is required to set a new password.");
            }
            if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
                throw new InvalidBookingException("Current password matches failed.");
            }
            user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        }

        User updatedUser = userRepository.save(user);
        return convertToDto(updatedUser);
    }

    private UserResponseDto convertToDto(User user) {
        return UserResponseDto.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }
}
