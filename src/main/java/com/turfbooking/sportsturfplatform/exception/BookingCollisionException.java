package com.turfbooking.sportsturfplatform.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class BookingCollisionException extends RuntimeException {
    public BookingCollisionException(String message) {
        super(message);
    }
}
