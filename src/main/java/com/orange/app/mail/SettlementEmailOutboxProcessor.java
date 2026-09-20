package com.orange.app.mail;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.orange.app.config.OrangeMailProperties;
import com.orange.app.supabase.SupabaseAdminClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Component
public class SettlementEmailOutboxProcessor {

    private static final int CLAIM_LIMIT = 10;

    private final SupabaseAdminClient supabaseAdminClient;
    private final OrangeMailService mailService;
    private final SettlementNotificationEmailTemplate emailTemplate;
    private final OrangeMailProperties mailProperties;

    public SettlementEmailOutboxProcessor(
            SupabaseAdminClient supabaseAdminClient,
            OrangeMailService mailService,
            SettlementNotificationEmailTemplate emailTemplate,
            OrangeMailProperties mailProperties
    ) {
        this.supabaseAdminClient = supabaseAdminClient;
        this.mailService = mailService;
        this.emailTemplate = emailTemplate;
        this.mailProperties = mailProperties;
    }

    @Scheduled(
            initialDelay = 7000,
            fixedDelay = 10000
    )
    public void processPendingEmails() {
        if (!mailProperties.enabled()) {
            return;
        }

        SettlementEmailOutboxItem[] claimedItems =
                claimPendingItems();

        if (claimedItems == null
                || claimedItems.length == 0) {
            return;
        }

        /*
         * Each payment email is sent independently.
         *
         * A slow SMTP request for one recipient
         * will not block the rest of the batch.
         */
        try (
                ExecutorService executor =
                        Executors
                                .newVirtualThreadPerTaskExecutor()
        ) {
            Arrays.stream(claimedItems)
                    .forEach(
                            item ->
                                    executor.submit(
                                            () ->
                                                    processItem(
                                                            item
                                                    )
                                    )
                    );
        }
    }

    private SettlementEmailOutboxItem[] claimPendingItems() {
        return supabaseAdminClient
                .restClient()
                .post()
                .uri(
                        "/rpc/claim_settlement_email_outbox"
                )
                .body(
                        Map.of(
                                "p_limit",
                                CLAIM_LIMIT
                        )
                )
                .retrieve()
                .body(
                        SettlementEmailOutboxItem[].class
                );
    }

    private void processItem(
            SettlementEmailOutboxItem item
    ) {
        try {
            SettlementNotificationEmailTemplate.Action action =
                    SettlementNotificationEmailTemplate.Action
                            .valueOf(
                                    item.action()
                            );

            SettlementNotificationEmailTemplate.Message message =
                    emailTemplate.build(
                            action,
                            item.recipientId(),
                            item.recipientName(),
                            item.actorName(),
                            item.groupName(),
                            item.payerId(),
                            item.payerName(),
                            item.receiverId(),
                            item.receiverName(),
                            item.amount(),
                            item.currency(),
                            item.settledAt(),
                            item.notes()
                    );

            mailService.sendHtmlEmail(
                    item.recipientEmail(),
                    message.subject(),
                    message.html()
            );

            markSent(
                    item.id()
            );

        } catch (Exception exception) {
            markFailed(
                    item.id(),
                    getErrorMessage(
                            exception
                    )
            );
        }
    }

    private void markSent(
            String outboxId
    ) {
        supabaseAdminClient
                .restClient()
                .post()
                .uri(
                        "/rpc/mark_settlement_email_sent"
                )
                .body(
                        Map.of(
                                "p_outbox_id",
                                outboxId
                        )
                )
                .retrieve()
                .toBodilessEntity();
    }

    private void markFailed(
            String outboxId,
            String errorMessage
    ) {
        try {
            supabaseAdminClient
                    .restClient()
                    .post()
                    .uri(
                            "/rpc/mark_settlement_email_failed"
                    )
                    .body(
                            Map.of(
                                    "p_outbox_id",
                                    outboxId,
                                    "p_error",
                                    errorMessage
                            )
                    )
                    .retrieve()
                    .toBodilessEntity();

        } catch (Exception ignored) {
            /*
             * If failure reporting itself fails,
             * Supabase's recovery timeout will
             * eventually make the PROCESSING row
             * eligible again.
             */
        }
    }

    private String getErrorMessage(
            Exception exception
    ) {
        String message =
                exception.getMessage();

        if (message == null
                || message.isBlank()) {
            return exception
                    .getClass()
                    .getSimpleName();
        }

        return message;
    }

    private record SettlementEmailOutboxItem(
            String id,

            String action,

            @JsonProperty("settlement_id")
            String settlementId,

            @JsonProperty("group_id")
            String groupId,

            @JsonProperty("actor_id")
            String actorId,

            @JsonProperty("actor_name")
            String actorName,

            @JsonProperty("recipient_id")
            String recipientId,

            @JsonProperty("recipient_email")
            String recipientEmail,

            @JsonProperty("recipient_name")
            String recipientName,

            @JsonProperty("payer_id")
            String payerId,

            @JsonProperty("payer_name")
            String payerName,

            @JsonProperty("receiver_id")
            String receiverId,

            @JsonProperty("receiver_name")
            String receiverName,

            @JsonProperty("group_name")
            String groupName,

            BigDecimal amount,

            String currency,

            @JsonProperty("settled_at")
            OffsetDateTime settledAt,

            String notes
    ) {
    }
}