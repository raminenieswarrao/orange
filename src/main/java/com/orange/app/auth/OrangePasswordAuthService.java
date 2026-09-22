package com.orange.app.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.orange.app.config.OrangeProperties;
import com.orange.app.supabase.SupabaseAdminClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;

@Service
public class OrangePasswordAuthService {

    private final SupabaseAdminClient supabaseAdminClient;
    private final RestClient authClient;

    public OrangePasswordAuthService(
            SupabaseAdminClient supabaseAdminClient,
            OrangeProperties properties,
            RestClient.Builder restClientBuilder
    ) {
        this.supabaseAdminClient =
                supabaseAdminClient;

        if (
                properties.url() == null
                        || properties.url().isBlank()
        ) {
            throw new IllegalStateException(
                    "SUPABASE_URL is required."
            );
        }

        if (
                properties.anonKey() == null
                        || properties.anonKey().isBlank()
        ) {
            throw new IllegalStateException(
                    "SUPABASE_ANON_KEY is required."
            );
        }

        this.authClient =
                restClientBuilder
                        .baseUrl(
                                normalizeBaseUrl(
                                        properties.url()
                                )
                                        + "/auth/v1"
                        )
                        .defaultHeader(
                                "apikey",
                                properties.anonKey()
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

    /**
     * Signs into Orange using either:
     *
     * - email + password
     * - username + password
     *
     * Username-to-email resolution happens only
     * on the server through the service-role client.
     */
    public LoginResult login(
            String identifier,
            String password
    ) {
        String normalizedIdentifier =
                normalizeIdentifier(
                        identifier
                );

        String normalizedPassword =
                normalizePassword(
                        password
                );

        String email =
                resolveEmail(
                        normalizedIdentifier
                );

        if (
                email == null
                        || email.isBlank()
        ) {
            throw new InvalidLoginException();
        }

        try {
            SupabaseTokenResponse response =
                    authClient
                            .post()
                            .uri(
                                    "/token?grant_type=password"
                            )
                            .body(
                                    Map.of(
                                            "email",
                                            email,
                                            "password",
                                            normalizedPassword
                                    )
                            )
                            .retrieve()
                            .body(
                                    SupabaseTokenResponse.class
                            );

            if (
                    response == null
                            || response.accessToken() == null
                            || response.accessToken().isBlank()
                            || response.refreshToken() == null
                            || response.refreshToken().isBlank()
            ) {
                throw new InvalidLoginException();
            }

            return new LoginResult(
                    response.accessToken(),
                    response.refreshToken(),
                    response.expiresIn(),
                    response.tokenType()
            );

        } catch (
                RestClientResponseException exception
        ) {
            /*
             * Never expose Supabase's underlying response
             * because that could disclose whether the
             * username/email exists.
             */
            if (
                    exception.getStatusCode()
                            .is4xxClientError()
            ) {
                throw new InvalidLoginException();
            }

            throw exception;
        }
    }

    /**
     * Resolves an Orange username or email to the
     * canonical account email using the private
     * service-role-only database function.
     */
    private String resolveEmail(
            String identifier
    ) {
        String resolved =
                supabaseAdminClient
                        .restClient()
                        .post()
                        .uri(
                                "/rpc/resolve_login_email"
                        )
                        .body(
                                Map.of(
                                        "p_identifier",
                                        identifier
                                )
                        )
                        .retrieve()
                        .body(
                                String.class
                        );

        if (resolved == null) {
            return null;
        }

        String email =
                resolved.trim();

        if (
                email.startsWith("\"")
                        && email.endsWith("\"")
                        && email.length() >= 2
        ) {
            email =
                    email.substring(
                            1,
                            email.length() - 1
                    );
        }

        return email.isBlank()
                ? null
                : email;
    }

    private String normalizeIdentifier(
            String value
    ) {
        String identifier =
                value == null
                        ? ""
                        : value.trim();

        if (identifier.isBlank()) {
            throw new InvalidLoginException();
        }

        if (identifier.length() > 254) {
            throw new InvalidLoginException();
        }

        return identifier;
    }

    private String normalizePassword(
            String value
    ) {
        String password =
                value == null
                        ? ""
                        : value;

        if (password.isBlank()) {
            throw new InvalidLoginException();
        }

        return password;
    }

    private String normalizeBaseUrl(
            String value
    ) {
        String url =
                value.trim();

        while (url.endsWith("/")) {
            url =
                    url.substring(
                            0,
                            url.length() - 1
                    );
        }

        return url;
    }

    public record LoginResult(
            String accessToken,
            String refreshToken,
            Long expiresIn,
            String tokenType
    ) {
    }

    private record SupabaseTokenResponse(
            @JsonProperty("access_token")
            String accessToken,

            @JsonProperty("refresh_token")
            String refreshToken,

            @JsonProperty("expires_in")
            Long expiresIn,

            @JsonProperty("token_type")
            String tokenType
    ) {
    }

    public static class InvalidLoginException
            extends RuntimeException {

        public InvalidLoginException() {
            super(
                    "Invalid username/email or password."
            );
        }
    }
}