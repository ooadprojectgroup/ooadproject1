package com.dvpgiftcenter.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // Base directory where uploads are stored (default to "uploads")
    @Value("${app.upload.base-dir:uploads}")
    private String uploadsBaseDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve any request to /uploads/** from the local uploads folder
        Path uploadRoot = Paths.get(uploadsBaseDir).toAbsolutePath().normalize();
        String location = uploadRoot.toUri().toString(); // e.g., file:/D:/path/to/uploads/
        if (!location.endsWith("/")) {
            location += "/";
        }
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location)
                .setCachePeriod(3600); // cache for 1 hour
    }
}
