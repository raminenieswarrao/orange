package com.orange.app.mail;

import com.orange.app.config.OrangeMailProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
public class OrangeMailService {

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
            helper.setText(html, true);

            mailSender.send(message);

        } catch (MessagingException exception) {
            throw new IllegalStateException(
                    "Unable to send Orange email.",
                    exception
            );
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Unable to send Orange email.",
                    exception
            );
        }
    }
}