package com.dvpgiftcenter.controller;

import com.dvpgiftcenter.dto.admin.UpdateUserRequest;
import com.dvpgiftcenter.dto.admin.UserAdminDto;
import com.dvpgiftcenter.dto.common.ApiResponse;
import com.dvpgiftcenter.entity.User;
import com.dvpgiftcenter.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
@CrossOrigin(origins = "*")
public class AdminUserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<Page<UserAdminDto>>> listUsers(
            @RequestParam(value = "term", required = false) String term,
            @RequestParam(value = "role", required = false) String role,
            @RequestParam(value = "active", required = false) Boolean active,
            @RequestParam(value = "page", required = false, defaultValue = "0") int page,
            @RequestParam(value = "size", required = false, defaultValue = "20") int size,
            @RequestParam(value = "sort", required = false, defaultValue = "createdAt,desc") String sort
    ) {
        try {
            String sortProp = "createdAt";
            Sort.Direction dir = Sort.Direction.DESC;
            if (sort != null && sort.contains(",")) {
                String[] parts = sort.split(",");
                sortProp = parts[0];
                if (parts.length > 1) {
                    dir = "asc".equalsIgnoreCase(parts[1]) ? Sort.Direction.ASC : Sort.Direction.DESC;
                }
            }
            Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(size, 100), Sort.by(dir, sortProp));
            Page<User> pageUsers = userRepository.searchUsers(
                    (term == null || term.isBlank()) ? null : term,
                    (role == null || role.isBlank() || "ALL".equalsIgnoreCase(role)) ? null : role,
                    active,
                    pageable
            );
            Page<UserAdminDto> result = pageUsers.map(UserAdminDto::from);
            return ResponseEntity.ok(ApiResponse.success("Users retrieved", result));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to retrieve users: " + e.getMessage()));
        }
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserAdminDto>> updateUser(@PathVariable("id") Long id,
                                                                @Valid @RequestBody UpdateUserRequest req) {
        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        try {
            User u = opt.get();
            if (req.email != null) u.setEmail(req.email);
            if (req.fullName != null) u.setFullName(req.fullName);
            if (req.firstName != null) u.setFirstName(req.firstName);
            if (req.lastName != null) u.setLastName(req.lastName);
            if (req.phone != null) u.setPhone(req.phone);
            if (req.address != null) u.setAddress(req.address);
            if (req.age != null) u.setAge(req.age);
            if (req.gender != null) u.setGender(req.gender);
            userRepository.save(u);
            return ResponseEntity.ok(ApiResponse.success("User updated", UserAdminDto.from(u)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to update user: " + e.getMessage()));
        }
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<UserAdminDto>> updateUserRole(@PathVariable("id") Long id,
                                                                    @RequestBody String role,
                                                                    Authentication authentication) {
        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        try {
            User u = opt.get();
            if (authentication != null && authentication.getName() != null && authentication.getName().equalsIgnoreCase(u.getUsername())) {
                return ResponseEntity.badRequest().body(ApiResponse.error("You cannot change your own role here."));
            }
            u.setRole(role.replace("\"", "").trim());
            userRepository.save(u);
            return ResponseEntity.ok(ApiResponse.success("Role updated", UserAdminDto.from(u)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to update role: " + e.getMessage()));
        }
    }

    @PutMapping("/users/{id}/activate")
    public ResponseEntity<ApiResponse<UserAdminDto>> activateUser(@PathVariable("id") Long id) {
        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        try {
            User u = opt.get();
            u.setIsActive(true);
            userRepository.save(u);
            return ResponseEntity.ok(ApiResponse.success("User activated", UserAdminDto.from(u)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to activate user: " + e.getMessage()));
        }
    }

    @PutMapping("/users/{id}/deactivate")
    public ResponseEntity<ApiResponse<UserAdminDto>> deactivateUser(@PathVariable("id") Long id,
                                                                    Authentication authentication) {
        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        try {
            User u = opt.get();
            if (authentication != null && authentication.getName() != null && authentication.getName().equalsIgnoreCase(u.getUsername())) {
                return ResponseEntity.badRequest().body(ApiResponse.error("You cannot deactivate your own account here."));
            }
            u.setIsActive(false);
            userRepository.save(u);
            return ResponseEntity.ok(ApiResponse.success("User deactivated", UserAdminDto.from(u)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to deactivate user: " + e.getMessage()));
        }
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<String>> deleteUser(@PathVariable("id") Long id,
                                                          Authentication authentication) {
        try {
            if (!userRepository.existsById(id)) return ResponseEntity.notFound().build();
            // prevent self-deletion via admin endpoint
            if (authentication != null && authentication.getName() != null) {
                Optional<User> opt = userRepository.findById(id);
                if (opt.isPresent() && authentication.getName().equalsIgnoreCase(opt.get().getUsername())) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("You cannot delete your own account here."));
                }
            }
            userRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.success("User deleted", "OK"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to delete user: " + e.getMessage()));
        }
    }
}
