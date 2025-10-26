package com.dvpgiftcenter.controller;

import com.dvpgiftcenter.dto.common.ApiResponse;
import com.dvpgiftcenter.service.TaxRateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/settings")
@CrossOrigin(origins = "*")
public class SettingsController {

    @Autowired
    private TaxRateService taxRateService;

    @GetMapping("/tax")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPublicTaxRate() {
        BigDecimal rate = taxRateService.getTaxRate();
        return ResponseEntity.ok(ApiResponse.success("Tax rate fetched", Map.of("taxRate", rate)));
    }
}
