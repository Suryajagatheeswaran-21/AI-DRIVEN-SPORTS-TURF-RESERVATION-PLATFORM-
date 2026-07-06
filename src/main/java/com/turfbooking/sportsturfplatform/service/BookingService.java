package com.turfbooking.sportsturfplatform.service;

import com.turfbooking.sportsturfplatform.dto.BookingRequestDto;
import com.turfbooking.sportsturfplatform.dto.BookingResponseDto;
import com.turfbooking.sportsturfplatform.exception.BookingCollisionException;
import com.turfbooking.sportsturfplatform.exception.InvalidBookingException;
import com.turfbooking.sportsturfplatform.exception.ResourceNotFoundException;
import com.turfbooking.sportsturfplatform.model.*;
import com.turfbooking.sportsturfplatform.repository.BookingRepository;
import com.turfbooking.sportsturfplatform.repository.PaymentRepository;
import com.turfbooking.sportsturfplatform.repository.TurfRepository;
import com.turfbooking.sportsturfplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final TurfRepository turfRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;

    @Transactional
    public BookingResponseDto bookTurf(BookingRequestDto request, String userEmail) {
        // 1. Fetch user and turf
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        Turf turf = turfRepository.findById(request.getTurfId())
                .orElseThrow(() -> new ResourceNotFoundException("Turf not found with id: " + request.getTurfId()));

        if (!turf.getIsActive()) {
            throw new InvalidBookingException("This sports turf is currently inactive.");
        }

        // 2. Validate booking times
        LocalDateTime start = request.getStartTime();
        LocalDateTime end = request.getEndTime();

        if (start == null || end == null) {
            throw new InvalidBookingException("Start time and end time are required.");
        }

        if (!start.isBefore(end)) {
            throw new InvalidBookingException("Start time must be chronologically before end time.");
        }

        if (start.isBefore(LocalDateTime.now())) {
            throw new InvalidBookingException("Cannot book slots in the past.");
        }

        // 3. Collision checks (overlap)
        boolean hasOverlap = bookingRepository.existsOverlappingBooking(turf.getId(), start, end);
        if (hasOverlap) {
            throw new BookingCollisionException("The requested slot overlaps with an existing confirmed booking.");
        }

        // 4. Calculate total price
        long minutes = Duration.between(start, end).toMinutes();
        if (minutes < 30) {
            throw new InvalidBookingException("Minimum booking duration is 30 minutes.");
        }
        
        BigDecimal hoursFraction = BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, BigDecimal.ROUND_HALF_UP);
        BigDecimal totalPrice = turf.getPricePerHour().multiply(hoursFraction);

        // 5. Save booking
        Booking booking = Booking.builder()
                .turf(turf)
                .user(user)
                .startTime(start)
                .endTime(end)
                .totalPrice(totalPrice)
                .status(BookingStatus.CONFIRMED) // Auto-confirmed on creation
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        // 6. Generate Payment Transaction
        Payment payment = Payment.builder()
                .booking(savedBooking)
                .user(user)
                .amount(totalPrice)
                .paymentMethod(request.getPaymentMethod().toUpperCase())
                .status(PaymentStatus.COMPLETED) // Assume completed successfully
                .transactionId(generateTransactionId(request.getPaymentMethod()))
                .build();

        paymentRepository.save(payment);

        return convertToResponseDto(savedBooking);
    }

    @Transactional
    public BookingResponseDto cancelBooking(Long bookingId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        // Enforce role permission: user can cancel their own, ADMIN can cancel any
        if (user.getRole() != Role.ROLE_ADMIN && !booking.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You are not authorized to cancel this booking.");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new InvalidBookingException("Booking is already cancelled.");
        }

        // Refund policies: Can cancel any time in this system, mock refund
        booking.setStatus(BookingStatus.CANCELLED);
        Booking updatedBooking = bookingRepository.save(booking);

        // Update payment status to REFUNDED
        paymentRepository.findByBookingId(bookingId).ifPresent(payment -> {
            payment.setStatus(PaymentStatus.REFUNDED);
            paymentRepository.save(payment);
        });

        return convertToResponseDto(updatedBooking);
    }

    @Transactional(readOnly = true)
    public List<BookingResponseDto> getBookingHistory(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        List<Booking> bookings;
        if (user.getRole() == Role.ROLE_ADMIN) {
            bookings = bookingRepository.findAll();
        } else {
            bookings = bookingRepository.findByUserId(user.getId());
        }

        return bookings.stream()
                .map(this::convertToResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BookingResponseDto getBookingById(Long id, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + id));

        if (user.getRole() != Role.ROLE_ADMIN && !booking.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You are not authorized to view this booking.");
        }

        return convertToResponseDto(booking);
    }

    private String generateTransactionId(String method) {
        String prefix = method != null ? method.toUpperCase() : "PAY";
        return prefix + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private BookingResponseDto convertToResponseDto(Booking booking) {
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
