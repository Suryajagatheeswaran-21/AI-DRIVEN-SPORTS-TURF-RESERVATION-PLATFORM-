package com.turfbooking.sportsturfplatform.controller;

import com.turfbooking.sportsturfplatform.dto.DistrictDto;
import com.turfbooking.sportsturfplatform.service.DistrictService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/districts", "/api/districts"})
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class DistrictController {

    private final DistrictService districtService;

    @GetMapping
    public ResponseEntity<List<DistrictDto>> getAllDistricts() {
        return ResponseEntity.ok(districtService.getAllDistricts());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DistrictDto> getDistrictById(@PathVariable Long id) {
        return ResponseEntity.ok(districtService.getDistrictById(id));
    }
}
