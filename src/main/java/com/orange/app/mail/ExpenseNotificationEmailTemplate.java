package com.orange.app.mail;

import com.orange.app.config.OrangeMailProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Component
public class ExpenseNotificationEmailTemplate {

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern(
                    "MMM d, yyyy",
                    Locale.US
            );

    private final OrangeMailProperties properties;

    public ExpenseNotificationEmailTemplate(
            OrangeMailProperties properties
    ) {
        this.properties = properties;
    }

    /*
     * Temporary compatibility overload.
     *
     * This keeps the current outbox processor compiling
     * until we update it in the next step.
     */
    public Message build(
            Action action,
            String recipientName,
            String actorName,
            String groupName,
            String description,
            BigDecimal totalAmount,
            String currency,
            BigDecimal recipientShare
    ) {
        return build(
                action,
                recipientName,
                null,
                actorName,
                groupName,
                description,
                totalAmount,
                currency,
                recipientShare,
                null,
                null,
                null,
                null,
                null,
                List.of()
        );
    }

    public Message build(
            Action action,
            String recipientName,
            String recipientId,
            String actorName,
            String groupName,
            String description,
            BigDecimal totalAmount,
            String currency,
            BigDecimal recipientShare,
            String payerId,
            String payerName,
            String splitMethod,
            LocalDate expenseDate,
            String notes,
            List<SplitParticipant> splitSnapshot
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

        String expenseDescription =
                defaultText(
                        description,
                        "Expense"
                );

        String currencyCode =
                defaultText(
                        currency,
                        "USD"
                ).toUpperCase(Locale.ROOT);

        List<SplitParticipant> participants =
                splitSnapshot == null
                        ? List.of()
                        : splitSnapshot;

        String safeRecipient =
                escapeHtml(recipient);

        String safeActor =
                escapeHtml(actor);

        String safeGroup =
                escapeHtml(group);

        String safeDescription =
                escapeHtml(expenseDescription);

        String safePayer =
                escapeHtml(
                        defaultText(
                                payerName,
                                "Someone"
                        )
                );

        String amount =
                formatAmount(
                        totalAmount,
                        currencyCode
                );

        String share =
                recipientShare == null
                        ? null
                        : formatAmount(
                        recipientShare,
                        currencyCode
                );

        String subject =
                buildSubject(
                        action,
                        group
                );

        String headline =
                buildHeadline(action);

        String actionText =
                buildActionText(
                        action,
                        safeActor,
                        safeGroup
                );

        String statusBadge =
                buildStatusBadge(action);

        String yourShareSection =
                buildYourShareSection(
                        action,
                        share
                );

        String detailsSection =
                buildDetailsSection(
                        safePayer,
                        splitMethod,
                        expenseDate
                );

        String splitSection =
                buildSplitSection(
                        action,
                        participants,
                        recipientId,
                        payerId,
                        currencyCode,
                        splitMethod
                );

        String notesSection =
                buildNotesSection(notes);

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
                    width="100%%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                        width:100%%;
                        background:#fff7f0;
                        padding:28px 12px;
                    "
                >
                    <tr>
                        <td align="center">

                            <table
                                role="presentation"
                                width="100%%"
                                cellspacing="0"
                                cellpadding="0"
                                border="0"
                                style="
                                    width:100%%;
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

                                <!-- HEADER -->
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
                                                    #fff1e3 0%%,
                                                    #fffaf6 55%%,
                                                    #ffffff 100%%
                                                );
                                        "
                                    >

                                        <!-- ORANGE FRUIT -->
                                        <table
                                            role="presentation"
                                            cellspacing="0"
                                            cellpadding="0"
                                            border="0"
                                            style="
                                                margin:
                                                    0 auto
                                                    14px;
                                            "
                                        >
                                            <tr>
                                                <td align="center">

                                                    <div style="
                                                        width:76px;
                                                        height:76px;
                                                        border-radius:50%%;
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

                                                </td>
                                            </tr>
                                        </table>

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

                                        %s

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
                                            %s
                                        </h1>

                                    </td>
                                </tr>


                                <!-- BODY -->
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
                                            Hi %s,
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
                                            %s
                                        </p>


                                        <!-- EXPENSE CARD -->
                                        <table
                                            role="presentation"
                                            width="100%%"
                                            cellspacing="0"
                                            cellpadding="0"
                                            border="0"
                                            style="
                                                width:100%%;
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
                                                        margin-bottom:6px;
                                                    ">
                                                        Expense
                                                    </div>

                                                    <div style="
                                                        color:#382218;
                                                        font-size:22px;
                                                        line-height:1.3;
                                                        font-weight:900;
                                                        margin-bottom:8px;
                                                    ">
                                                        %s
                                                    </div>

                                                    <div style="
                                                        color:#f36b13;
                                                        font-size:34px;
                                                        line-height:1.15;
                                                        font-weight:950;
                                                        margin-bottom:22px;
                                                    ">
                                                        %s
                                                    </div>

                                                    <table
                                                        role="presentation"
                                                        width="100%%"
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
                                                                %s
                                                            </td>
                                                        </tr>
                                                    </table>

                                                    %s

                                                    %s

                                                </td>
                                            </tr>
                                        </table>


                                        %s

                                        %s

                                        %s


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
                                            You received this email because
                                            you are involved in this Orange
                                            expense.
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
                """.formatted(
                statusBadge,
                headline,
                safeRecipient,
                actionText,
                safeDescription,
                amount,
                safeGroup,
                yourShareSection,
                detailsSection,
                splitSection,
                notesSection,
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
        String safeGroup =
                sanitizeSubjectText(
                        groupName
                );

        return switch (action) {
            case ADDED ->
                    "Orange: New split added in "
                            + safeGroup;

            case UPDATED ->
                    "Orange: Split updated in "
                            + safeGroup;

            case DELETED ->
                    "Orange: Split deleted in "
                            + safeGroup;
        };
    }

    private String buildHeadline(
            Action action
    ) {
        return switch (action) {
            case ADDED ->
                    "New split added";

            case UPDATED ->
                    "Split updated";

            case DELETED ->
                    "Split deleted";
        };
    }

    private String buildActionText(
            Action action,
            String actor,
            String group
    ) {
        return switch (action) {
            case ADDED ->
                    "<strong style=\"color:#382218;\">"
                            + actor
                            + "</strong>"
                            + " added a new split in "
                            + "<strong style=\"color:#382218;\">"
                            + group
                            + "</strong>.";

            case UPDATED ->
                    "<strong style=\"color:#382218;\">"
                            + actor
                            + "</strong>"
                            + " updated a split in "
                            + "<strong style=\"color:#382218;\">"
                            + group
                            + "</strong>.";

            case DELETED ->
                    "<strong style=\"color:#382218;\">"
                            + actor
                            + "</strong>"
                            + " deleted a split from "
                            + "<strong style=\"color:#382218;\">"
                            + group
                            + "</strong>.";
        };
    }

    private String buildStatusBadge(
            Action action
    ) {
        String label =
                switch (action) {
                    case ADDED -> "ADDED";
                    case UPDATED -> "UPDATED";
                    case DELETED -> "DELETED";
                };

        String background =
                switch (action) {
                    case ADDED -> "#eef9ef";
                    case UPDATED -> "#fff1df";
                    case DELETED -> "#fff0ee";
                };

        String color =
                switch (action) {
                    case ADDED -> "#287a38";
                    case UPDATED -> "#d86411";
                    case DELETED -> "#b63c31";
                };

        return """
                <span style="
                    display:inline-block;
                    padding:7px 13px;
                    border-radius:999px;
                    background:%s;
                    color:%s;
                    font-size:11px;
                    line-height:1;
                    letter-spacing:0.10em;
                    font-weight:900;
                ">
                    %s
                </span>
                """.formatted(
                background,
                color,
                label
        );
    }

    private String buildYourShareSection(
            Action action,
            String share
    ) {
        if (share == null) {
            return "";
        }

        String label =
                action == Action.DELETED
                        ? "Your previous share"
                        : "Your share";

        return """
                <table
                    role="presentation"
                    width="100%%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                        width:100%%;
                        margin-top:18px;
                        background:#ffffff;
                        border-radius:16px;
                        border:
                            1px solid
                            rgba(
                                244,
                                123,
                                32,
                                0.16
                            );
                    "
                >
                    <tr>
                        <td style="
                            padding:
                                15px
                                16px;
                        ">

                            <table
                                role="presentation"
                                width="100%%"
                                cellspacing="0"
                                cellpadding="0"
                                border="0"
                            >
                                <tr>
                                    <td style="
                                        color:#92705e;
                                        font-size:13px;
                                        font-weight:800;
                                    ">
                                        %s
                                    </td>

                                    <td
                                        align="right"
                                        style="
                                            color:#f36b13;
                                            font-size:20px;
                                            font-weight:950;
                                        "
                                    >
                                        %s
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>
                </table>
                """.formatted(
                label,
                share
        );
    }

    private String buildDetailsSection(
            String payerName,
            String splitMethod,
            LocalDate expenseDate
    ) {
        String splitLabel =
                formatSplitMethod(
                        splitMethod
                );

        String dateLabel =
                expenseDate == null
                        ? null
                        : DATE_FORMATTER.format(
                        expenseDate
                );

        return """
                <table
                    role="presentation"
                    width="100%%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                        width:100%%;
                        margin-top:20px;
                        border-top:
                            1px solid
                            rgba(87,53,34,0.09);
                    "
                >
                    <tr>
                        <td style="
                            padding-top:15px;
                            color:#967260;
                            font-size:13px;
                            font-weight:700;
                        ">
                            Paid by
                        </td>

                        <td
                            align="right"
                            style="
                                padding-top:15px;
                                color:#382218;
                                font-size:14px;
                                font-weight:850;
                            "
                        >
                            %s
                        </td>
                    </tr>

                    <tr>
                        <td style="
                            padding-top:12px;
                            color:#967260;
                            font-size:13px;
                            font-weight:700;
                        ">
                            Split
                        </td>

                        <td
                            align="right"
                            style="
                                padding-top:12px;
                                color:#382218;
                                font-size:14px;
                                font-weight:850;
                            "
                        >
                            %s
                        </td>
                    </tr>

                    %s

                </table>
                """.formatted(
                payerName,
                escapeHtml(splitLabel),
                buildDateRow(dateLabel)
        );
    }

    private String buildDateRow(
            String dateLabel
    ) {
        if (dateLabel == null
                || dateLabel.isBlank()) {
            return "";
        }

        return """
                <tr>
                    <td style="
                        padding-top:12px;
                        color:#967260;
                        font-size:13px;
                        font-weight:700;
                    ">
                        Date
                    </td>

                    <td
                        align="right"
                        style="
                            padding-top:12px;
                            color:#382218;
                            font-size:14px;
                            font-weight:850;
                        "
                    >
                        %s
                    </td>
                </tr>
                """.formatted(
                escapeHtml(dateLabel)
        );
    }

    private String buildSplitSection(
            Action action,
            List<SplitParticipant> participants,
            String recipientId,
            String payerId,
            String currency,
            String splitMethod
    ) {
        if (participants == null
                || participants.isEmpty()) {
            return "";
        }

        String title =
                action == Action.DELETED
                        ? "Split before deletion"
                        : "Split between "
                        + participants.size()
                        + (
                        participants.size() == 1
                                ? " person"
                                : " people"
                );

        StringBuilder rows =
                new StringBuilder();

        for (
                SplitParticipant participant
                : participants
        ) {
            rows.append(
                    buildParticipantRow(
                            participant,
                            recipientId,
                            payerId,
                            currency,
                            splitMethod
                    )
            );
        }

        return """
                <table
                    role="presentation"
                    width="100%%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                        width:100%%;
                        margin-top:26px;
                    "
                >
                    <tr>
                        <td style="
                            padding-bottom:11px;
                            color:#382218;
                            font-size:16px;
                            font-weight:900;
                        ">
                            %s
                        </td>
                    </tr>

                    <tr>
                        <td>

                            <table
                                role="presentation"
                                width="100%%"
                                cellspacing="0"
                                cellpadding="0"
                                border="0"
                                style="
                                    width:100%%;
                                    background:#fffaf6;
                                    border:
                                        1px solid
                                        rgba(
                                            87,
                                            53,
                                            34,
                                            0.08
                                        );
                                    border-radius:20px;
                                    overflow:hidden;
                                "
                            >
                                %s
                            </table>

                        </td>
                    </tr>
                </table>
                """.formatted(
                escapeHtml(title),
                rows
        );
    }

    private String buildParticipantRow(
            SplitParticipant participant,
            String recipientId,
            String payerId,
            String currency,
            String splitMethod
    ) {
        String participantName =
                defaultText(
                        participant.name(),
                        "Participant"
                );

        boolean isRecipient =
                recipientId != null
                        && recipientId.equals(
                        participant.userId()
                );

        boolean isPayer =
                payerId != null
                        && payerId.equals(
                        participant.userId()
                );

        String background =
                isRecipient
                        ? "#fff1df"
                        : "#fffaf6";

        String name =
                escapeHtml(
                        participantName
                );

        String initials =
                escapeHtml(
                        initials(
                                participantName
                        )
                );

        String amount =
                formatAmount(
                        participant.amount(),
                        currency
                );

        String badges =
                buildParticipantBadges(
                        isRecipient,
                        isPayer
                );

        String splitDetail =
                buildParticipantSplitDetail(
                        splitMethod,
                        participant.splitValue()
                );

        return """
                <tr>
                    <td style="
                        padding:
                            14px
                            15px;
                        background:%s;
                        border-bottom:
                            1px solid
                            rgba(
                                87,
                                53,
                                34,
                                0.07
                            );
                    ">

                        <table
                            role="presentation"
                            width="100%%"
                            cellspacing="0"
                            cellpadding="0"
                            border="0"
                        >
                            <tr>

                                <td
                                    width="42"
                                    valign="middle"
                                >
                                    <div style="
                                        width:34px;
                                        height:34px;
                                        border-radius:50%%;
                                        background:#ffe1c3;
                                        color:#d96512;
                                        font-size:12px;
                                        line-height:34px;
                                        font-weight:900;
                                        text-align:center;
                                    ">
                                        %s
                                    </div>
                                </td>

                                <td
                                    valign="middle"
                                    style="
                                        padding-right:8px;
                                    "
                                >

                                    <div style="
                                        color:#382218;
                                        font-size:14px;
                                        line-height:1.35;
                                        font-weight:850;
                                    ">
                                        %s
                                        %s
                                    </div>

                                    %s

                                </td>

                                <td
                                    align="right"
                                    valign="middle"
                                    style="
                                        white-space:nowrap;
                                        color:#382218;
                                        font-size:15px;
                                        font-weight:900;
                                    "
                                >
                                    %s
                                </td>

                            </tr>
                        </table>

                    </td>
                </tr>
                """.formatted(
                background,
                initials,
                name,
                badges,
                splitDetail,
                amount
        );
    }

    private String buildParticipantBadges(
            boolean isRecipient,
            boolean isPayer
    ) {
        StringBuilder result =
                new StringBuilder();

        if (isRecipient) {
            result.append(
                    """
                     <span style="
                         display:inline-block;
                         margin-left:5px;
                         padding:3px 6px;
                         border-radius:999px;
                         background:#f36b13;
                         color:#ffffff;
                         font-size:9px;
                         line-height:1;
                         letter-spacing:0.06em;
                         font-weight:900;
                         vertical-align:middle;
                     ">
                         YOU
                     </span>
                    """
            );
        }

        if (isPayer) {
            result.append(
                    """
                     <span style="
                         display:inline-block;
                         margin-left:5px;
                         padding:3px 6px;
                         border-radius:999px;
                         background:#fff0cf;
                         color:#9b6715;
                         font-size:9px;
                         line-height:1;
                         letter-spacing:0.06em;
                         font-weight:900;
                         vertical-align:middle;
                     ">
                         PAID
                     </span>
                    """
            );
        }

        return result.toString();
    }

    private String buildParticipantSplitDetail(
            String splitMethod,
            BigDecimal splitValue
    ) {
        if (splitValue == null
                || splitMethod == null) {
            return "";
        }

        if (!"PERCENTAGE".equalsIgnoreCase(
                splitMethod
        )) {
            return "";
        }

        String value =
                stripTrailingZeros(
                        splitValue
                );

        return """
                <div style="
                    margin-top:3px;
                    color:#a17f6e;
                    font-size:11px;
                    line-height:1.3;
                    font-weight:700;
                ">
                    %s%%
                </div>
                """.formatted(value);
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
                    width="100%%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                        width:100%%;
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
                                %s
                            </div>

                        </td>
                    </tr>
                </table>
                """.formatted(
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
                    width="100%%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                        width:100%%;
                        margin-top:28px;
                    "
                >
                    <tr>
                        <td align="center">

                            <a
                                href="%s"
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
                """.formatted(
                safeUrl
        );
    }

    private String formatSplitMethod(
            String splitMethod
    ) {
        if (splitMethod == null
                || splitMethod.isBlank()) {
            return "Split";
        }

        return switch (
                splitMethod
                        .trim()
                        .toUpperCase(Locale.ROOT)
                ) {
            case "EQUAL" ->
                    "Equal split";

            case "CUSTOM" ->
                    "Exact amounts";

            case "PERCENTAGE" ->
                    "Percentage split";

            default ->
                    splitMethod.trim();
        };
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
                            .toUpperCase(Locale.ROOT)
                            + " "
                            + value;
        };
    }

    private String stripTrailingZeros(
            BigDecimal value
    ) {
        if (value == null) {
            return "";
        }

        return value
                .stripTrailingZeros()
                .toPlainString();
    }

    private String initials(
            String name
    ) {
        String normalized =
                defaultText(
                        name,
                        "?"
                ).trim();

        String[] words =
                normalized.split("\\s+");

        if (words.length == 0) {
            return "?";
        }

        if (words.length == 1) {
            return words[0]
                    .substring(
                            0,
                            Math.min(
                                    2,
                                    words[0].length()
                            )
                    )
                    .toUpperCase(Locale.ROOT);
        }

        return (
                words[0].substring(0, 1)
                        + words[
                        words.length - 1
                        ].substring(0, 1)
        ).toUpperCase(Locale.ROOT);
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
        ADDED,
        UPDATED,
        DELETED
    }

    public record SplitParticipant(
            String userId,
            String name,
            BigDecimal amount,
            BigDecimal splitValue
    ) {
    }

    public record Message(
            String subject,
            String html
    ) {
    }
}