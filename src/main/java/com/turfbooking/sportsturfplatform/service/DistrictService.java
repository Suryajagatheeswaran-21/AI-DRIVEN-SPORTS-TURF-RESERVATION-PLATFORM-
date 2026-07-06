package com.turfbooking.sportsturfplatform.service;

import com.turfbooking.sportsturfplatform.dto.DistrictDto;
import com.turfbooking.sportsturfplatform.model.District;
import com.turfbooking.sportsturfplatform.repository.DistrictRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DistrictService {

    private final DistrictRepository districtRepository;

    @Transactional(readOnly = true)
    public List<DistrictDto> getAllDistricts() {
        return districtRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DistrictDto getDistrictById(Long id) {
        District district = districtRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("District not found with id: " + id));
        return convertToDto(district);
    }

    private DistrictDto convertToDto(District district) {
        return DistrictDto.builder()
                .id(district.getId())
                .name(district.getName())
                .latitude(district.getLatitude())
                .longitude(district.getLongitude())
                .build();
    }
}
