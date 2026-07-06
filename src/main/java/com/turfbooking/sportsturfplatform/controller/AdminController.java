package com.turfbooking.sportsturfplatform.controller;

import com.turfbooking.sportsturfplatform.dto.BookingRequestDto;
import com.turfbooking.sportsturfplatform.dto.BookingResponseDto;
import com.turfbooking.sportsturfplatform.dto.TurfDto;
import com.turfbooking.sportsturfplatform.dto.UserResponseDto;
import com.turfbooking.sportsturfplatform.model.*;
import com.turfbooking.sportsturfplatform.repository.*;
import com.turfbooking.sportsturfplatform.service.BookingService;
import com.turfbooking.sportsturfplatform.service.TurfService;
import com.turfbooking.sportsturfplatform.service.UserService;
import com.turfbooking.sportsturfplatform.exception.ResourceNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AdminController {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final TurfRepository turfRepository;
    private final ReviewRepository reviewRepository;
    private final PasswordEncoder passwordEncoder;
    private final BookingService bookingService;
    private final TurfService turfService;
    private final UserService userService;

    // --- DASHBOARD STATS ---
    @GetMapping("/dashboard/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        // Total Counts
        long totalUsers = userRepository.count();
        long totalTurfs = turfRepository.count();
        long totalBookings = bookingRepository.count();

        // Calculate Gross Revenue
        List<Payment> allPayments = paymentRepository.findAll();
        BigDecimal grossRevenue = allPayments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.COMPLETED)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        stats.put("totalUsers", totalUsers);
        stats.put("totalTurfs", totalTurfs);
        stats.put("totalBookings", totalBookings);
        stats.put("grossRevenue", grossRevenue);

        // Gateway splits count
        Map<String, Long> gatewaySplits = allPayments.stream()
                .collect(Collectors.groupingBy(p -> p.getPaymentMethod(), Collectors.counting()));
        stats.put("gatewaySplits", gatewaySplits);

        // Booking status splits count
        List<Booking> allBookings = bookingRepository.findAll();
        Map<String, Long> bookingSplits = allBookings.stream()
                .collect(Collectors.groupingBy(b -> b.getStatus().name(), Collectors.counting()));
        stats.put("bookingSplits", bookingSplits);

        return ResponseEntity.ok(stats);
    }

    // --- MANAGE USERS ---
    @GetMapping("/users")
    public ResponseEntity<List<UserResponseDto>> getAllUsers() {
        List<UserResponseDto> users = userRepository.findAll().stream()
                .map(user -> UserResponseDto.builder()
                        .id(user.getId())
                        .fullName(user.getFullName())
                        .email(user.getEmail())
                        .role(user.getRole().name())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @PostMapping("/users")
    public ResponseEntity<UserResponseDto> createUser(@Valid @RequestBody User user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().build();
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getRole() == null) {
            user.setRole(Role.ROLE_USER);
        }
        User saved = userRepository.save(user);
        UserResponseDto dto = UserResponseDto.builder()
                .id(saved.getId())
                .fullName(saved.getFullName())
                .email(saved.getEmail())
                .role(saved.getRole().name())
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<UserResponseDto> updateUser(@PathVariable Long id, @RequestBody Map<String, String> updates) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (updates.containsKey("fullName")) {
            user.setFullName(updates.get("fullName"));
        }
        if (updates.containsKey("email")) {
            user.setEmail(updates.get("email"));
        }
        if (updates.containsKey("role")) {
            user.setRole(Role.valueOf(updates.get("role")));
        }
        if (updates.containsKey("password") && !updates.get("password").isEmpty()) {
            user.setPassword(passwordEncoder.encode(updates.get("password")));
        }

        User updated = userRepository.save(user);
        UserResponseDto dto = UserResponseDto.builder()
                .id(updated.getId())
                .fullName(updated.getFullName())
                .email(updated.getEmail())
                .role(updated.getRole().name())
                .build();
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // --- MANAGE BOOKINGS ---
    @GetMapping("/bookings")
    public ResponseEntity<List<BookingResponseDto>> getAllBookings() {
        List<BookingResponseDto> list = bookingRepository.findAll().stream()
                .map(this::convertToBookingResponseDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PutMapping("/bookings/{id}/status")
    public ResponseEntity<BookingResponseDto> updateBookingStatusByAdmin(
            @PathVariable Long id,
            @RequestParam String status
    ) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));

        BookingStatus newStatus = BookingStatus.valueOf(status.toUpperCase());
        booking.setStatus(newStatus);
        Booking saved = bookingRepository.save(booking);

        // Handle refund automatically if cancelled
        if (newStatus == BookingStatus.CANCELLED) {
            paymentRepository.findByBookingId(id).ifPresent(p -> {
                p.setStatus(PaymentStatus.REFUNDED);
                paymentRepository.save(p);
            });
        }

        return ResponseEntity.ok(convertToBookingResponseDto(saved));
    }

    @DeleteMapping("/bookings/{id}")
    public ResponseEntity<Void> deleteBooking(@PathVariable Long id) {
        if (!bookingRepository.existsById(id)) {
            throw new ResourceNotFoundException("Booking not found: " + id);
        }
        bookingRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // --- MANAGE PAYMENTS ---
    @GetMapping("/payments")
    public ResponseEntity<List<Payment>> getAllPayments() {
        return ResponseEntity.ok(paymentRepository.findAll());
    }

    @PutMapping("/payments/{id}/status")
    public ResponseEntity<Payment> updatePaymentStatus(
            @PathVariable Long id,
            @RequestParam String status
    ) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment reference not found: " + id));

        payment.setStatus(PaymentStatus.valueOf(status.toUpperCase()));
        Payment updated = paymentRepository.save(payment);
        return ResponseEntity.ok(updated);
    }

    private BookingResponseDto convertToBookingResponseDto(Booking booking) {
        Payment payment = paymentRepository.findByBookingId(booking.getId()).orElse(null);
        return BookingResponseDto.builder()
                .id(booking.getId())
                .turfId(booking.getTurf().getId())
                .turfName(booking.getTurf().getName())
                .turfLocation(booking.getTurf().getLocation())
                .userId(booking.getUser().getId())
                .userEmail(booking.getUser().getEmail())
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .totalPrice(booking.getTotalPrice())
                .status(booking.getStatus().name())
                .paymentStatus(payment != null ? payment.getStatus().name() : "NONE")
                .transactionId(payment != null ? payment.getTransactionId() : null)
                .createdAt(booking.getCreatedAt())
                .build();
    }
}
