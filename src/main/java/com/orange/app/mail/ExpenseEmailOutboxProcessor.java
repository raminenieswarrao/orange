package com.orange.app.mail;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.orange.app.config.OrangeMailProperties;
import com.orange.app.supabase.SupabaseAdminClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Component
public class ExpenseEmailOutboxProcessor {

    private static final int CLAIM_LIMIT = 10;

    private final SupabaseAdminClient supabaseAdminClient;
    private final OrangeMailService mailService;
    private final ExpenseNotificationEmailTemplate emailTemplate;
    private final OrangeMailProperties mailProperties;

    public ExpenseEmailOutboxProcessor(
            SupabaseAdminClient supabaseAdminClient,
            OrangeMailService mailService,
            ExpenseNotificationEmailTemplate emailTemplate,
            OrangeMailProperties mailProperties
    ) {
        this.supabaseAdminClient = supabaseAdminClient;
        this.mailService = mailService;
        this.emailTemplate = emailTemplate;
        this.mailProperties = mailProperties;
    }

    @Scheduled(
            initialDelay = 5000,
            fixedDelay = 10000
    )
    public void processPendingEmails() {
        if (!mailProperties.enabled()) {
            return;
        }

        ExpenseEmailOutboxItem[] claimedItems =
                claimPendingItems();

        if (claimedItems == null
                || claimedItems.length == 0) {
            return;
        }

        Arrays.stream(claimedItems)
                .forEach(this::processItem);
    }

    private ExpenseEmailOutboxItem[] claimPendingItems() {
        return supabaseAdminClient
                .restClient()
                .post()
                .uri("/rpc/claim_expense_email_outbox")
                .body(
                        Map.of(
                                "p_limit",
                                CLAIM_LIMIT
                        )
                )
                .retrieve()
                .body(
                        ExpenseEmailOutboxItem[].class
                );
    }

    private void processItem(
            ExpenseEmailOutboxItem item
    ) {
        try {
            ExpenseNotificationEmailTemplate.Action action =
                    ExpenseNotificationEmailTemplate.Action
                            .valueOf(
                                    item.action()
                            );

            List<
                    ExpenseNotificationEmailTemplate.SplitParticipant
                    > participants =
                    mapParticipants(
                            item.splitSnapshot()
                    );

            ExpenseNotificationEmailTemplate.Message message =
                    emailTemplate.build(
                            action,
                            item.recipientName(),
                            item.recipientId(),
                            item.actorName(),
                            item.groupName(),
                            item.description(),
                            item.totalAmount(),
                            item.currency(),
                            item.recipientShare(),
                            item.payerId(),
                            item.payerName(),
                            item.splitMethod(),
                            item.expenseDate(),
                            item.notes(),
                            participants
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

    private List<
            ExpenseNotificationEmailTemplate.SplitParticipant
            > mapParticipants(
            List<SplitParticipantSnapshot> snapshot
    ) {
        if (snapshot == null
                || snapshot.isEmpty()) {
            return List.of();
        }

        return snapshot
                .stream()
                .map(
                        participant ->
                                new ExpenseNotificationEmailTemplate
                                        .SplitParticipant(
                                        participant.userId(),
                                        participant.name(),
                                        participant.amount(),
                                        participant.splitValue()
                                )
                )
                .toList();
    }

    private void markSent(
            String outboxId
    ) {
        supabaseAdminClient
                .restClient()
                .post()
                .uri(
                        "/rpc/mark_expense_email_sent"
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
                            "/rpc/mark_expense_email_failed"
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
             * the recovery window will eventually
             * make the PROCESSING job claimable again.
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

    private record ExpenseEmailOutboxItem(
            String id,

            String action,

            @JsonProperty("expense_id")
            String expenseId,

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

            @JsonProperty("group_name")
            String groupName,

            String description,

            @JsonProperty("total_amount")
            BigDecimal totalAmount,

            String currency,

            @JsonProperty("recipient_share")
            BigDecimal recipientShare,

            @JsonProperty("payer_id")
            String payerId,

            @JsonProperty("payer_name")
            String payerName,

            @JsonProperty("split_method")
            String splitMethod,

            @JsonProperty("expense_date")
            LocalDate expenseDate,

            String notes,

            @JsonProperty("split_snapshot")
            List<SplitParticipantSnapshot> splitSnapshot
    ) {
    }

    private record SplitParticipantSnapshot(
            @JsonProperty("userId")
            String userId,

            String name,

            BigDecimal amount,

            @JsonProperty("splitValue")
            BigDecimal splitValue
    ) {
    }
}