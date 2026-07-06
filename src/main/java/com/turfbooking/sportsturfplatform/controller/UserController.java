package com.turfbooking.sportsturfplatform.controller;

import com.turfbooking.sportsturfplatform.dto.UserProfileUpdateDto;
import com.turfbooking.sportsturfplatform.dto.UserResponseDto;
import com.turfbooking.sportsturfplatform.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<UserResponseDto> getProfile(Principal principal) {
        return ResponseEntity.ok(userService.getProfile(principal.getName()));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserResponseDto> updateProfile(
            @Valid @RequestBody UserProfileUpdateDto request,
            Principal principal
    ) {
        return ResponseEntity.ok(userService.updateProfile(principal.getName(), request));
    }
}
