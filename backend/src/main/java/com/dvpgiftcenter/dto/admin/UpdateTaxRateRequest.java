package com.dvpgiftcenter.dto.admin;

import java.math.BigDecimal;

public class UpdateTaxRateRequest {
    private BigDecimal taxRate;

    public UpdateTaxRateRequest() {}

    public UpdateTaxRateRequest(BigDecimal taxRate) {
        this.taxRate = taxRate;
    }

    public BigDecimal getTaxRate() {
        return taxRate;
    }

    public void setTaxRate(BigDecimal taxRate) {
        this.taxRate = taxRate;
    }
}
