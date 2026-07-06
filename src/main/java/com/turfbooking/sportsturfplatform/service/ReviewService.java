package com.turfbooking.sportsturfplatform.service;

import com.turfbooking.sportsturfplatform.dto.ReviewRequestDto;
import com.turfbooking.sportsturfplatform.dto.ReviewResponseDto;
import com.turfbooking.sportsturfplatform.exception.ResourceNotFoundException;
import com.turfbooking.sportsturfplatform.model.Review;
import com.turfbooking.sportsturfplatform.model.Turf;
import com.turfbooking.sportsturfplatform.model.User;
import com.turfbooking.sportsturfplatform.repository.ReviewRepository;
import com.turfbooking.sportsturfplatform.repository.TurfRepository;
import com.turfbooking.sportsturfplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final TurfRepository turfRepository;
    private final UserRepository userRepository;

    @Transactional
    public ReviewResponseDto addReview(ReviewRequestDto request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        Turf turf = turfRepository.findById(request.getTurfId())
                .orElseThrow(() -> new ResourceNotFoundException("Turf not found with id: " + request.getTurfId()));

        Review review = Review.builder()
                .turf(turf)
                .user(user)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        Review savedReview = reviewRepository.save(review);
        return convertToDto(savedReview);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponseDto> getReviewsForTurf(Long turfId) {
        if (!turfRepository.existsById(turfId)) {
            throw new ResourceNotFoundException("Turf not found with id: " + turfId);
        }
        return reviewRepository.findByTurfId(turfId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private ReviewResponseDto convertToDto(Review review) {
        return ReviewResponseDto.builder()
                .id(review.getId())
                .turfId(review.getTurf().getId())
                .turfName(review.getTurf().getName())
                .userId(review.getUser().getId())
                .userFullName(review.getUser().getFullName())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
