package com.orange.app.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "orange.supabase")
public record OrangeProperties(
        String url,
        String anonKey,
        String serviceRoleKey
) {
}