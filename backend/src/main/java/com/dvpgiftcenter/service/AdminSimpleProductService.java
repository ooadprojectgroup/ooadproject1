package com.dvpgiftcenter.service;

import com.dvpgiftcenter.dto.simple.CreateSimpleProductRequest;
import com.dvpgiftcenter.dto.simple.SimpleProductDto;
import com.dvpgiftcenter.entity.Inventory;
import com.dvpgiftcenter.entity.Product;
import com.dvpgiftcenter.repository.InventoryRepository;
import com.dvpgiftcenter.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class AdminSimpleProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Transactional(readOnly = true)
    public List<SimpleProductDto> list() {
        return productRepository.findByIsActiveTrueOrderByProductName()
                .stream()
                .map(p -> new SimpleProductDto(
                        p.getProductId(),
                        p.getProductName(),
                        p.getUnitPrice(),
                        Optional.ofNullable(p.getInventory())
                                .map(Inventory::getCurrentStock)
                                .orElse(0)
                ))
                .collect(Collectors.toList());
    }

    @Transactional
    public SimpleProductDto create(CreateSimpleProductRequest req) {
        // Create minimal product (no category, active=true)
        Product product = new Product();
        product.setProductName(req.getName());
        product.setUnitPrice(req.getPrice());
        product.setIsActive(true);
        product = productRepository.save(product);

        // Create inventory with initial stock
        Inventory inv = new Inventory();
        inv.setProduct(product);
        inv.setCurrentStock(req.getStock());
        inv.setMinStockLevel(0);
        inventoryRepository.save(inv);

        return new SimpleProductDto(product.getProductId(), product.getProductName(), product.getUnitPrice(), req.getStock());
    }

    @Transactional
    public void setStock(Long productId, Integer stock) {
        Inventory inv = inventoryRepository.findByProductProductId(productId)
                .orElseGet(() -> {
                    Inventory created = new Inventory();
                    Product p = productRepository.findById(productId)
                            .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));
                    created.setProduct(p);
                    created.setCurrentStock(0);
                    created.setMinStockLevel(0);
                    return created;
                });
        inv.setCurrentStock(stock);
        inventoryRepository.save(inv);
    }

    @Transactional
    public void deleteSoft(Long productId) {
        Product p = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));
        p.setIsActive(false);
        productRepository.save(p);
    }
}
