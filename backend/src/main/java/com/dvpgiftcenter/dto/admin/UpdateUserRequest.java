package com.dvpgiftcenter.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public class UpdateUserRequest {
    @Email
    public String email;

    @Size(max = 100)
    public String fullName;

    @Size(max = 100)
    public String firstName;

    @Size(max = 100)
    public String lastName;

    @Size(max = 20)
    public String phone;

    public String address;

    public Integer age;

    public String gender;
}
