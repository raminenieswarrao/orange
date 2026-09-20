package com.orange.app.supabase;

import com.orange.app.config.OrangeProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class SupabaseAdminClient {

    private final RestClient restClient;

    public SupabaseAdminClient(
            OrangeProperties properties,
            RestClient.Builder restClientBuilder
    ) {
        if (properties.url() == null
                || properties.url().isBlank()) {
            throw new IllegalStateException(
                    "SUPABASE_URL is required."
            );
        }

        if (properties.serviceRoleKey() == null
                || properties.serviceRoleKey().isBlank()) {
            throw new IllegalStateException(
                    "SUPABASE_SERVICE_ROLE_KEY is required."
            );
        }

        this.restClient =
                restClientBuilder
                        .baseUrl(
                                normalizeBaseUrl(
                                        properties.url()
                                )
                                        + "/rest/v1"
                        )
                        .defaultHeader(
                                "apikey",
                                properties.serviceRoleKey()
                        )
                        .defaultHeader(
                                HttpHeaders.AUTHORIZATION,
                                "Bearer "
                                        + properties.serviceRoleKey()
                        )
                        .defaultHeader(
                                HttpHeaders.CONTENT_TYPE,
                                MediaType.APPLICATION_JSON_VALUE
                        )
                        .defaultHeader(
                                HttpHeaders.ACCEPT,
                                MediaType.APPLICATION_JSON_VALUE
                        )
                        .build();
    }

    public RestClient restClient() {
        return restClient;
    }

    private String normalizeBaseUrl(
            String value
    ) {
        String url = value.trim();

        while (url.endsWith("/")) {
            url =
                    url.substring(
                            0,
                            url.length() - 1
                    );
        }

        return url;
    }
}