package com.turfbooking.sportsturfplatform.controller;

import com.turfbooking.sportsturfplatform.dto.TurfDto;
import com.turfbooking.sportsturfplatform.service.TurfService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping({"/api/v1/turfs", "/api/turfs"})
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class TurfController {

    private final TurfService turfService;

    @GetMapping
    public ResponseEntity<List<TurfDto>> getAllTurfs() {
        return ResponseEntity.ok(turfService.getAllTurfs());
    }

    @GetMapping("/district/{districtId}")
    public ResponseEntity<List<TurfDto>> getTurfsByDistrict(@PathVariable Long districtId) {
        return ResponseEntity.ok(turfService.getTurfsByDistrictId(districtId));
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<TurfDto>> getNearbyTurfs(
            @RequestParam double latitude,
            @RequestParam double longitude
    ) {
        return ResponseEntity.ok(turfService.getNearbyTurfs(latitude, longitude));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TurfDto> getTurfById(@PathVariable Long id) {
        return ResponseEntity.ok(turfService.getTurfById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<TurfDto>> searchTurfs(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String sportsType,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false, defaultValue = "false") Boolean semantic
    ) {
        return ResponseEntity.ok(turfService.searchTurfs(query, sportsType, maxPrice, semantic));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<TurfDto> createTurf(@Valid @RequestBody TurfDto turfDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(turfService.createTurf(turfDto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<TurfDto> updateTurf(@PathVariable Long id, @Valid @RequestBody TurfDto turfDto) {
        return ResponseEntity.ok(turfService.updateTurf(id, turfDto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Void> deleteTurf(@PathVariable Long id) {
        turfService.deleteTurf(id);
        return ResponseEntity.noContent().build();
    }
}
