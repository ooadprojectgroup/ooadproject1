package com.dvpgiftcenter.controller;

import com.dvpgiftcenter.dto.auth.JwtResponse;
import com.dvpgiftcenter.dto.auth.LoginRequest;
import com.dvpgiftcenter.dto.auth.RegisterRequest;
import com.dvpgiftcenter.dto.common.ApiResponse;
import com.dvpgiftcenter.dto.auth.UpdateProfileRequest;
import com.dvpgiftcenter.dto.auth.ChangePasswordRequest;
import com.dvpgiftcenter.entity.User;
import com.dvpgiftcenter.repository.UserRepository;
import com.dvpgiftcenter.security.JwtUtils;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.context.support.DefaultMessageSourceResolvable;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    
    @Autowired
    private AuthenticationManager authenticationManager;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private JwtUtils jwtUtils;

    @Value("${app.upload.profile-dir:uploads/profile-images}")
    private String profileUploadDir;
    
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtResponse>> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequest.getUsername(),
                    loginRequest.getPassword()
                )
            );
            
            User user = userRepository.findByUsernameAndIsActiveTrue(loginRequest.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            String jwt = jwtUtils.generateToken(user.getUsername(), user.getRole());
            
            JwtResponse jwtResponse = new JwtResponse(
                jwt,
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole()
            );
            // Include profile image path if available
            jwtResponse.setProfileImage(user.getProfileImage());
            
            return ResponseEntity.ok(ApiResponse.success("Login successful", jwtResponse));
            
        } catch (AuthenticationException e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Invalid username or password"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Login failed: " + e.getMessage()));
        }
    }
    
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<String>> register(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            // Check if username exists
            if (userRepository.existsByUsername(registerRequest.getUsername())) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Username is already taken"));
            }
            
            // Check if email exists
            if (userRepository.existsByEmail(registerRequest.getEmail())) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Email is already in use"));
            }
            
            // Create new user
            String fullName = (registerRequest.getFirstName() + " " + registerRequest.getLastName()).trim();
            User user = new User(
                registerRequest.getUsername(),
                passwordEncoder.encode(registerRequest.getPassword()),
                registerRequest.getEmail(),
                fullName,
                "customer" // Default role for registration
            );

            user.setFirstName(registerRequest.getFirstName());
            user.setLastName(registerRequest.getLastName());
            user.setPhone(registerRequest.getPhone());
            user.setAddress(registerRequest.getAddress());
            user.setAge(registerRequest.getAge());
            user.setGender(registerRequest.getGender());

            // Online image URL not supported in JSON endpoint per latest requirements.
            
            userRepository.save(user);
            
            return ResponseEntity.ok(
                ApiResponse.success("User registered successfully")
            );
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping(value = "/register-multipart", consumes = {"multipart/form-data"})
    public ResponseEntity<ApiResponse<String>> registerMultipart(
            @RequestParam String username,
            @RequestParam String password,
            @RequestParam String email,
            @RequestParam String firstName,
            @RequestParam String lastName,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String address,
            @RequestParam(required = false) Integer age,
            @RequestParam(required = false) String gender,
        @RequestPart(name = "profileImage", required = false) MultipartFile profileImage
    ) {
        try {
            if (userRepository.existsByUsername(username)) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Username is already taken"));
            }
            if (userRepository.existsByEmail(email)) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Email is already in use"));
            }

            String fullName = (firstName + " " + lastName).trim();
            User user = new User(
                username,
                passwordEncoder.encode(password),
                email,
                fullName,
                "customer"
            );
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setPhone(phone);
            user.setAddress(address);
            user.setAge(age);
            user.setGender(gender);

            // Handle profile image upload or URL
            if (profileImage != null && !profileImage.isEmpty()) {
                String savedPath = saveProfileImageFile(profileImage, username);
                user.setProfileImage(savedPath);
            }

            userRepository.save(user);
            return ResponseEntity.ok(ApiResponse.success("User registered successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Registration failed: " + e.getMessage()));
        }
    }

    private String saveProfileImageFile(MultipartFile file, String username) throws Exception {
        // Ensure directories exist
        Path uploadPath = Paths.get(profileUploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);

        String originalName = file.getOriginalFilename();
        String original = (originalName == null || originalName.isBlank()) ? "profile" : originalName;
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot > 0 && dot < original.length() - 1) {
            ext = original.substring(dot);
        }
        String timestamp = DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(LocalDateTime.now());
        String safeBase = username.replaceAll("[^a-zA-Z0-9_-]", "_");
        String filename = safeBase + "_" + timestamp + ext;

        Path target = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), target);

        // Return a relative path that can be stored (e.g., uploads/profile-images/filename)
        Path projectRoot = Paths.get("").toAbsolutePath().normalize();
        String relative = projectRoot.relativize(target).toString().replace('\\', '/');
        return relative;
    }

    // Validation error handling for this controller to ensure consistent ApiResponse messages
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<String>> handleValidationErrors(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(DefaultMessageSourceResolvable::getDefaultMessage)
                .findFirst()
                .orElse("Validation failed");
        return ResponseEntity.badRequest().body(ApiResponse.error(message));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<JwtResponse>> me(Authentication authentication) {
        try {
            if (authentication == null || authentication.getName() == null) {
                return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
            }
            String username = authentication.getName();
            User user = userRepository.findByUsernameAndIsActiveTrue(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            JwtResponse resp = new JwtResponse();
            resp.setUsername(user.getUsername());
            resp.setEmail(user.getEmail());
            resp.setFullName(user.getFullName());
            resp.setRole(user.getRole());
            resp.setProfileImage(user.getProfileImage());
            resp.setFirstName(user.getFirstName());
            resp.setLastName(user.getLastName());
            resp.setPhone(user.getPhone());
            resp.setAddress(user.getAddress());
            resp.setAge(user.getAge());
            resp.setGender(user.getGender());
            return ResponseEntity.ok(ApiResponse.success("User profile", resp));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to get profile: " + e.getMessage()));
        }
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<String>> updateMe(Authentication authentication,
                                                        @Valid @RequestBody UpdateProfileRequest req) {
        try {
            if (authentication == null || authentication.getName() == null) {
                return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
            }
            String username = authentication.getName();
            User user = userRepository.findByUsernameAndIsActiveTrue(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Ensure email uniqueness if changed
            if (req.getEmail() != null && !req.getEmail().equalsIgnoreCase(user.getEmail())) {
                var existing = userRepository.findByEmail(req.getEmail());
                if (existing.isPresent() && !existing.get().getUserId().equals(user.getUserId())) {
                    return ResponseEntity.badRequest().body(ApiResponse.error("Email is already in use"));
                }
                user.setEmail(req.getEmail());
            }

            if (req.getFirstName() != null) user.setFirstName(req.getFirstName());
            if (req.getLastName() != null) user.setLastName(req.getLastName());
            if (req.getPhone() != null) user.setPhone(req.getPhone());
            if (req.getAddress() != null) user.setAddress(req.getAddress());
            if (req.getAge() != null) user.setAge(req.getAge());
            if (req.getGender() != null) user.setGender(req.getGender());

            // Recompute fullName from first+last if provided
            if (req.getFirstName() != null || req.getLastName() != null) {
                String fn = user.getFirstName() != null ? user.getFirstName() : "";
                String ln = user.getLastName() != null ? user.getLastName() : "";
                String full = (fn + " " + ln).trim();
                if (!full.isEmpty()) {
                    user.setFullName(full);
                }
            }

            userRepository.save(user);
            return ResponseEntity.ok(ApiResponse.success("Profile updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to update profile: " + e.getMessage()));
        }
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<String>> deleteMe(Authentication authentication) {
        try {
            if (authentication == null || authentication.getName() == null) {
                return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
            }
            String username = authentication.getName();
            User user = userRepository.findByUsernameAndIsActiveTrue(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Soft delete: deactivate account
            user.setIsActive(false);
            userRepository.save(user);
            return ResponseEntity.ok(ApiResponse.success("Account deleted"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to delete account: " + e.getMessage()));
        }
    }

    @PutMapping(value = "/me/profile-image", consumes = {"multipart/form-data"})
    public ResponseEntity<ApiResponse<JwtResponse>> updateProfileImage(Authentication authentication,
                                                                       @RequestPart(name = "profileImage", required = true) MultipartFile profileImage) {
        try {
            if (authentication == null || authentication.getName() == null) {
                return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
            }
            if (profileImage == null || profileImage.isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("No image provided"));
            }

            String username = authentication.getName();
            User user = userRepository.findByUsernameAndIsActiveTrue(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String savedPath = saveProfileImageFile(profileImage, username);
            user.setProfileImage(savedPath);
            userRepository.save(user);

            JwtResponse resp = new JwtResponse();
            resp.setUsername(user.getUsername());
            resp.setEmail(user.getEmail());
            resp.setFullName(user.getFullName());
            resp.setRole(user.getRole());
            resp.setProfileImage(user.getProfileImage());
            return ResponseEntity.ok(ApiResponse.success("Profile image updated", resp));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to update image: " + e.getMessage()));
        }
    }

    @DeleteMapping("/me/profile-image")
    public ResponseEntity<ApiResponse<String>> deleteProfileImage(Authentication authentication) {
        try {
            if (authentication == null || authentication.getName() == null) {
                return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
            }
            String username = authentication.getName();
            User user = userRepository.findByUsernameAndIsActiveTrue(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String current = user.getProfileImage();
            if (current != null && !current.isBlank()) {
                try {
                    Path path = Paths.get(current).toAbsolutePath().normalize();
                    Files.deleteIfExists(path);
                } catch (Exception ignored) {}
            }
            user.setProfileImage(null);
            userRepository.save(user);
            return ResponseEntity.ok(ApiResponse.success("Profile image removed"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to remove image: " + e.getMessage()));
        }
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(Authentication authentication,
                                                              @Valid @RequestBody ChangePasswordRequest req) {
        try {
            if (authentication == null || authentication.getName() == null) {
                return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
            }
            if (!req.getNewPassword().equals(req.getConfirmNewPassword())) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Passwords do not match"));
            }

            String username = authentication.getName();
            User user = userRepository.findByUsernameAndIsActiveTrue(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPasswordHash())) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Current password is incorrect"));
            }
            if (passwordEncoder.matches(req.getNewPassword(), user.getPasswordHash())) {
                return ResponseEntity.badRequest().body(ApiResponse.error("New password must be different from current password"));
            }

            user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
            userRepository.save(user);
            return ResponseEntity.ok(ApiResponse.success("Password changed successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to change password: " + e.getMessage()));
        }
    }
}