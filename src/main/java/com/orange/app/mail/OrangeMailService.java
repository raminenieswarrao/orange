package com.orange.app.mail;

import com.orange.app.config.OrangeMailProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Service
public class OrangeMailService {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(
                    OrangeMailService.class
            );

    private static final int MAX_ERROR_LENGTH = 1800;

    private final OrangeMailProperties properties;
    private final RestClient brevoClient;
    private final String brevoApiKey;

    public OrangeMailService(
            OrangeMailProperties properties,
            RestClient.Builder restClientBuilder,
            @Value("${ORANGE_BREVO_API_KEY:}")
            String brevoApiKey
    ) {
        this.properties = properties;

        this.brevoApiKey =
                brevoApiKey == null
                        ? ""
                        : brevoApiKey.trim();

        this.brevoClient =
                restClientBuilder
                        .baseUrl(
                                "https://api.brevo.com/v3"
                        )
                        .build();
    }

    public void sendHtmlEmail(
            String recipient,
            String subject,
            String html
    ) {
        if (!properties.enabled()) {
            return;
        }

        validateRequest(
                recipient,
                subject,
                html
        );

        if (brevoApiKey.isBlank()) {
            throw new IllegalStateException(
                    "ORANGE_BREVO_API_KEY is required."
            );
        }

        Map<String, Object> request =
                Map.of(
                        "sender",
                        Map.of(
                                "name",
                                properties.fromName(),
                                "email",
                                properties.fromAddress()
                        ),
                        "to",
                        List.of(
                                Map.of(
                                        "email",
                                        recipient
                                )
                        ),
                        "subject",
                        subject,
                        "htmlContent",
                        html
                );

        try {
            brevoClient
                    .post()
                    .uri("/smtp/email")
                    .header(
                            "api-key",
                            brevoApiKey
                    )
                    .contentType(
                            MediaType.APPLICATION_JSON
                    )
                    .accept(
                            MediaType.APPLICATION_JSON
                    )
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();

        } catch (
                RestClientResponseException exception
        ) {
            handleBrevoResponseFailure(
                    recipient,
                    exception
            );

        } catch (Exception exception) {
            handleSendFailure(
                    recipient,
                    exception
            );
        }
    }

    private void validateRequest(
            String recipient,
            String subject,
            String html
    ) {
        if (
                recipient == null
                        || recipient.isBlank()
        ) {
            throw new IllegalArgumentException(
                    "Email recipient is required."
            );
        }

        if (
                subject == null
                        || subject.isBlank()
        ) {
            throw new IllegalArgumentException(
                    "Email subject is required."
            );
        }

        if (
                html == null
                        || html.isBlank()
        ) {
            throw new IllegalArgumentException(
                    "Email body is required."
            );
        }

        if (
                properties.fromAddress() == null
                        || properties.fromAddress()
                        .isBlank()
        ) {
            throw new IllegalStateException(
                    "Orange sender email is required."
            );
        }

        if (
                properties.fromName() == null
                        || properties.fromName()
                        .isBlank()
        ) {
            throw new IllegalStateException(
                    "Orange sender name is required."
            );
        }
    }

    private void handleBrevoResponseFailure(
            String recipient,
            RestClientResponseException exception
    ) {
        String responseBody =
                exception
                        .getResponseBodyAsString();

        String message =
                "Brevo email API failed"
                        + " with HTTP "
                        + exception
                        .getStatusCode()
                        .value()
                        + ": "
                        + sanitizeMessage(
                        responseBody
                );

        LOGGER.error(
                "Orange Brevo email delivery failed "
                        + "for recipient {}. {}",
                recipient,
                message,
                exception
        );

        throw new IllegalStateException(
                truncate(
                        message
                ),
                exception
        );
    }

    private void handleSendFailure(
            String recipient,
            Exception exception
    ) {
        LOGGER.error(
                "Orange Brevo email delivery failed "
                        + "for recipient {}.",
                recipient,
                exception
        );

        String message =
                "Unable to send Orange email "
                        + "through Brevo: "
                        + buildDetailedErrorMessage(
                        exception
                );

        throw new IllegalStateException(
                truncate(
                        message
                ),
                exception
        );
    }

    private String buildDetailedErrorMessage(
            Throwable throwable
    ) {
        StringBuilder details =
                new StringBuilder();

        Throwable current =
                throwable;

        int depth = 0;

        while (
                current != null
                        && depth < 8
        ) {
            if (depth > 0) {
                details.append(" -> ");
            }

            details.append(
                    current
                            .getClass()
                            .getSimpleName()
            );

            String message =
                    current.getMessage();

            if (
                    message != null
                            && !message.isBlank()
            ) {
                details.append(": ")
                        .append(
                                sanitizeMessage(
                                        message
                                )
                        );
            }

            Throwable next =
                    current.getCause();

            if (next == current) {
                break;
            }

            current = next;
            depth++;
        }

        return details.toString();
    }

    private String sanitizeMessage(
            String message
    ) {
        if (message == null) {
            return "";
        }

        return message
                .replace(
                        "\r",
                        " "
                )
                .replace(
                        "\n",
                        " "
                )
                .trim();
    }

    private String truncate(
            String value
    ) {
        if (
                value.length()
                        <= MAX_ERROR_LENGTH
        ) {
            return value;
        }

        return value.substring(
                0,
                MAX_ERROR_LENGTH
        );
    }
}