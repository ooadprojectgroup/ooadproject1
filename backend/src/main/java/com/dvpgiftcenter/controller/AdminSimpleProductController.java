package com.dvpgiftcenter.controller;

import com.dvpgiftcenter.dto.common.ApiResponse;
import com.dvpgiftcenter.dto.simple.CreateSimpleProductRequest;
import com.dvpgiftcenter.dto.simple.SimpleProductDto;
import com.dvpgiftcenter.service.AdminSimpleProductService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/simple-products")
@PreAuthorize("hasRole('ADMIN')")
@CrossOrigin(origins = "*")
public class AdminSimpleProductController {

    @Autowired
    private AdminSimpleProductService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SimpleProductDto>>> list() {
        List<SimpleProductDto> list = service.list();
        return ResponseEntity.ok(ApiResponse.success("Products retrieved", list));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SimpleProductDto>> create(@Valid @RequestBody CreateSimpleProductRequest req) {
        SimpleProductDto created = service.create(req);
        return ResponseEntity.ok(ApiResponse.success("Product created", created));
    }

    @PutMapping("/{id}/stock")
    public ResponseEntity<ApiResponse<Map<String, Object>>> setStock(@PathVariable("id") Long id,
                                                  @RequestBody Map<String, Integer> body) {
        Integer stock = body.get("stock");
        if (stock == null || stock < 0) {
            return ResponseEntity.badRequest().body(ApiResponse.error("'stock' is required and must be >= 0"));
        }
        service.setStock(id, stock);
        Map<String, Object> resp = new HashMap<>();
        resp.put("id", id);
        resp.put("stock", stock);
        return ResponseEntity.ok(ApiResponse.success("Stock updated", resp));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> delete(@PathVariable("id") Long id) {
        service.deleteSoft(id);
        return ResponseEntity.ok(ApiResponse.success("Product archived"));
    }
}
