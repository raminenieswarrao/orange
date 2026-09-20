package com.orange.app.mail;

import com.orange.app.config.OrangeMailProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Component
public class SettlementNotificationEmailTemplate {

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern(
                    "MMM d, yyyy",
                    Locale.US
            );

    private final OrangeMailProperties properties;

    public SettlementNotificationEmailTemplate(
            OrangeMailProperties properties
    ) {
        this.properties = properties;
    }

    public Message build(
            Action action,
            String recipientId,
            String recipientName,
            String actorName,
            String groupName,
            String payerId,
            String payerName,
            String receiverId,
            String receiverName,
            BigDecimal amount,
            String currency,
            OffsetDateTime settledAt,
            String notes
    ) {
        String recipient =
                defaultText(
                        recipientName,
                        "there"
                );

        String actor =
                defaultText(
                        actorName,
                        "Someone"
                );

        String group =
                defaultText(
                        groupName,
                        "your group"
                );

        String payer =
                defaultText(
                        payerName,
                        "Someone"
                );

        String receiver =
                defaultText(
                        receiverName,
                        "Someone"
                );

        String currencyCode =
                defaultText(
                        currency,
                        "USD"
                ).toUpperCase(Locale.ROOT);

        String formattedAmount =
                formatAmount(
                        amount,
                        currencyCode
                );

        String formattedDate =
                settledAt == null
                        ? ""
                        : DATE_FORMATTER.format(
                        settledAt
                );

        boolean recipientIsPayer =
                recipientId != null
                        && recipientId.equals(
                        payerId
                );

        boolean recipientIsReceiver =
                recipientId != null
                        && recipientId.equals(
                        receiverId
                );

        String subject =
                buildSubject(
                        action,
                        group
                );

        String headline =
                switch (action) {
                    case PAYMENT_RECORDED ->
                            "Payment recorded";

                    case PAYMENT_DELETED ->
                            "Payment deleted";
                };

        String statusBadge =
                buildStatusBadge(
                        action
                );

        String actionText =
                buildActionText(
                        action,
                        actor,
                        payer,
                        receiver,
                        group,
                        recipientIsPayer,
                        recipientIsReceiver
                );

        String relationshipLabel =
                buildRelationshipLabel(
                        recipientIsPayer,
                        recipientIsReceiver
                );

        String noteSection =
                buildNotesSection(
                        notes
                );

        String buttonSection =
                buildButtonSection();

        String html = """
                <!doctype html>
                <html lang="en">

                <head>
                    <meta charset="UTF-8">
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1.0"
                    >
                    <title>Orange</title>
                </head>

                <body style="
                    margin:0;
                    padding:0;
                    background:#fff7f0;
                    font-family:
                        -apple-system,
                        BlinkMacSystemFont,
                        'Segoe UI',
                        Roboto,
                        Helvetica,
                        Arial,
                        sans-serif;
                    color:#382218;
                ">

                <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                        width:100%;
                        background:#fff7f0;
                        padding:28px 12px;
                    "
                >
                    <tr>
                        <td align="center">

                            <table
                                role="presentation"
                                width="100%"
                                cellspacing="0"
                                cellpadding="0"
                                border="0"
                                style="
                                    width:100%;
                                    max-width:580px;
                                    background:#ffffff;
                                    border-radius:30px;
                                    overflow:hidden;
                                    border:
                                        1px solid
                                        rgba(244,123,32,0.10);
                                    box-shadow:
                                        0 18px 55px
                                        rgba(105,53,12,0.11);
                                "
                            >

                                <tr>
                                    <td
                                        align="center"
                                        style="
                                            padding:
                                                34px
                                                28px
                                                28px;
                                            background:
                                                linear-gradient(
                                                    145deg,
                                                    #fff1e3 0%,
                                                    #fffaf6 55%,
                                                    #ffffff 100%
                                                );
                                        "
                                    >

                                        <div style="
                                            width:76px;
                                            height:76px;
                                            margin:
                                                0 auto
                                                14px;
                                            border-radius:50%;
                                            background:
                                                linear-gradient(
                                                    145deg,
                                                    #ffad42,
                                                    #f36b13
                                                );
                                            box-shadow:
                                                0 13px 28px
                                                rgba(
                                                    243,
                                                    107,
                                                    19,
                                                    0.28
                                                );
                                            border:
                                                4px solid
                                                rgba(
                                                    255,
                                                    255,
                                                    255,
                                                    0.85
                                                );
                                            font-size:38px;
                                            line-height:76px;
                                            text-align:center;
                                        ">
                                            🍊
                                        </div>

                                        <div style="
                                            font-size:14px;
                                            letter-spacing:0.14em;
                                            text-transform:uppercase;
                                            font-weight:900;
                                            color:#ef7218;
                                            margin-bottom:14px;
                                        ">
                                            ORANGE
                                        </div>

                                        {{STATUS_BADGE}}

                                        <h1 style="
                                            margin:
                                                14px
                                                0
                                                0;
                                            font-size:28px;
                                            line-height:1.22;
                                            color:#382218;
                                            font-weight:900;
                                        ">
                                            {{HEADLINE}}
                                        </h1>

                                    </td>
                                </tr>

                                <tr>
                                    <td style="
                                        padding:
                                            8px
                                            30px
                                            36px;
                                    ">

                                        <p style="
                                            margin:
                                                20px
                                                0
                                                8px;
                                            font-size:17px;
                                            line-height:1.6;
                                            font-weight:700;
                                            color:#382218;
                                        ">
                                            Hi {{RECIPIENT}},
                                        </p>

                                        <p style="
                                            margin:
                                                0
                                                0
                                                24px;
                                            font-size:16px;
                                            line-height:1.65;
                                            color:#6a5042;
                                        ">
                                            {{ACTION_TEXT}}
                                        </p>

                                        <table
                                            role="presentation"
                                            width="100%"
                                            cellspacing="0"
                                            cellpadding="0"
                                            border="0"
                                            style="
                                                width:100%;
                                                background:#fff8f2;
                                                border:
                                                    1px solid
                                                    rgba(
                                                        244,
                                                        123,
                                                        32,
                                                        0.18
                                                    );
                                                border-radius:22px;
                                            "
                                        >
                                            <tr>
                                                <td style="
                                                    padding:24px;
                                                ">

                                                    <div style="
                                                        font-size:11px;
                                                        line-height:1.4;
                                                        letter-spacing:0.11em;
                                                        text-transform:uppercase;
                                                        color:#a47c66;
                                                        font-weight:900;
                                                        margin-bottom:8px;
                                                    ">
                                                        Payment
                                                    </div>

                                                    <div style="
                                                        color:#f36b13;
                                                        font-size:36px;
                                                        line-height:1.15;
                                                        font-weight:950;
                                                        margin-bottom:24px;
                                                    ">
                                                        {{AMOUNT}}
                                                    </div>

                                                    <table
                                                        role="presentation"
                                                        width="100%"
                                                        cellspacing="0"
                                                        cellpadding="0"
                                                        border="0"
                                                    >

                                                        <tr>
                                                            <td style="
                                                                color:#967260;
                                                                font-size:13px;
                                                                font-weight:700;
                                                            ">
                                                                Group
                                                            </td>

                                                            <td
                                                                align="right"
                                                                style="
                                                                    color:#382218;
                                                                    font-size:14px;
                                                                    font-weight:850;
                                                                "
                                                            >
                                                                {{GROUP}}
                                                            </td>
                                                        </tr>

                                                        <tr>
                                                            <td
                                                                colspan="2"
                                                                style="height:14px;"
                                                            >
                                                            </td>
                                                        </tr>

                                                        <tr>
                                                            <td style="
                                                                color:#967260;
                                                                font-size:13px;
                                                                font-weight:700;
                                                            ">
                                                                Paid by
                                                            </td>

                                                            <td
                                                                align="right"
                                                                style="
                                                                    color:#382218;
                                                                    font-size:14px;
                                                                    font-weight:850;
                                                                "
                                                            >
                                                                {{PAYER}}
                                                            </td>
                                                        </tr>

                                                        <tr>
                                                            <td
                                                                colspan="2"
                                                                style="height:14px;"
                                                            >
                                                            </td>
                                                        </tr>

                                                        <tr>
                                                            <td style="
                                                                color:#967260;
                                                                font-size:13px;
                                                                font-weight:700;
                                                            ">
                                                                Paid to
                                                            </td>

                                                            <td
                                                                align="right"
                                                                style="
                                                                    color:#382218;
                                                                    font-size:14px;
                                                                    font-weight:850;
                                                                "
                                                            >
                                                                {{RECEIVER}}
                                                            </td>
                                                        </tr>

                                                        {{DATE_ROW}}

                                                    </table>

                                                    <table
                                                        role="presentation"
                                                        width="100%"
                                                        cellspacing="0"
                                                        cellpadding="0"
                                                        border="0"
                                                        style="
                                                            width:100%;
                                                            margin-top:20px;
                                                            background:#ffffff;
                                                            border-radius:16px;
                                                            border:
                                                                1px solid
                                                                rgba(
                                                                    244,
                                                                    123,
                                                                    32,
                                                                    0.14
                                                                );
                                                        "
                                                    >
                                                        <tr>
                                                            <td
                                                                align="center"
                                                                style="
                                                                    padding:
                                                                        14px
                                                                        16px;
                                                                    color:#6f5141;
                                                                    font-size:13px;
                                                                    line-height:1.45;
                                                                    font-weight:800;
                                                                "
                                                            >
                                                                {{RELATIONSHIP_LABEL}}
                                                            </td>
                                                        </tr>
                                                    </table>

                                                </td>
                                            </tr>
                                        </table>

                                        {{NOTE_SECTION}}

                                        {{BUTTON_SECTION}}

                                        <p style="
                                            margin:
                                                28px
                                                0
                                                0;
                                            text-align:center;
                                            font-size:12px;
                                            line-height:1.6;
                                            color:#a28778;
                                        ">
                                            This payment affects balances
                                            inside your Orange group.
                                        </p>

                                    </td>
                                </tr>

                            </table>

                            <div style="
                                margin-top:18px;
                                color:#b19788;
                                font-size:12px;
                                line-height:1.6;
                                text-align:center;
                            ">
                                Orange · Split expenses simply
                            </div>

                        </td>
                    </tr>
                </table>

                </body>
                </html>
                """;

        html =
                html
                        .replace(
                                "{{STATUS_BADGE}}",
                                statusBadge
                        )
                        .replace(
                                "{{HEADLINE}}",
                                escapeHtml(
                                        headline
                                )
                        )
                        .replace(
                                "{{RECIPIENT}}",
                                escapeHtml(
                                        recipient
                                )
                        )
                        .replace(
                                "{{ACTION_TEXT}}",
                                actionText
                        )
                        .replace(
                                "{{AMOUNT}}",
                                escapeHtml(
                                        formattedAmount
                                )
                        )
                        .replace(
                                "{{GROUP}}",
                                escapeHtml(
                                        group
                                )
                        )
                        .replace(
                                "{{PAYER}}",
                                escapeHtml(
                                        payer
                                )
                        )
                        .replace(
                                "{{RECEIVER}}",
                                escapeHtml(
                                        receiver
                                )
                        )
                        .replace(
                                "{{DATE_ROW}}",
                                buildDateRow(
                                        formattedDate
                                )
                        )
                        .replace(
                                "{{RELATIONSHIP_LABEL}}",
                                escapeHtml(
                                        relationshipLabel
                                )
                        )
                        .replace(
                                "{{NOTE_SECTION}}",
                                noteSection
                        )
                        .replace(
                                "{{BUTTON_SECTION}}",
                                buttonSection
                        );

        return new Message(
                subject,
                html
        );
    }

    private String buildSubject(
            Action action,
            String groupName
    ) {
        String group =
                sanitizeSubjectText(
                        groupName
                );

        return switch (action) {
            case PAYMENT_RECORDED ->
                    "Orange: Payment recorded in "
                            + group;

            case PAYMENT_DELETED ->
                    "Orange: Payment deleted in "
                            + group;
        };
    }

    private String buildStatusBadge(
            Action action
    ) {
        String label =
                switch (action) {
                    case PAYMENT_RECORDED ->
                            "PAYMENT RECORDED";

                    case PAYMENT_DELETED ->
                            "PAYMENT DELETED";
                };

        String background =
                switch (action) {
                    case PAYMENT_RECORDED ->
                            "#eaf9f1";

                    case PAYMENT_DELETED ->
                            "#fff0ee";
                };

        String color =
                switch (action) {
                    case PAYMENT_RECORDED ->
                            "#17785a";

                    case PAYMENT_DELETED ->
                            "#b63c31";
                };

        String template = """
                <span style="
                    display:inline-block;
                    padding:7px 13px;
                    border-radius:999px;
                    background:{{BACKGROUND}};
                    color:{{COLOR}};
                    font-size:11px;
                    line-height:1;
                    letter-spacing:0.08em;
                    font-weight:900;
                ">
                    {{LABEL}}
                </span>
                """;

        return template
                .replace(
                        "{{BACKGROUND}}",
                        background
                )
                .replace(
                        "{{COLOR}}",
                        color
                )
                .replace(
                        "{{LABEL}}",
                        label
                );
    }

    private String buildActionText(
            Action action,
            String actor,
            String payer,
            String receiver,
            String group,
            boolean recipientIsPayer,
            boolean recipientIsReceiver
    ) {
        String safeActor =
                escapeHtml(actor);

        String safePayer =
                escapeHtml(payer);

        String safeReceiver =
                escapeHtml(receiver);

        String safeGroup =
                escapeHtml(group);

        if (action == Action.PAYMENT_RECORDED) {

            if (recipientIsPayer) {
                return """
                        Your payment to
                        <strong style="color:#382218;">{{RECEIVER}}</strong>
                        was recorded in
                        <strong style="color:#382218;">{{GROUP}}</strong>.
                        """
                        .replace(
                                "{{RECEIVER}}",
                                safeReceiver
                        )
                        .replace(
                                "{{GROUP}}",
                                safeGroup
                        );
            }

            if (recipientIsReceiver) {
                return """
                        You received a payment from
                        <strong style="color:#382218;">{{PAYER}}</strong>
                        in
                        <strong style="color:#382218;">{{GROUP}}</strong>.
                        """
                        .replace(
                                "{{PAYER}}",
                                safePayer
                        )
                        .replace(
                                "{{GROUP}}",
                                safeGroup
                        );
            }

            return """
                    <strong style="color:#382218;">{{ACTOR}}</strong>
                    recorded a payment from
                    <strong style="color:#382218;">{{PAYER}}</strong>
                    to
                    <strong style="color:#382218;">{{RECEIVER}}</strong>
                    in
                    <strong style="color:#382218;">{{GROUP}}</strong>.
                    """
                    .replace(
                            "{{ACTOR}}",
                            safeActor
                    )
                    .replace(
                            "{{PAYER}}",
                            safePayer
                    )
                    .replace(
                            "{{RECEIVER}}",
                            safeReceiver
                    )
                    .replace(
                            "{{GROUP}}",
                            safeGroup
                    );
        }

        if (recipientIsPayer) {
            return """
                    Your payment to
                    <strong style="color:#382218;">{{RECEIVER}}</strong>
                    was removed from
                    <strong style="color:#382218;">{{GROUP}}</strong>.
                    """
                    .replace(
                            "{{RECEIVER}}",
                            safeReceiver
                    )
                    .replace(
                            "{{GROUP}}",
                            safeGroup
                    );
        }

        if (recipientIsReceiver) {
            return """
                    A payment you received from
                    <strong style="color:#382218;">{{PAYER}}</strong>
                    was removed from
                    <strong style="color:#382218;">{{GROUP}}</strong>.
                    """
                    .replace(
                            "{{PAYER}}",
                            safePayer
                    )
                    .replace(
                            "{{GROUP}}",
                            safeGroup
                    );
        }

        return """
                <strong style="color:#382218;">{{ACTOR}}</strong>
                removed a payment from
                <strong style="color:#382218;">{{PAYER}}</strong>
                to
                <strong style="color:#382218;">{{RECEIVER}}</strong>
                in
                <strong style="color:#382218;">{{GROUP}}</strong>.
                """
                .replace(
                        "{{ACTOR}}",
                        safeActor
                )
                .replace(
                        "{{PAYER}}",
                        safePayer
                )
                .replace(
                        "{{RECEIVER}}",
                        safeReceiver
                )
                .replace(
                        "{{GROUP}}",
                        safeGroup
                );
    }

    private String buildRelationshipLabel(
            boolean recipientIsPayer,
            boolean recipientIsReceiver
    ) {
        if (recipientIsPayer) {
            return "You made this payment.";
        }

        if (recipientIsReceiver) {
            return "You received this payment.";
        }

        return "You are involved in this payment.";
    }

    private String buildDateRow(
            String formattedDate
    ) {
        if (formattedDate == null
                || formattedDate.isBlank()) {
            return "";
        }

        return """
                <tr>
                    <td
                        colspan="2"
                        style="height:14px;"
                    >
                    </td>
                </tr>

                <tr>
                    <td style="
                        color:#967260;
                        font-size:13px;
                        font-weight:700;
                    ">
                        Date
                    </td>

                    <td
                        align="right"
                        style="
                            color:#382218;
                            font-size:14px;
                            font-weight:850;
                        "
                    >
                        {{DATE}}
                    </td>
                </tr>
                """
                .replace(
                        "{{DATE}}",
                        escapeHtml(
                                formattedDate
                        )
                );
    }

    private String buildNotesSection(
            String notes
    ) {
        if (notes == null
                || notes.isBlank()) {
            return "";
        }

        String safeNotes =
                escapeHtml(
                        notes.trim()
                )
                        .replace(
                                "\r\n",
                                "<br>"
                        )
                        .replace(
                                "\n",
                                "<br>"
                        );

        return """
                <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                        width:100%;
                        margin-top:24px;
                        background:#fffaf6;
                        border-radius:18px;
                        border:
                            1px solid
                            rgba(
                                87,
                                53,
                                34,
                                0.08
                            );
                    "
                >
                    <tr>
                        <td style="
                            padding:
                                16px
                                18px;
                        ">

                            <div style="
                                color:#967260;
                                font-size:11px;
                                letter-spacing:0.09em;
                                text-transform:uppercase;
                                font-weight:900;
                                margin-bottom:6px;
                            ">
                                Note
                            </div>

                            <div style="
                                color:#4b3327;
                                font-size:14px;
                                line-height:1.55;
                            ">
                                {{NOTES}}
                            </div>

                        </td>
                    </tr>
                </table>
                """
                .replace(
                        "{{NOTES}}",
                        safeNotes
                );
    }

    private String buildButtonSection() {
        String appUrl =
                properties.appUrl();

        if (appUrl == null
                || appUrl.isBlank()) {
            return "";
        }

        String safeUrl =
                escapeHtml(
                        appUrl.trim()
                );

        return """
                <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                        width:100%;
                        margin-top:28px;
                    "
                >
                    <tr>
                        <td align="center">

                            <a
                                href="{{URL}}"
                                style="
                                    display:inline-block;
                                    min-width:170px;
                                    padding:
                                        15px
                                        28px;
                                    border-radius:999px;
                                    background:
                                        linear-gradient(
                                            135deg,
                                            #ff982e,
                                            #f36b13
                                        );
                                    color:#ffffff;
                                    text-decoration:none;
                                    text-align:center;
                                    font-size:15px;
                                    line-height:1.2;
                                    font-weight:900;
                                    box-shadow:
                                        0 11px 25px
                                        rgba(
                                            243,
                                            107,
                                            19,
                                            0.25
                                        );
                                "
                            >
                                Open Orange
                            </a>

                        </td>
                    </tr>
                </table>
                """
                .replace(
                        "{{URL}}",
                        safeUrl
                );
    }

    private String formatAmount(
            BigDecimal amount,
            String currency
    ) {
        BigDecimal normalized =
                amount == null
                        ? BigDecimal.ZERO
                        : amount.setScale(
                        2,
                        RoundingMode.HALF_UP
                );

        String value =
                normalized.toPlainString();

        return switch (
                defaultText(
                        currency,
                        "USD"
                ).toUpperCase(Locale.ROOT)
                ) {
            case "USD" ->
                    "$" + value;

            case "INR" ->
                    "₹" + value;

            case "EUR" ->
                    "€" + value;

            case "GBP" ->
                    "£" + value;

            case "JPY" ->
                    "¥" + value;

            case "CAD" ->
                    "CA$" + value;

            case "AUD" ->
                    "A$" + value;

            default ->
                    currency
                            .toUpperCase(
                                    Locale.ROOT
                            )
                            + " "
                            + value;
        };
    }

    private String defaultText(
            String value,
            String fallback
    ) {
        if (value == null
                || value.isBlank()) {
            return fallback;
        }

        return value.trim();
    }

    private String sanitizeSubjectText(
            String value
    ) {
        if (value == null) {
            return "";
        }

        return value
                .replace("\r", " ")
                .replace("\n", " ")
                .trim();
    }

    private String escapeHtml(
            String value
    ) {
        if (value == null) {
            return "";
        }

        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    public enum Action {
        PAYMENT_RECORDED,
        PAYMENT_DELETED
    }

    public record Message(
            String subject,
            String html
    ) {
    }
}