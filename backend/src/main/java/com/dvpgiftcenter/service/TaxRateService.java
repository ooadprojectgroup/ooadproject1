package com.dvpgiftcenter.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class TaxRateService {

    @Value("${app.tax.rate:0.00}")
    private BigDecimal defaultTaxRate;

    @Value("${app.tax.configPath:uploads/config/tax-config.json}")
    private String configPath;

    private final AtomicReference<BigDecimal> currentRate = new AtomicReference<>(BigDecimal.ZERO);

    private final ObjectMapper mapper = new ObjectMapper();

    @PostConstruct
    public void init() {
        // Load from file if exists; otherwise use default from properties
        BigDecimal loaded = readFromFile();
        if (loaded != null) {
            currentRate.set(sanitize(loaded));
        } else {
            currentRate.set(sanitize(defaultTaxRate != null ? defaultTaxRate : BigDecimal.ZERO));
        }
    }

    public BigDecimal getTaxRate() {
        return currentRate.get();
    }

    public BigDecimal updateTaxRate(BigDecimal newRate) {
        BigDecimal sanitized = sanitize(newRate);
        currentRate.set(sanitized);
        writeToFile(sanitized);
        return sanitized;
    }

    private BigDecimal sanitize(BigDecimal rate) {
        if (rate == null) return BigDecimal.ZERO;
        if (rate.compareTo(BigDecimal.ZERO) < 0) return BigDecimal.ZERO;
        // Cap at 100% to prevent accidental huge values
        BigDecimal one = new BigDecimal("1.0");
        if (rate.compareTo(one) > 0) return one;
        // Normalize scale
        return rate.stripTrailingZeros();
    }

    private BigDecimal readFromFile() {
        try {
            Path path = Paths.get(configPath);
            if (!Files.exists(path)) return null;
            JsonNode node = mapper.readTree(path.toFile());
            if (node.has("taxRate")) {
                return new BigDecimal(node.get("taxRate").asText());
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void writeToFile(BigDecimal rate) {
        try {
            Path path = Paths.get(configPath);
            File dir = path.getParent().toFile();
            if (!dir.exists()) {
                dir.mkdirs();
            }
            var root = mapper.createObjectNode();
            root.put("taxRate", rate.toPlainString());
            mapper.writerWithDefaultPrettyPrinter().writeValue(path.toFile(), root);
        } catch (IOException ignored) {}
    }
}
