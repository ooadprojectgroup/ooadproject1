package com.dvpgiftcenter.controller;

import com.dvpgiftcenter.dto.admin.UpdateTaxRateRequest;
import com.dvpgiftcenter.dto.common.ApiResponse;
import com.dvpgiftcenter.service.TaxRateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/admin/settings")
@CrossOrigin(origins = "*")
public class AdminSettingsController {

    @Autowired
    private TaxRateService taxRateService;

    @GetMapping("/tax")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTaxRate() {
        BigDecimal rate = taxRateService.getTaxRate();
        return ResponseEntity.ok(ApiResponse.success("Tax rate fetched", Map.of("taxRate", rate)));
    }

    @PutMapping("/tax")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateTaxRate(@RequestBody UpdateTaxRateRequest req) {
        if (req == null || req.getTaxRate() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("taxRate is required"));
        }
        BigDecimal updated = taxRateService.updateTaxRate(req.getTaxRate());
        return ResponseEntity.ok(ApiResponse.success("Tax rate updated", Map.of("taxRate", updated)));
    }
}
