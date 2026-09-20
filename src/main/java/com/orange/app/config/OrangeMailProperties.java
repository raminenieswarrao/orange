package com.orange.app.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "orange.mail")
public record OrangeMailProperties(
        boolean enabled,
        String fromAddress,
        String fromName,
        String appUrl
) {
}