package com.turfbooking.sportsturfplatform.controller;

import com.turfbooking.sportsturfplatform.dto.BookingRequestDto;
import com.turfbooking.sportsturfplatform.dto.BookingResponseDto;
import com.turfbooking.sportsturfplatform.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping({"/api/v1/bookings", "/api/bookings"})
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    public ResponseEntity<BookingResponseDto> bookTurf(
            @Valid @RequestBody BookingRequestDto request,
            Principal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bookingService.bookTurf(request, principal.getName()));
    }

    @GetMapping("/history")
    public ResponseEntity<List<BookingResponseDto>> getBookingHistory(Principal principal) {
        return ResponseEntity.ok(bookingService.getBookingHistory(principal.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingResponseDto> getBookingById(
            @PathVariable Long id,
            Principal principal
    ) {
        return ResponseEntity.ok(bookingService.getBookingById(id, principal.getName()));
    }

    @DeleteMapping("/cancel/{id}")
    public ResponseEntity<BookingResponseDto> cancelBooking(
            @PathVariable Long id,
            Principal principal
    ) {
        return ResponseEntity.ok(bookingService.cancelBooking(id, principal.getName()));
    }
}
