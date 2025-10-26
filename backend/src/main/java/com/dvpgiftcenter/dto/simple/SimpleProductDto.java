package com.dvpgiftcenter.dto.simple;

import java.math.BigDecimal;

/**
 * A minimal product view to support the lightweight Gift Shop Manager page.
 * Aligns the member UI that expects: id, name, price, stock.
 */
public class SimpleProductDto {
    private Long id;
    private String name;
    private BigDecimal price;
    private Integer stock;

    public SimpleProductDto() {}

    public SimpleProductDto(Long id, String name, BigDecimal price, Integer stock) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.stock = stock;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
}
