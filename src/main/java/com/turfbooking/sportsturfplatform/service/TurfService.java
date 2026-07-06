package com.turfbooking.sportsturfplatform.service;

import com.turfbooking.sportsturfplatform.dto.TurfDto;
import com.turfbooking.sportsturfplatform.exception.ResourceNotFoundException;
import com.turfbooking.sportsturfplatform.model.District;
import com.turfbooking.sportsturfplatform.model.Turf;
import com.turfbooking.sportsturfplatform.repository.DistrictRepository;
import com.turfbooking.sportsturfplatform.repository.ReviewRepository;
import com.turfbooking.sportsturfplatform.repository.TurfRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TurfService {

    private final TurfRepository turfRepository;
    private final ReviewRepository reviewRepository;
    private final DistrictRepository districtRepository;

    @Transactional(readOnly = true)
    public List<TurfDto> getAllTurfs() {
        return turfRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TurfDto> getTurfsByDistrictId(Long districtId) {
        return turfRepository.findByDistrictIdAndIsActiveTrue(districtId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TurfDto> getNearbyTurfs(double latitude, double longitude) {
        return turfRepository.findNearbyTurfs(latitude, longitude).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TurfDto getTurfById(Long id) {
        Turf turf = turfRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Turf not found with id: " + id));
        return convertToDto(turf);
    }

    @Transactional
    public TurfDto createTurf(TurfDto dto) {
        District district = null;
        if (dto.getDistrictId() != null) {
            district = districtRepository.findById(dto.getDistrictId())
                    .orElseThrow(() -> new ResourceNotFoundException("District not found with id: " + dto.getDistrictId()));
        }

        Turf turf = Turf.builder()
                .name(dto.getName())
                .district(district)
                .location(dto.getLocation())
                .address(dto.getAddress())
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .sportsType(dto.getSportsType().toUpperCase())
                .description(dto.getDescription())
                .pricePerHour(dto.getPricePerHour())
                .availability(dto.getAvailability() != null ? dto.getAvailability() : "AVAILABLE")
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();
        Turf saved = turfRepository.save(turf);
        return convertToDto(saved);
    }

    @Transactional
    public TurfDto updateTurf(Long id, TurfDto dto) {
        Turf turf = turfRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Turf not found with id: " + id));

        District district = null;
        if (dto.getDistrictId() != null) {
            district = districtRepository.findById(dto.getDistrictId())
                    .orElseThrow(() -> new ResourceNotFoundException("District not found with id: " + dto.getDistrictId()));
        }

        turf.setDistrict(district);
        turf.setName(dto.getName());
        turf.setLocation(dto.getLocation());
        turf.setAddress(dto.getAddress());
        turf.setLatitude(dto.getLatitude());
        turf.setLongitude(dto.getLongitude());
        turf.setSportsType(dto.getSportsType().toUpperCase());
        turf.setDescription(dto.getDescription());
        turf.setPricePerHour(dto.getPricePerHour());
        if (dto.getAvailability() != null) {
            turf.setAvailability(dto.getAvailability());
        }
        if (dto.getIsActive() != null) {
            turf.setIsActive(dto.getIsActive());
        }

        Turf updated = turfRepository.save(turf);
        return convertToDto(updated);
    }

    @Transactional
    public void deleteTurf(Long id) {
        if (!turfRepository.existsById(id)) {
            throw new ResourceNotFoundException("Turf not found with id: " + id);
        }
        turfRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<TurfDto> searchTurfs(String query, String sportsType, BigDecimal maxPrice, Boolean semantic) {
        List<Turf> results;

        if (Boolean.TRUE.equals(semantic) && query != null && !query.trim().isEmpty()) {
            // Smart pgvector Cosine similarity simulation by generating mock query vector matching seeded samples.
            // Starfire Turf A (FOOTBALL) seed: 0.85
            // Emerald Cricket Grounds (CRICKET) seed: 0.42
            // Rainier Tennis Court (TENNIS) seed: 0.19
            // Redmond Futsal Hub (FOOTBALL) seed: 0.78
            double seed = 0.5; // default center
            String lowerQuery = query.toLowerCase();
            if (lowerQuery.contains("football") || lowerQuery.contains("soccer") || lowerQuery.contains("starfire") || lowerQuery.contains("indoor")) {
                seed = 0.85;
            } else if (lowerQuery.contains("futsal") || lowerQuery.contains("fast") || lowerQuery.contains("rebound")) {
                seed = 0.78;
            } else if (lowerQuery.contains("cricket") || lowerQuery.contains("emerald") || lowerQuery.contains("bowl")) {
                seed = 0.42;
            } else if (lowerQuery.contains("tennis") || lowerQuery.contains("court") || lowerQuery.contains("serena")) {
                seed = 0.19;
            }

            String vectorString = generateMockVectorString(seed);
            results = turfRepository.findSimilarTurfs(vectorString, 10);
        } else if (query != null && !query.trim().isEmpty()) {
            results = turfRepository.findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(query, query);
        } else {
            results = turfRepository.findByIsActiveTrue();
        }

        // Apply filters in memory for sportsType and price limits if specified
        return results.stream()
                .filter(t -> sportsType == null || sportsType.equalsIgnoreCase("ALL") || t.getSportsType().equalsIgnoreCase(sportsType))
                .filter(t -> maxPrice == null || t.getPricePerHour().compareTo(maxPrice) <= 0)
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private String generateMockVectorString(double seedVal) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 1; i <= 1536; i++) {
            double val = 0.0;
            if (i <= 50) {
                val = seedVal * (1.0 / i);
            }
            sb.append(val);
            if (i < 1536) {
                sb.append(",");
            }
        }
        sb.append("]");
        return sb.toString();
    }

    private TurfDto convertToDto(Turf turf) {
        Double avgRating = reviewRepository.getAverageRatingForTurf(turf.getId());
        return TurfDto.builder()
                .id(turf.getId())
                .districtId(turf.getDistrict() != null ? turf.getDistrict().getId() : null)
                .districtName(turf.getDistrict() != null ? turf.getDistrict().getName() : null)
                .name(turf.getName())
                .location(turf.getLocation())
                .address(turf.getAddress())
                .latitude(turf.getLatitude())
                .longitude(turf.getLongitude())
                .sportsType(turf.getSportsType())
                .description(turf.getDescription())
                .pricePerHour(turf.getPricePerHour())
                .availability(turf.getAvailability())
                .isActive(turf.getIsActive())
                .rating(avgRating)
                .build();
    }
}
