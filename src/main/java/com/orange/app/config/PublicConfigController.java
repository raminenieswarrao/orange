package com.orange.app.config;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicConfigController {

    private final OrangeProperties properties;

    public PublicConfigController(OrangeProperties properties) {
        this.properties = properties;
    }

    @GetMapping("/config")
    public PublicConfigResponse config() {
        return new PublicConfigResponse(properties.url(), properties.anonKey());
    }

    public record PublicConfigResponse(String supabaseUrl, String supabaseAnonKey) {
    }
}
