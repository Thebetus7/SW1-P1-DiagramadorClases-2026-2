package com.example.back_diagramador.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${diagram.storage.upload-dir:uploads/diagrams}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        String fileUri = uploadPath.toUri().toString();
        if (!fileUri.endsWith("/")) {
            fileUri += "/";
        }

        registry.addResourceHandler("/uploads/diagrams/**")
                .addResourceLocations(fileUri)
                .setCachePeriod(3600);
    }
}
