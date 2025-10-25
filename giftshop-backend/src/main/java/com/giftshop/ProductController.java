package com.giftshop;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/products")
@CrossOrigin(origins = {
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002"
})
public class ProductController {

    private final ProductRepository productRepository;

    public ProductController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    // GET /products -> ordered by id asc
    @GetMapping
    public List<Product> getAllProducts() {
        return productRepository.findAllByOrderByIdAsc();
    }

    // POST /products
    @PostMapping
    public ResponseEntity<Product> create(@RequestBody Product product) {
        Product saved = productRepository.save(product);
        return ResponseEntity.created(URI.create("/products/" + saved.getId())).body(saved);
    }

    // PUT /products/{id}/stock  with body: { "stock": 20 }
    @PutMapping("/{id}/stock")
    public ResponseEntity<Product> updateStock(@PathVariable int id, @RequestBody Map<String, Integer> body) {
        Integer newStock = body.get("stock");
        if (newStock == null) {
            return ResponseEntity.badRequest().build();
        }
        Optional<Product> opt = productRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Product p = opt.get();
        p.setStock(newStock);
        Product updated = productRepository.save(p);
        return ResponseEntity.ok(updated);
    }

    // DELETE /products/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        if (!productRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        productRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
