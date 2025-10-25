package com.giftshop;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DbPingController {
    @GetMapping("/db/test")
    public String testDb() {
        return "Database connection is working!";
    }
}
