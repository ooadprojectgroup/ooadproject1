package com.dvpgiftcenter.dto.admin;

import com.dvpgiftcenter.entity.User;

import java.time.LocalDateTime;

public class UserAdminDto {
    public Long userId;
    public String username;
    public String email;
    public String fullName;
    public String firstName;
    public String lastName;
    public String phone;
    public String role;
    public String address;
    public Integer age;
    public String gender;
    public String profileImage;
    public LocalDateTime createdAt;
    public Boolean isActive;

    public static UserAdminDto from(User u) {
        UserAdminDto d = new UserAdminDto();
        d.userId = u.getUserId();
        d.username = u.getUsername();
        d.email = u.getEmail();
        d.fullName = u.getFullName();
        d.firstName = u.getFirstName();
        d.lastName = u.getLastName();
        d.phone = u.getPhone();
        d.role = u.getRole();
        d.address = u.getAddress();
        d.age = u.getAge();
        d.gender = u.getGender();
        d.profileImage = u.getProfileImage();
        d.createdAt = u.getCreatedAt();
        d.isActive = u.getIsActive();
        return d;
    }
}
