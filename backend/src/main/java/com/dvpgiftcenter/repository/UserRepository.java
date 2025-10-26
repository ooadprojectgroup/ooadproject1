package com.dvpgiftcenter.repository;

import com.dvpgiftcenter.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByUsername(String username);
    
    Optional<User> findByEmail(String email);
    
    boolean existsByUsername(String username);
    
    boolean existsByEmail(String email);
    
    Optional<User> findByUsernameAndIsActiveTrue(String username);
    
    Optional<User> findByEmailAndIsActiveTrue(String email);

    @Query("SELECT u FROM User u WHERE (:term IS NULL OR LOWER(u.username) LIKE LOWER(CONCAT('%',:term,'%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%',:term,'%')) OR LOWER(u.fullName) LIKE LOWER(CONCAT('%',:term,'%'))) AND (:role IS NULL OR LOWER(u.role) = LOWER(:role)) AND (:active IS NULL OR u.isActive = :active)")
    Page<User> searchUsers(@Param("term") String term,
                           @Param("role") String role,
                           @Param("active") Boolean active,
                           Pageable pageable);
}