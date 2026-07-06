package com.turfbooking.sportsturfplatform.controller;

import com.turfbooking.sportsturfplatform.dto.ReviewRequestDto;
import com.turfbooking.sportsturfplatform.dto.ReviewResponseDto;
import com.turfbooking.sportsturfplatform.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reviews")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<ReviewResponseDto> addReview(
            @Valid @RequestBody ReviewRequestDto request,
            Principal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewService.addReview(request, principal.getName()));
    }

    @GetMapping("/turf/{turfId}")
    public ResponseEntity<List<ReviewResponseDto>> getReviewsForTurf(@PathVariable Long turfId) {
        return ResponseEntity.ok(reviewService.getReviewsForTurf(turfId));
    }
}
