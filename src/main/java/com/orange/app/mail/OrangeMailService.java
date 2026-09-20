package com.orange.app.mail;

import com.orange.app.config.OrangeMailProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
public class OrangeMailService {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(
                    OrangeMailService.class
            );

    private static final int MAX_ERROR_LENGTH = 1800;

    private final JavaMailSender mailSender;
    private final OrangeMailProperties properties;

    public OrangeMailService(
            JavaMailSender mailSender,
            OrangeMailProperties properties
    ) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    public void sendHtmlEmail(
            String recipient,
            String subject,
            String html
    ) {
        if (!properties.enabled()) {
            return;
        }

        if (recipient == null || recipient.isBlank()) {
            throw new IllegalArgumentException(
                    "Email recipient is required."
            );
        }

        if (subject == null || subject.isBlank()) {
            throw new IllegalArgumentException(
                    "Email subject is required."
            );
        }

        if (html == null || html.isBlank()) {
            throw new IllegalArgumentException(
                    "Email body is required."
            );
        }

        try {
            MimeMessage message =
                    mailSender.createMimeMessage();

            MimeMessageHelper helper =
                    new MimeMessageHelper(
                            message,
                            false,
                            StandardCharsets.UTF_8.name()
                    );

            helper.setFrom(
                    properties.fromAddress(),
                    properties.fromName()
            );

            helper.setTo(recipient);
            helper.setSubject(subject);
            helper.setText(
                    html,
                    true
            );

            mailSender.send(message);

        } catch (MessagingException exception) {
            handleSendFailure(
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

    private void handleSendFailure(
            String recipient,
            Exception exception
    ) {
        LOGGER.error(
                "Orange email delivery failed for recipient {}.",
                recipient,
                exception
        );

        throw new IllegalStateException(
                buildDetailedErrorMessage(
                        exception
                ),
                exception
        );
    }

    private String buildDetailedErrorMessage(
            Throwable throwable
    ) {
        StringBuilder details =
                new StringBuilder(
                        "Unable to send Orange email"
                );

        Throwable current =
                throwable;

        int depth = 0;

        while (
                current != null
                        && depth < 8
        ) {
            String type =
                    current.getClass()
                            .getSimpleName();

            String message =
                    current.getMessage();

            if (depth == 0) {
                details.append(": ");
            } else {
                details.append(" -> ");
            }

            details.append(type);

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

        String result =
                details.toString();

        if (
                result.length()
                        > MAX_ERROR_LENGTH
        ) {
            return result.substring(
                    0,
                    MAX_ERROR_LENGTH
            );
        }

        return result;
    }

    private String sanitizeMessage(
            String message
    ) {
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
}