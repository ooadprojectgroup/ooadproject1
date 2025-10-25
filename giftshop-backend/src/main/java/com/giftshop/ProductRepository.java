package com.giftshop;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Integer> {
    // always return products ordered by ID ascending
    List<Product> findAllByOrderByIdAsc();
}
