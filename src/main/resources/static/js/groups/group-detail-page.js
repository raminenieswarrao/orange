import {
    loadGroup,
    loadGroupMembers
} from './groups-service.js';

import {
    createGroupManagementMarkup,
    handleGroupManagementChange,
    handleGroupManagementClick,
    handleGroupManagementKeydown,
    handleGroupManagementSubmit,
    initializeGroupManagement,
    resetGroupManagement,
    setGroupManagementContext,
    syncGroupManagementState,
    toggleGroupManagement
} from './group-management.js';

import {
    loadProfileMap
} from '../friends/friends-service.js';

import {
    loadGroupExpenses,
    loadSharesForExpenses
} from '../expenses/expenses-service.js';

import {
    initializeAddExpensePage,
    openAddExpensePage,
    openEditExpensePage,
    resetAddExpensePage
} from '../expenses/add-expense-page.js';

import {
    initializeExpenseDetailPage,
    openExpenseDetailPage,
    resetExpenseDetailPage
} from '../expenses/expense-detail-page.js';

import {
    loadGroupSettlements,
    deleteSettlement,
    getSettlementAmountCents
} from '../settlements/settlements-service.js';

import {
    initializeSettleUpPage,
    openSettleUpPage,
    resetSettleUpPage
} from '../settlements/settle-up-page.js';

import {
    registerScreen,
    showScreen
} from '../core/navigation.js';

import {
    createPersonCard,
    escapeHtml,
    getProfileDisplayName
} from '../shared/person-card.js';

let initialized = false;
let currentUser = null;
let currentGroupId = null;
let balanceBreakdownExpanded = false;

const callbacks = {
    onBack: null,
    onHome: null,
    onFriends: null,
    onGroups: null
};

const elements = {};


/**
 * Adds a stylesheet once.
 */
function loadStylesheet(href) {
    if (
        document.querySelector(
            `link[href="${href}"]`
        )
    ) {
        return;
    }

    const link =
        document.createElement('link');

    link.rel = 'stylesheet';
    link.href = href;

    document.head.appendChild(link);
}


/**
 * Adds the Group Details screen.
 */
function createScreenMarkup() {
    const appShell =
        document.querySelector('.app-shell');

    if (!appShell) {
        throw new Error(
            'Orange application shell was not found.'
        );
    }

    const screen =
        document.createElement('section');

    screen.id = 'groupDetail';
    screen.className =
        'screen group-detail-screen';

    screen.hidden = true;

    screen.innerHTML = `
        <header class="page-header">
            <button
                id="groupDetailBack"
                class="icon-button"
                type="button"
                aria-label="Back to groups"
            >
                ‹
            </button>

            <div>
                <span class="eyebrow">
                    GROUP
                </span>

                <h1>Details</h1>
            </div>

            <button
                id="groupDetailOptions"
                class="text-button"
                type="button"
                aria-label="Group options"
                aria-expanded="false"
                aria-controls="groupManagementPanel"
            >
                •••
            </button>
        </header>

        <p
            id="groupDetailMessage"
            class="page-message"
            role="status"
        ></p>

        <div id="groupDetailContent">
            <p class="list-empty">
                Loading group...
            </p>
        </div>

        <nav
            class="bottom-nav"
            aria-label="Primary navigation"
        >
            <button
                id="groupDetailHomeNav"
                type="button"
            >
                <span>⌂</span>
                Home
            </button>

            <button
                id="groupDetailFriendsNav"
                type="button"
            >
                <span>♟</span>
                Friends
            </button>

            <button
                id="groupDetailAddSplit"
                class="split-button"
                type="button"
                aria-label="Add expense"
            >
                ＋
            </button>

            <button
                id="groupDetailGroupsNav"
                class="active"
                type="button"
            >
                <span>◉</span>
                Groups
            </button>

            <button type="button">
                <span>☰</span>
                Activity
            </button>
        </nav>
    `;

    appShell.appendChild(screen);
}


/**
 * Finds Group Details elements.
 */
function findElements() {
    elements.screen =
        document.querySelector(
            '#groupDetail'
        );

    elements.back =
        document.querySelector(
            '#groupDetailBack'
        );

    elements.options =
        document.querySelector(
            '#groupDetailOptions'
        );

    elements.message =
        document.querySelector(
            '#groupDetailMessage'
        );

    elements.content =
        document.querySelector(
            '#groupDetailContent'
        );

    elements.homeNav =
        document.querySelector(
            '#groupDetailHomeNav'
        );

    elements.friendsNav =
        document.querySelector(
            '#groupDetailFriendsNav'
        );

    elements.groupsNav =
        document.querySelector(
            '#groupDetailGroupsNav'
        );

    elements.addSplit =
        document.querySelector(
            '#groupDetailAddSplit'
        );
}


/**
 * Displays a Group Details message.
 */
function setMessage(message = '') {
    elements.message.textContent = message;
}


/**
 * Returns group initials.
 */
function getGroupInitials(name = '') {
    const words = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    return words.length > 0
        ? words
            .map(
                (word) =>
                    word.charAt(0)
            )
            .join('')
            .toUpperCase()
        : 'O';
}


/**
 * Creates the group hero icon.
 */
function createGroupIcon(group) {
    if (group.image_url) {
        return `
            <img
                src="${escapeHtml(
                    group.image_url
                )}"
                alt=""
                referrerpolicy="no-referrer"
            >
        `;
    }

    return escapeHtml(
        getGroupInitials(group.name)
    );
}


/**
 * Formats a database role.
 */
function formatRole(role = 'MEMBER') {
    const normalized =
        String(role).toLowerCase();

    return (
        normalized.charAt(0).toUpperCase() +
        normalized.slice(1)
    );
}


/**
 * Formats an amount with its currency.
 */
function formatMoney(
    amount,
    currency
) {
    const numericAmount = Number(amount);

    try {
        return new Intl.NumberFormat(
            undefined,
            {
                style: 'currency',
                currency
            }
        ).format(
            Number.isFinite(numericAmount)
                ? numericAmount
                : 0
        );
    } catch {
        return `${currency} ${(
            Number.isFinite(numericAmount)
                ? numericAmount
                : 0
        ).toFixed(2)}`;
    }
}


/**
 * Formats an expense date without timezone shifting.
 */
function formatExpenseDate(value) {
    if (!value) {
        return '';
    }

    const [
        year,
        month,
        day
    ] = value.split('-').map(Number);

    return new Intl.DateTimeFormat(
        undefined,
        {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }
    ).format(
        new Date(
            year,
            month - 1,
            day
        )
    );
}


/**
 * Formats a settlement timestamp.
 */
function formatSettlementDate(value) {
    if (!value) {
        return '';
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return '';
    }

    return new Intl.DateTimeFormat(
        undefined,
        {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }
    ).format(date);
}


/**
 * Renders group members and roles.
 */
function createMembersMarkup(
    groupMemberships,
    profileMap
) {
    if (groupMemberships.length === 0) {
        return `
            <p class="list-empty">
                No group members were found.
            </p>
        `;
    }

    return groupMemberships
        .map((membership) => {
            const profile =
                profileMap.get(
                    membership.user_id
                );

            const role =
                formatRole(
                    membership.role
                );

            const roleClass =
                membership.role === 'OWNER'
                    ? 'group-member-role owner'
                    : 'group-member-role';

            return createPersonCard(
                profile,
                {
                    actions: `
                        <span class="${roleClass}">
                            ${escapeHtml(role)}
                        </span>
                    `
                }
            );
        })
        .join('');
}


/**
 * Returns the current user's membership.
 */
function getCurrentMembership(
    groupMemberships
) {
    return groupMemberships.find(
        (membership) =>
            membership.user_id ===
            currentUser?.id
    ) ?? null;
}


/**
 * Returns whether the current user can
 * delete a settlement.
 */
function canDeleteSettlement(
    settlement,
    groupMemberships
) {
    if (
        settlement.created_by ===
        currentUser?.id
    ) {
        return true;
    }

    const membership =
        getCurrentMembership(
            groupMemberships
        );

    return (
        membership?.role === 'OWNER' ||
        membership?.role === 'ADMIN'
    );
}


/**
 * Calculates the current user's position
 * for a single expense.
 */
function calculateExpensePosition(
    expense,
    userShare
) {
    const totalCents = Math.round(
        Number(expense.total_amount) * 100
    );

    const shareCents = Math.round(
        Number(
            userShare?.owed_amount ?? 0
        ) * 100
    );

    const paidCents =
        expense.paid_by === currentUser?.id
            ? totalCents
            : 0;

    const balanceCents =
        paidCents - shareCents;

    return {
        shareAmount:
            shareCents / 100,
        balanceAmount:
            Math.abs(balanceCents) / 100,
        balanceCents
    };
}


/**
 * Calculates the current user's total
 * expense balance before settlements.
 */
function calculateExpenseGroupBalance(
    expenses,
    sharesByExpense
) {
    return expenses.reduce(
        (total, expense) => {
            const expenseShares =
                sharesByExpense.get(
                    expense.id
                ) ?? [];

            const userShare =
                expenseShares.find(
                    (share) =>
                        share.user_id ===
                        currentUser?.id
                );

            const position =
                calculateExpensePosition(
                    expense,
                    userShare
                );

            return (
                total +
                position.balanceCents
            );
        },
        0
    );
}


/**
 * Calculates settlement adjustments
 * for the current user.
 *
 * Sender: +amount
 * Receiver: -amount
 */
function calculateSettlementGroupBalance(
    settlements
) {
    return settlements.reduce(
        (total, settlement) => {
            const amountCents =
                getSettlementAmountCents(
                    settlement
                );

            if (
                settlement.paid_by ===
                currentUser?.id
            ) {
                return total + amountCents;
            }

            if (
                settlement.paid_to ===
                currentUser?.id
            ) {
                return total - amountCents;
            }

            return total;
        },
        0
    );
}


/**
 * Calculates the current user's complete
 * group position including settlements.
 */
function calculateGroupPosition(
    expenses,
    sharesByExpense,
    settlements
) {
    const expenseBalanceCents =
        calculateExpenseGroupBalance(
            expenses,
            sharesByExpense
        );

    const settlementBalanceCents =
        calculateSettlementGroupBalance(
            settlements
        );

    const balanceCents =
        expenseBalanceCents +
        settlementBalanceCents;

    return {
        amount:
            Math.abs(balanceCents) / 100,
        balanceCents,
        expenseBalanceCents,
        settlementBalanceCents
    };
}


/**
 * Calculates net balances between the
 * current user and each other group member.
 *
 * Positive:
 * other person owes current user.
 *
 * Negative:
 * current user owes other person.
 */
function calculatePersonBalances(
    expenses,
    sharesByExpense,
    settlements,
    groupMemberships
) {
    const balancesByUser =
        new Map();

    groupMemberships.forEach(
        (membership) => {
            if (
                membership.user_id !==
                currentUser?.id
            ) {
                balancesByUser.set(
                    membership.user_id,
                    0
                );
            }
        }
    );

    /*
     * Expenses.
     */
    expenses.forEach((expense) => {
        const payerId =
            expense.paid_by;

        const expenseShares =
            sharesByExpense.get(
                expense.id
            ) ?? [];

        expenseShares.forEach(
            (share) => {
                const participantId =
                    share.user_id;

                if (
                    !participantId ||
                    participantId === payerId
                ) {
                    return;
                }

                const owedCents =
                    Math.round(
                        Number(
                            share.owed_amount
                        ) * 100
                    );

                if (
                    !Number.isFinite(
                        owedCents
                    ) ||
                    owedCents === 0
                ) {
                    return;
                }

                if (
                    payerId ===
                    currentUser?.id
                ) {
                    balancesByUser.set(
                        participantId,
                        (
                            balancesByUser.get(
                                participantId
                            ) ?? 0
                        ) + owedCents
                    );

                    return;
                }

                if (
                    participantId ===
                    currentUser?.id
                ) {
                    balancesByUser.set(
                        payerId,
                        (
                            balancesByUser.get(
                                payerId
                            ) ?? 0
                        ) - owedCents
                    );
                }
            }
        );
    });

    /*
     * Settlements.
     */
    settlements.forEach(
        (settlement) => {
            const amountCents =
                getSettlementAmountCents(
                    settlement
                );

            if (
                !Number.isFinite(
                    amountCents
                ) ||
                amountCents === 0
            ) {
                return;
            }

            if (
                settlement.paid_by ===
                currentUser?.id
            ) {
                const otherUserId =
                    settlement.paid_to;

                balancesByUser.set(
                    otherUserId,
                    (
                        balancesByUser.get(
                            otherUserId
                        ) ?? 0
                    ) + amountCents
                );

                return;
            }

            if (
                settlement.paid_to ===
                currentUser?.id
            ) {
                const otherUserId =
                    settlement.paid_by;

                balancesByUser.set(
                    otherUserId,
                    (
                        balancesByUser.get(
                            otherUserId
                        ) ?? 0
                    ) - amountCents
                );
            }
        }
    );

    return groupMemberships
        .filter(
            (membership) =>
                membership.user_id !==
                currentUser?.id
        )
        .map(
            (membership) => {
                const balanceCents =
                    balancesByUser.get(
                        membership.user_id
                    ) ?? 0;

                return {
                    userId:
                        membership.user_id,
                    balanceCents,
                    amount:
                        Math.abs(
                            balanceCents
                        ) / 100
                };
            }
        );
}


/**
 * Creates the current user's per-person
 * balance breakdown.
 */
function createPersonBalancesMarkup(
    personBalances,
    profileMap,
    currency
) {
    if (personBalances.length === 0) {
        return `
            <p class="list-empty">
                Add another person to see who owes whom.
            </p>
        `;
    }

    return `
        <div class="groups-list">
            ${personBalances
                .map((personBalance) => {
                    const profile =
                        profileMap.get(
                            personBalance.userId
                        );

                    const name =
                        getProfileDisplayName(
                            profile
                        );

                    let relationship =
                        `You and ${name} are settled up.`;

                    let relationshipClass =
                        'group-expense-balance';

                    if (
                        personBalance.balanceCents >
                        0
                    ) {
                        relationship =
                            `${name} owes you ${formatMoney(
                                personBalance.amount,
                                currency
                            )}`;

                        relationshipClass +=
                            ' positive';
                    }

                    if (
                        personBalance.balanceCents <
                        0
                    ) {
                        relationship =
                            `You owe ${name} ${formatMoney(
                                personBalance.amount,
                                currency
                            )}`;

                        relationshipClass +=
                            ' negative';
                    }

                    return `
                        <article class="group-card">
                            <div class="group-card-icon">
                                $
                            </div>

                            <div class="group-card-copy">
                                <strong>
                                    ${escapeHtml(name)}
                                </strong>

                                <span class="${relationshipClass}">
                                    ${escapeHtml(
                                        relationship
                                    )}
                                </span>
                            </div>
                        </article>
                    `;
                })
                .join('')}
        </div>
    `;
}


/**
 * Creates settlement history markup.
 */
function createSettlementsMarkup(
    settlements,
    profileMap,
    groupMemberships
) {
    if (settlements.length === 0) {
        return `
            <div class="group-settlements-empty">
                <p>
                    No payments have been recorded yet.
                </p>
            </div>
        `;
    }

    return `
        <div class="group-settlements-list">
            ${settlements
                .map((settlement) => {
                    const payer =
                        profileMap.get(
                            settlement.paid_by
                        );

                    const receiver =
                        profileMap.get(
                            settlement.paid_to
                        );

                    const payerName =
                        getProfileDisplayName(
                            payer
                        );

                    const receiverName =
                        getProfileDisplayName(
                            receiver
                        );

                    const allowDelete =
                        canDeleteSettlement(
                            settlement,
                            groupMemberships
                        );

                    const note =
                        settlement.notes
                            ? `
                                <span class="group-settlement-note">
                                    ${escapeHtml(
                                        settlement.notes
                                    )}
                                </span>
                            `
                            : '';

                    const deleteButton =
                        allowDelete
                            ? `
                                <button
                                    class="group-settlement-delete"
                                    type="button"
                                    data-settlement-delete="${escapeHtml(
                                        settlement.id
                                    )}"
                                    aria-label="Delete payment"
                                >
                                    Delete
                                </button>
                            `
                            : '';

                    return `
                        <article class="group-settlement-card">
                            <div class="group-settlement-icon">
                                ✓
                            </div>

                            <div class="group-settlement-copy">
                                <strong>
                                    ${escapeHtml(
                                        payerName
                                    )}
                                    paid
                                    ${escapeHtml(
                                        receiverName
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        formatSettlementDate(
                                            settlement.settled_at
                                        )
                                    )}
                                </span>

                                ${note}
                            </div>

                            <div class="group-settlement-side">
                                <strong>
                                    ${escapeHtml(
                                        formatMoney(
                                            settlement.amount,
                                            settlement.currency
                                        )
                                    )}
                                </strong>

                                ${deleteButton}
                            </div>
                        </article>
                    `;
                })
                .join('')}
        </div>
    `;
}


/**
 * Returns a personal group balance label.
 */
function getBalanceLabel(position) {
    if (position.balanceCents > 0) {
        return 'You are owed';
    }

    if (position.balanceCents < 0) {
        return 'You owe';
    }

    return 'You are settled up';
}


/**
 * Creates one interactive expense card.
 */
function createExpenseCard(
    expense,
    profileMap,
    sharesByExpense
) {
    const payer =
        profileMap.get(
            expense.paid_by
        );

    const payerName =
        getProfileDisplayName(payer);

    const expenseShares =
        sharesByExpense.get(
            expense.id
        ) ?? [];

    const userShare =
        expenseShares.find(
            (share) =>
                share.user_id ===
                currentUser?.id
        );

    const position =
        calculateExpensePosition(
            expense,
            userShare
        );

    let balanceLabel =
        'You are settled';

    if (position.balanceCents > 0) {
        balanceLabel =
            `You are owed ${formatMoney(
                position.balanceAmount,
                expense.currency
            )}`;
    }

    if (position.balanceCents < 0) {
        balanceLabel =
            `You owe ${formatMoney(
                position.balanceAmount,
                expense.currency
            )}`;
    }

    return `
        <article
            class="group-card group-expense-card"
            data-expense-id="${escapeHtml(
                expense.id
            )}"
            role="button"
            tabindex="0"
            aria-label="View ${escapeHtml(
                expense.description
            )} expense details"
        >
            <div class="group-card-icon">
                $
            </div>

            <div class="group-card-copy">
                <strong>
                    ${escapeHtml(
                        expense.description
                    )}
                </strong>

                <span>
                    ${escapeHtml(payerName)}
                    paid ·
                    ${escapeHtml(
                        formatExpenseDate(
                            expense.expense_date
                        )
                    )}
                </span>

                <span class="group-expense-personal">
                    Your share:
                    ${escapeHtml(
                        formatMoney(
                            position.shareAmount,
                            expense.currency
                        )
                    )}
                </span>

                <span
                    class="
                        group-expense-balance
                        ${
                            position.balanceCents > 0
                                ? 'positive'
                                : ''
                        }
                        ${
                            position.balanceCents < 0
                                ? 'negative'
                                : ''
                        }
                    "
                >
                    ${escapeHtml(
                        balanceLabel
                    )}
                </span>
            </div>

            <div class="group-expense-value">
                <strong>
                    ${escapeHtml(
                        formatMoney(
                            expense.total_amount,
                            expense.currency
                        )
                    )}
                </strong>

                <span aria-hidden="true">
                    ›
                </span>
            </div>
        </article>
    `;
}


/**
 * Renders expenses or the empty state.
 */
function createExpensesMarkup(
    expenses,
    profileMap,
    sharesByExpense
) {
    if (expenses.length === 0) {
        return `
            <div class="group-expenses-empty">
                <div
                    class="group-expenses-empty-symbol"
                    aria-hidden="true"
                >
                    ＋
                </div>

                <h3>No expenses yet</h3>

                <p>
                    Add the first expense and Orange
                    will keep track of everyone's share.
                </p>
            </div>
        `;
    }

    return `
        <div class="groups-list">
            ${expenses
                .map(
                    (expense) =>
                        createExpenseCard(
                            expense,
                            profileMap,
                            sharesByExpense
                        )
                )
                .join('')}
        </div>
    `;
}


/**
 * Updates the expanded/collapsed state
 * of the balance breakdown.
 */
function updateBalanceBreakdownState() {
    const section =
        document.querySelector(
            '#groupBalanceBreakdown'
        );

    const button =
        document.querySelector(
            '#groupBalanceBreakdownToggle'
        );

    if (!section || !button) {
        return;
    }

    section.hidden =
        !balanceBreakdownExpanded;

    button.setAttribute(
        'aria-expanded',
        String(
            balanceBreakdownExpanded
        )
    );

    button.textContent =
        balanceBreakdownExpanded
            ? 'Hide breakdown'
            : 'View breakdown';
}


/**
 * Toggles the balance breakdown.
 */
function handleBalanceBreakdownToggle() {
    balanceBreakdownExpanded =
        !balanceBreakdownExpanded;

    updateBalanceBreakdownState();
}


/**
 * Renders the complete Group Details page.
 */
function renderGroupDetails(
    group,
    groupMemberships,
    profileMap,
    expenses,
    sharesByExpense,
    settlements
) {
    const description =
        group.description ||
        'Shared expenses made simple.';

    const groupPosition =
        calculateGroupPosition(
            expenses,
            sharesByExpense,
            settlements
        );

    const personBalances =
        calculatePersonBalances(
            expenses,
            sharesByExpense,
            settlements,
            groupMemberships
        );

    const groupBalanceClass =
        groupPosition.balanceCents > 0
            ? 'positive'
            : groupPosition.balanceCents < 0
                ? 'negative'
                : '';

    elements.content.innerHTML = `
        <article class="group-detail-hero">
            <div class="group-detail-icon">
                ${createGroupIcon(group)}
            </div>

            <span class="group-detail-currency">
                ${escapeHtml(
                    group.default_currency
                )}
            </span>

            <h2>
                ${escapeHtml(group.name)}
            </h2>

            <p class="group-detail-description">
                ${escapeHtml(description)}
            </p>
        </article>

        ${createGroupManagementMarkup()}

        <article class="group-balance-card">
            <div class="group-balance-copy">
                <span>
                    ${escapeHtml(
                        getBalanceLabel(
                            groupPosition
                        )
                    )}
                </span>

                <strong class="${groupBalanceClass}">
                    ${escapeHtml(
                        formatMoney(
                            groupPosition.amount,
                            group.default_currency
                        )
                    )}
                </strong>

                <button
                    id="groupBalanceBreakdownToggle"
                    class="group-balance-breakdown-toggle"
                    type="button"
                    aria-expanded="${String(
                        balanceBreakdownExpanded
                    )}"
                    aria-controls="groupBalanceBreakdown"
                >
                    ${
                        balanceBreakdownExpanded
                            ? 'Hide breakdown'
                            : 'View breakdown'
                    }
                </button>
            </div>

            <div class="group-balance-actions">
                <button
                    id="groupSettleUp"
                    class="secondary-button"
                    type="button"
                >
                    Settle up
                </button>

                <button
                    id="groupAddExpense"
                    class="primary-button"
                    type="button"
                >
                    Add expense
                </button>
            </div>
        </article>

        <section
            id="groupBalanceBreakdown"
            class="group-detail-section group-balance-breakdown"
            ${
                balanceBreakdownExpanded
                    ? ''
                    : 'hidden'
            }
        >
            <div class="group-detail-section-header">
                <h2>Who owes whom</h2>

                <span>
                    Net balance
                </span>
            </div>

            ${createPersonBalancesMarkup(
                personBalances,
                profileMap,
                group.default_currency
            )}
        </section>

        <section class="group-detail-section">
            <div class="group-detail-section-header">
                <h2>Payments</h2>

                <span>
                    ${settlements.length}
                    ${
                        settlements.length === 1
                            ? 'payment'
                            : 'payments'
                    }
                </span>
            </div>

            ${createSettlementsMarkup(
                settlements,
                profileMap,
                groupMemberships
            )}
        </section>

        <section class="group-detail-section">
            <div class="group-detail-section-header">
                <h2>Members</h2>

                <span>
                    ${groupMemberships.length}
                    ${
                        groupMemberships.length === 1
                            ? 'person'
                            : 'people'
                    }
                </span>
            </div>

            <div class="group-members-list">
                ${createMembersMarkup(
                    groupMemberships,
                    profileMap
                )}
            </div>
        </section>

        <section class="group-detail-section">
            <div class="group-detail-section-header">
                <h2>Expenses</h2>

                <span>
                    ${expenses.length}
                    ${
                        expenses.length === 1
                            ? 'expense'
                            : 'expenses'
                    }
                </span>
            </div>

            ${createExpensesMarkup(
                expenses,
                profileMap,
                sharesByExpense
            )}
        </section>
    `;

    document.querySelector(
        '#groupAddExpense'
    ).addEventListener(
        'click',
        handleAddExpense
    );

    document.querySelector(
        '#groupSettleUp'
    ).addEventListener(
        'click',
        handleSettleUp
    );

    document.querySelector(
        '#groupBalanceBreakdownToggle'
    ).addEventListener(
        'click',
        handleBalanceBreakdownToggle
    );

    updateBalanceBreakdownState();
    syncGroupManagementState();
}


/**
 * Opens the Add Expense page.
 */
async function handleAddExpense() {
    if (
        !currentGroupId ||
        !currentUser
    ) {
        return;
    }

    showScreen('addExpense');

    try {
        await openAddExpensePage(
            currentGroupId,
            currentUser
        );
    } catch (error) {
        showScreen('groupDetail');

        setMessage(
            error?.message ||
            'Add Expense could not be opened.'
        );
    }
}


/**
 * Opens the Settle Up page.
 */
async function handleSettleUp() {
    if (
        !currentGroupId ||
        !currentUser
    ) {
        return;
    }

    showScreen('settleUp');

    try {
        await openSettleUpPage(
            currentGroupId,
            currentUser
        );
    } catch (error) {
        showScreen('groupDetail');

        setMessage(
            error?.message ||
            'Settle Up could not be opened.'
        );
    }
}


/**
 * Returns from Settle Up without saving.
 */
function handleSettlementCancel(groupId) {
    showScreen('groupDetail');

    if (
        groupId &&
        groupId !== currentGroupId
    ) {
        openGroupDetailPage(
            groupId,
            currentUser
        );
    }
}


/**
 * Refreshes Group Details after
 * successfully recording a settlement.
 */
async function handleSettlementSaved(
    groupId
) {
    const targetGroupId =
        groupId || currentGroupId;

    showScreen('groupDetail');

    if (
        !targetGroupId ||
        !currentUser
    ) {
        return;
    }

    try {
        await openGroupDetailPage(
            targetGroupId,
            currentUser
        );

        setMessage(
            'Payment recorded.'
        );
    } catch (error) {
        setMessage(
            error?.message ||
            'The payment was recorded, but the group could not be refreshed.'
        );
    }
}


/**
 * Deletes one settlement and refreshes
 * all settlement-aware balances.
 */
async function handleSettlementDelete(
    button
) {
    const settlementId =
        button.dataset
            .settlementDelete;

    if (
        !settlementId ||
        !currentGroupId ||
        !currentUser
    ) {
        return;
    }

    const confirmed =
        window.confirm(
            'Delete this payment? Group balances will be recalculated.'
        );

    if (!confirmed) {
        return;
    }

    setMessage('');

    button.disabled = true;

    const originalText =
        button.textContent;

    button.textContent =
        'Deleting...';

    try {
        await deleteSettlement(
            settlementId
        );

        await openGroupDetailPage(
            currentGroupId,
            currentUser
        );

        setMessage(
            'Payment deleted.'
        );
    } catch (error) {
        button.disabled = false;

        button.textContent =
            originalText;

        setMessage(
            error?.message ||
            'Payment could not be deleted.'
        );
    }
}


/**
 * Opens a selected expense.
 */
async function handleExpenseOpen(expenseId) {
    if (
        !expenseId ||
        !currentUser
    ) {
        return;
    }

    showScreen('expenseDetail');

    try {
        await openExpenseDetailPage(
            expenseId,
            currentUser
        );
    } catch (error) {
        showScreen('groupDetail');

        setMessage(
            error?.message ||
            'Expense details could not be opened.'
        );
    }
}


/**
 * Handles Group Details content clicks.
 */
function handleContentClick(event) {
    if (
        handleGroupManagementClick(
            event,
            elements.content
        )
    ) {
        return;
    }

    const settlementDeleteButton =
        event.target.closest(
            '[data-settlement-delete]'
        );

    if (
        settlementDeleteButton &&
        elements.content.contains(
            settlementDeleteButton
        )
    ) {
        event.preventDefault();
        event.stopPropagation();

        handleSettlementDelete(
            settlementDeleteButton
        );

        return;
    }

    const expenseCard =
        event.target.closest(
            '[data-expense-id]'
        );

    if (
        !expenseCard ||
        !elements.content.contains(
            expenseCard
        )
    ) {
        return;
    }

    handleExpenseOpen(
        expenseCard.dataset.expenseId
    );
}


/**
 * Handles keyboard selection of an expense.
 */
function handleContentKeydown(event) {
    if (
        handleGroupManagementKeydown(
            event,
            elements.content
        )
    ) {
        return;
    }

    if (
        event.key !== 'Enter' &&
        event.key !== ' '
    ) {
        return;
    }

    const expenseCard =
        event.target.closest(
            '[data-expense-id]'
        );

    if (
        !expenseCard ||
        !elements.content.contains(
            expenseCard
        )
    ) {
        return;
    }

    event.preventDefault();

    handleExpenseOpen(
        expenseCard.dataset.expenseId
    );
}


/**
 * Opens an existing expense in the shared form.
 */
async function handleExpenseEdit(
    expenseId,
    groupId
) {
    if (!expenseId || !currentUser) {
        return;
    }

    if (groupId) {
        currentGroupId = groupId;
    }

    showScreen('addExpense');

    try {
        await openEditExpensePage(
            expenseId,
            currentUser
        );
    } catch (error) {
        showScreen('expenseDetail');

        console.error(
            'Expense edit could not be opened.',
            error
        );
    }
}


/**
 * Returns from the expense form
 * without saving.
 */
function handleExpenseCancel(
    groupId,
    expenseId
) {
    if (expenseId) {
        showScreen('expenseDetail');
        return;
    }

    showScreen('groupDetail');

    if (
        groupId &&
        groupId !== currentGroupId
    ) {
        openGroupDetailPage(
            groupId,
            currentUser
        );
    }
}


/**
 * Returns after creating or
 * editing an expense.
 */
async function handleExpenseSaved(
    groupId,
    expenseId,
    mode
) {
    const targetGroupId =
        groupId || currentGroupId;

    if (
        mode === 'edit' &&
        expenseId &&
        currentUser
    ) {
        showScreen('expenseDetail');

        try {
            await openExpenseDetailPage(
                expenseId,
                currentUser
            );

            if (targetGroupId) {
                await openGroupDetailPage(
                    targetGroupId,
                    currentUser
                );
            }

            return;
        } catch (error) {
            showScreen('groupDetail');

            setMessage(
                error?.message ||
                'The expense was updated, but the refreshed details could not be loaded.'
            );

            return;
        }
    }

    showScreen('groupDetail');

    await openGroupDetailPage(
        targetGroupId,
        currentUser
    );

    setMessage('Expense saved.');
}


/**
 * Returns from Expense Details.
 */
function handleExpenseDetailBack(groupId) {
    showScreen('groupDetail');

    if (
        groupId &&
        groupId !== currentGroupId
    ) {
        openGroupDetailPage(
            groupId,
            currentUser
        );
    }
}


/**
 * Returns after deletion and
 * refreshes the group.
 */
async function handleExpenseDeleted(groupId) {
    const targetGroupId =
        groupId || currentGroupId;

    showScreen('groupDetail');

    if (
        !targetGroupId ||
        !currentUser
    ) {
        setMessage(
            'Expense deleted.'
        );

        return;
    }

    try {
        await openGroupDetailPage(
            targetGroupId,
            currentUser
        );

        setMessage(
            'Expense deleted.'
        );
    } catch (error) {
        setMessage(
            error?.message ||
            'Expense was deleted, but the group could not be refreshed.'
        );
    }
}


/**
 * Opens or closes Group Management.
 */
async function handleOptions() {
    try {
        await toggleGroupManagement();
    } catch (error) {
        setMessage(
            error?.message ||
            'Group management could not be opened.'
        );
    }
}


/**
 * Handles Group Management form submissions.
 */
function handleContentSubmit(event) {
    handleGroupManagementSubmit(event);
}


/**
 * Handles Group Management select changes.
 */
function handleContentChange(event) {
    handleGroupManagementChange(
        event,
        elements.content
    );
}


/**
 * Runs an optional navigation callback.
 */
function runCallback(callback) {
    if (typeof callback === 'function') {
        callback();
    }
}


/**
 * Initializes Group Details and related screens.
 */
export function initializeGroupDetailPage(
    options = {}
) {
    if (initialized) {
        return elements.screen;
    }

    callbacks.onBack =
        options.onBack ?? null;

    callbacks.onHome =
        options.onHome ?? null;

    callbacks.onFriends =
        options.onFriends ?? null;

    callbacks.onGroups =
        options.onGroups ?? null;

    loadStylesheet(
        '/css/add-expense.css'
    );

    loadStylesheet(
        '/css/expense-detail.css'
    );

    loadStylesheet(
        '/css/settle-up.css'
    );

    createScreenMarkup();
    findElements();

    initializeAddExpensePage({
        onCancel:
            handleExpenseCancel,
        onSaved:
            handleExpenseSaved
    });

    initializeExpenseDetailPage({
        onBack:
            handleExpenseDetailBack,
        onEdit:
            handleExpenseEdit,
        onDeleted:
            handleExpenseDeleted
    });

    initializeSettleUpPage({
        onCancel:
            handleSettlementCancel,
        onSaved:
            handleSettlementSaved
    });

    initializeGroupManagement({
        onRefresh: async () => {
            if (
                currentGroupId &&
                currentUser
            ) {
                await openGroupDetailPage(
                    currentGroupId,
                    currentUser
                );
            }
        },
        onExit: () => {
            runCallback(
                callbacks.onGroups ||
                callbacks.onBack
            );
        },
        setMessage
    });

    registerScreen('addExpense');
    registerScreen('expenseDetail');
    registerScreen('settleUp');

    elements.back.addEventListener(
        'click',
        () =>
            runCallback(
                callbacks.onBack
            )
    );

    elements.options.addEventListener(
        'click',
        handleOptions
    );

    elements.homeNav.addEventListener(
        'click',
        () =>
            runCallback(
                callbacks.onHome
            )
    );

    elements.friendsNav.addEventListener(
        'click',
        () =>
            runCallback(
                callbacks.onFriends
            )
    );

    elements.groupsNav.addEventListener(
        'click',
        () =>
            runCallback(
                callbacks.onGroups
            )
    );

    elements.addSplit.addEventListener(
        'click',
        handleAddExpense
    );

    elements.content.addEventListener(
        'click',
        handleContentClick
    );

    elements.content.addEventListener(
        'keydown',
        handleContentKeydown
    );

    elements.content.addEventListener(
        'submit',
        handleContentSubmit
    );

    elements.content.addEventListener(
        'change',
        handleContentChange
    );

    initialized = true;

    return elements.screen;
}


/**
 * Loads and renders one group.
 */
export async function openGroupDetailPage(
    groupId,
    user
) {
    if (!initialized) {
        throw new Error(
            'Group Details page is not initialized.'
        );
    }

    if (!groupId || !user?.id) {
        throw new Error(
            'A group and signed-in user are required.'
        );
    }

    const openingDifferentGroup =
        currentGroupId !== groupId;

    currentGroupId = groupId;
    currentUser = user;

    if (openingDifferentGroup) {
        balanceBreakdownExpanded = false;
    }

    setMessage('');

    elements.content.innerHTML = `
        <p class="list-empty">
            Loading group...
        </p>
    `;

    try {
        const [
            group,
            groupMemberships,
            expenses,
            settlements
        ] = await Promise.all([
            loadGroup(
                currentGroupId
            ),
            loadGroupMembers(
                currentGroupId
            ),
            loadGroupExpenses(
                currentGroupId
            ),
            loadGroupSettlements(
                currentGroupId
            )
        ]);

        const profileIds =
            new Set(
                groupMemberships.map(
                    (membership) =>
                        membership.user_id
                )
            );

        settlements.forEach(
            (settlement) => {
                if (settlement.paid_by) {
                    profileIds.add(
                        settlement.paid_by
                    );
                }

                if (settlement.paid_to) {
                    profileIds.add(
                        settlement.paid_to
                    );
                }
            }
        );

        const [
            profileMap,
            expenseShares
        ] = await Promise.all([
            loadProfileMap(
                Array.from(
                    profileIds
                )
            ),
            loadSharesForExpenses(
                expenses.map(
                    (expense) =>
                        expense.id
                )
            )
        ]);

        const sharesByExpense =
            new Map();

        expenseShares.forEach(
            (share) => {
                const shares =
                    sharesByExpense.get(
                        share.expense_id
                    ) ?? [];

                shares.push(share);

                sharesByExpense.set(
                    share.expense_id,
                    shares
                );
            }
        );

        setGroupManagementContext({
            user: currentUser,
            group,
            memberships: groupMemberships,
            profileMap,
            expenses,
            settlements,
            resetForDifferentGroup:
                openingDifferentGroup
        });

        renderGroupDetails(
            group,
            groupMemberships,
            profileMap,
            expenses,
            sharesByExpense,
            settlements
        );
    } catch (error) {
        elements.content.innerHTML = '';

        setMessage(
            error?.message ||
            'Group details could not be loaded.'
        );

        throw error;
    }
}


/**
 * Clears Group Details state on sign-out.
 */
export function resetGroupDetailPage() {
    currentUser = null;
    currentGroupId = null;
    balanceBreakdownExpanded = false;

    resetGroupManagement();
    resetAddExpensePage();
    resetExpenseDetailPage();
    resetSettleUpPage();

    if (!initialized) {
        return;
    }

    elements.content.innerHTML = '';
    setMessage('');
}