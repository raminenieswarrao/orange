import {
    deleteExpense,
    loadExpenseDetails,
    SPLIT_METHOD
} from './expenses-service.js';

import {
    createPersonCard,
    escapeHtml,
    getProfileDisplayName
} from '../shared/person-card.js';

let initialized = false;
let deletingExpense = false;
let currentUser = null;
let currentExpense = null;
let currentDetails = null;

const callbacks = {
    onBack: null,
    onDeleted: null,
    onEdit: null
};

const elements = {};


/**
 * Adds the Expense Details screen to Orange.
 */
function createScreenMarkup() {
    const appShell =
        document.querySelector(
            '.app-shell'
        );

    if (!appShell) {
        throw new Error(
            'Orange application shell was not found.'
        );
    }

    const screen =
        document.createElement(
            'section'
        );

    screen.id = 'expenseDetail';

    screen.className =
        'screen expense-detail-screen';

    screen.hidden = true;

    screen.innerHTML = `
        <header class="page-header">
            <button
                id="expenseDetailBack"
                class="icon-button"
                type="button"
                aria-label="Back to group"
            >
                ‹
            </button>

            <div>
                <span class="eyebrow">
                    EXPENSE
                </span>

                <h1>Details</h1>
            </div>

            <div class="expense-detail-header-actions">
                <button
                    id="expenseDetailEdit"
                    class="expense-action-button edit"
                    type="button"
                    disabled
                >
                    Edit
                </button>

                <button
                    id="expenseDetailDelete"
                    class="expense-action-button delete"
                    type="button"
                    disabled
                >
                    Delete
                </button>
            </div>
        </header>

        <p
            id="expenseDetailMessage"
            class="page-message"
            role="status"
        ></p>

        <main
            id="expenseDetailContent"
            class="expense-detail-content"
        >
            <p class="list-empty">
                Select an expense to view its details.
            </p>
        </main>
    `;

    appShell.appendChild(screen);
}


/**
 * Finds stable Expense Details elements.
 */
function findElements() {
    elements.screen =
        document.querySelector(
            '#expenseDetail'
        );

    elements.back =
        document.querySelector(
            '#expenseDetailBack'
        );

    elements.edit =
        document.querySelector(
            '#expenseDetailEdit'
        );

    elements.delete =
        document.querySelector(
            '#expenseDetailDelete'
        );

    elements.message =
        document.querySelector(
            '#expenseDetailMessage'
        );

    elements.content =
        document.querySelector(
            '#expenseDetailContent'
        );
}


/**
 * Displays a page message.
 */
function setMessage(message = '') {
    elements.message.textContent =
        message;
}


/**
 * Enables or disables the action buttons.
 */
function setActionsDisabled(disabled) {
    elements.edit.disabled =
        disabled;

    elements.delete.disabled =
        disabled;
}


/**
 * Formats an expense amount using its currency.
 */
function formatMoney(
    amount,
    currency = 'USD'
) {
    const numericAmount =
        Number(amount);

    try {
        return new Intl.NumberFormat(
            undefined,
            {
                style: 'currency',
                currency:
                    String(currency)
                        .trim()
                        .toUpperCase()
            }
        ).format(
            Number.isFinite(
                numericAmount
            )
                ? numericAmount
                : 0
        );
    } catch {
        return `$${(
            Number.isFinite(
                numericAmount
            )
                ? numericAmount
                : 0
        ).toFixed(2)}`;
    }
}


/**
 * Formats YYYY-MM-DD without timezone shifting.
 */
function formatExpenseDate(value) {
    if (!value) {
        return 'Date unavailable';
    }

    const parts =
        String(value).split('-');

    if (parts.length !== 3) {
        return value;
    }

    const date =
        new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        undefined,
        {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }
    ).format(date);
}


/**
 * Returns the readable split-method label.
 */
function getSplitMethodLabel(
    splitMethod
) {
    if (
        splitMethod ===
        SPLIT_METHOD.CUSTOM
    ) {
        return 'Exact amounts';
    }

    if (
        splitMethod ===
        SPLIT_METHOD.PERCENTAGE
    ) {
        return 'By percentage';
    }

    return 'Split equally';
}


/**
 * Returns a safe profile display name.
 */
function getSafeDisplayName(
    profile,
    fallback = 'Group member'
) {
    if (!profile) {
        return fallback;
    }

    return (
        getProfileDisplayName(
            profile
        ) ||
        fallback
    );
}


/**
 * Calculates the current user's position.
 */
function getCurrentUserPosition(
    expense,
    shares
) {
    const currentUserShare =
        shares.find(
            (share) =>
                share.user_id ===
                currentUser?.id
        );

    const shareAmount =
        Number(
            currentUserShare
                ?.owed_amount ?? 0
        );

    const paidAmount =
        expense.paid_by ===
        currentUser?.id
            ? Number(
                expense.total_amount
            )
            : 0;

    const netAmount =
        Math.round(
            (
                paidAmount -
                shareAmount +
                Number.EPSILON
            ) * 100
        ) / 100;

    return {
        isParticipant:
            Boolean(
                currentUserShare
            ) ||
            paidAmount > 0,
        shareAmount,
        paidAmount,
        netAmount
    };
}


/**
 * Creates the current user's expense result.
 */
function createPersonalResultMarkup(
    expense,
    shares
) {
    const position =
        getCurrentUserPosition(
            expense,
            shares
        );

    if (!position.isParticipant) {
        return `
            <div class="expense-detail-personal-result">
                <span>
                    Your involvement
                </span>

                <strong>
                    Not included
                </strong>
            </div>
        `;
    }

    let resultLabel =
        'You are settled';

    let resultAmount = '';

    if (position.netAmount > 0) {
        resultLabel = 'You lent';

        resultAmount =
            formatMoney(
                position.netAmount,
                expense.currency
            );
    } else if (
        position.netAmount < 0
    ) {
        resultLabel =
            'You borrowed';

        resultAmount =
            formatMoney(
                Math.abs(
                    position.netAmount
                ),
                expense.currency
            );
    }

    const resultClass =
        position.netAmount > 0
            ? 'positive'
            : position.netAmount < 0
                ? 'negative'
                : 'settled';

    return `
        <div class="expense-detail-personal-summary">
            <div class="expense-detail-personal-result">
                <span>
                    Your share
                </span>

                <strong>
                    ${escapeHtml(
                        formatMoney(
                            position.shareAmount,
                            expense.currency
                        )
                    )}
                </strong>
            </div>

            <div
                class="
                    expense-detail-personal-result
                    ${resultClass}
                "
            >
                <span>
                    ${escapeHtml(
                        resultLabel
                    )}
                </span>

                <strong>
                    ${escapeHtml(
                        resultAmount ||
                        'Settled'
                    )}
                </strong>
            </div>
        </div>
    `;
}


/**
 * Creates one share row.
 */
function createShareRow(
    share,
    expense
) {
    const isCurrentUser =
        share.user_id ===
        currentUser?.id;

    const label =
        isCurrentUser
            ? 'Your share'
            : 'Owes';

    const splitValueMarkup =
        expense.split_method ===
            SPLIT_METHOD.PERCENTAGE &&
        share.split_value !== null &&
        share.split_value !== undefined
            ? `
                <small>
                    ${escapeHtml(
                        Number(
                            share.split_value
                        ).toLocaleString(
                            undefined,
                            {
                                maximumFractionDigits: 4
                            }
                        )
                    )}%
                </small>
            `
            : '';

    const actions = `
        <div class="expense-share-amount">
            <span>
                ${escapeHtml(label)}
            </span>

            ${splitValueMarkup}

            <strong>
                ${escapeHtml(
                    formatMoney(
                        share.owed_amount,
                        expense.currency
                    )
                )}
            </strong>
        </div>
    `;

    if (share.profile) {
        return createPersonCard(
            share.profile,
            {
                actions,
                className:
                    isCurrentUser
                        ? 'expense-share-person current-user'
                        : 'expense-share-person'
            }
        );
    }

    return `
        <article
            class="
                person-card
                expense-share-person
                ${
                    isCurrentUser
                        ? 'current-user'
                        : ''
                }
            "
        >
            <div
                class="person-avatar"
                aria-hidden="true"
            >
                ?
            </div>

            <div class="person-copy">
                <strong>
                    Group member
                </strong>

                <span>
                    Profile unavailable
                </span>
            </div>

            ${actions}
        </article>
    `;
}


/**
 * Renders the loaded expense.
 */
function renderExpenseDetails(
    details
) {
    const {
        expense,
        payer,
        creator,
        shares
    } = details;

    const payerName =
        getSafeDisplayName(
            payer,
            'Group member'
        );

    const creatorName =
        getSafeDisplayName(
            creator,
            'Group member'
        );

    const payerIsCurrentUser =
        expense.paid_by ===
        currentUser?.id;

    const notesMarkup =
        expense.notes
            ? `
                <section class="expense-detail-section">
                    <span class="expense-detail-label">
                        Notes
                    </span>

                    <p class="expense-detail-notes">
                        ${escapeHtml(
                            expense.notes
                        )}
                    </p>
                </section>
            `
            : '';

    const sharesMarkup =
        shares.length > 0
            ? shares
                .map(
                    (share) =>
                        createShareRow(
                            share,
                            expense
                        )
                )
                .join('')
            : `
                <p class="list-empty">
                    No split information was found.
                </p>
            `;

    elements.content.innerHTML = `
        <section class="expense-detail-hero">
            <div
                class="expense-detail-icon"
                aria-hidden="true"
            >
                $
            </div>

            <span class="expense-detail-date">
                ${escapeHtml(
                    formatExpenseDate(
                        expense.expense_date
                    )
                )}
            </span>

            <h2>
                ${escapeHtml(
                    expense.description
                )}
            </h2>

            <strong class="expense-detail-total">
                ${escapeHtml(
                    formatMoney(
                        expense.total_amount,
                        expense.currency
                    )
                )}
            </strong>

            <p>
                ${
                    payerIsCurrentUser
                        ? 'You paid'
                        : `${escapeHtml(
                            payerName
                        )} paid`
                }
            </p>

            ${createPersonalResultMarkup(
                expense,
                shares
            )}
        </section>

        <section class="expense-detail-summary">
            <div class="expense-detail-summary-row">
                <span>Paid by</span>

                <strong>
                    ${escapeHtml(
                        payerIsCurrentUser
                            ? 'You'
                            : payerName
                    )}
                </strong>
            </div>

            <div class="expense-detail-summary-row">
                <span>
                    Split method
                </span>

                <strong>
                    ${escapeHtml(
                        getSplitMethodLabel(
                            expense.split_method
                        )
                    )}
                </strong>
            </div>

            <div class="expense-detail-summary-row">
                <span>Currency</span>

                <strong>
                    ${escapeHtml(
                        expense.currency
                    )}
                </strong>
            </div>

            <div class="expense-detail-summary-row">
                <span>Added by</span>

                <strong>
                    ${escapeHtml(
                        expense.created_by ===
                        currentUser?.id
                            ? 'You'
                            : creatorName
                    )}
                </strong>
            </div>
        </section>

        ${notesMarkup}

        <section class="expense-detail-section">
            <div class="section-heading">
                <h2>Split details</h2>

                <span>
                    ${shares.length}
                    ${
                        shares.length === 1
                            ? 'person'
                            : 'people'
                    }
                </span>
            </div>

            <div class="people-list expense-share-list">
                ${sharesMarkup}
            </div>
        </section>
    `;
}


/**
 * Returns to Group Details.
 */
function handleBack() {
    if (
        typeof callbacks.onBack ===
        'function'
    ) {
        callbacks.onBack(
            currentExpense?.group_id
        );
    }
}


/**
 * Starts editing the current expense.
 */
function handleEdit() {
    if (
        !currentExpense ||
        deletingExpense
    ) {
        return;
    }

    if (
        typeof callbacks.onEdit ===
        'function'
    ) {
        callbacks.onEdit(
            currentExpense.id,
            currentExpense.group_id
        );

        return;
    }

    setMessage(
        'Expense editing will be added in the next step.'
    );
}


/**
 * Deletes the current expense after confirmation.
 */
async function handleDelete() {
    if (
        !currentExpense ||
        deletingExpense
    ) {
        return;
    }

    const description =
        currentExpense.description ||
        'this expense';

    const confirmed =
        window.confirm(
            `Delete "${description}"?\n\n` +
            'This will permanently remove the expense ' +
            'and all of its split details.'
        );

    if (!confirmed) {
        return;
    }

    const expenseId =
        currentExpense.id;

    const groupId =
        currentExpense.group_id;

    deletingExpense = true;
    setActionsDisabled(true);

    setMessage(
        'Deleting expense...'
    );

    try {
        await deleteExpense(
            expenseId
        );

        currentExpense = null;
        currentDetails = null;

        setMessage('');

        if (
            typeof callbacks.onDeleted ===
            'function'
        ) {
            await callbacks.onDeleted(
                groupId
            );
        } else if (
            typeof callbacks.onBack ===
            'function'
        ) {
            await callbacks.onBack(
                groupId
            );
        }
    } catch (error) {
        setMessage(
            error?.message ||
            'Expense could not be deleted.'
        );

        if (currentExpense) {
            setActionsDisabled(false);
        }
    } finally {
        deletingExpense = false;
    }
}


/**
 * Initializes Expense Details once.
 */
export function initializeExpenseDetailPage(
    options = {}
) {
    callbacks.onBack =
        options.onBack ??
        callbacks.onBack;

    callbacks.onDeleted =
        options.onDeleted ??
        callbacks.onDeleted;

    callbacks.onEdit =
        options.onEdit ??
        callbacks.onEdit;

    if (initialized) {
        return elements.screen;
    }

    createScreenMarkup();
    findElements();

    elements.back.addEventListener(
        'click',
        handleBack
    );

    elements.edit.addEventListener(
        'click',
        handleEdit
    );

    elements.delete.addEventListener(
        'click',
        handleDelete
    );

    initialized = true;

    return elements.screen;
}


/**
 * Opens and loads one expense.
 */
export async function openExpenseDetailPage(
    expenseId,
    user
) {
    if (!initialized) {
        throw new Error(
            'Expense Details page is not initialized.'
        );
    }

    if (
        !expenseId ||
        !user?.id
    ) {
        throw new Error(
            'An expense and signed-in user are required.'
        );
    }

    currentUser = user;
    currentExpense = null;
    currentDetails = null;
    deletingExpense = false;

    setActionsDisabled(true);

    setMessage(
        'Loading expense...'
    );

    elements.content.innerHTML = `
        <p class="list-empty">
            Loading expense details...
        </p>
    `;

    try {
        const details =
            await loadExpenseDetails(
                expenseId
            );

        currentDetails = details;

        currentExpense =
            details.expense;

        renderExpenseDetails(
            details
        );

        setActionsDisabled(false);
        setMessage('');
    } catch (error) {
        elements.content.innerHTML = `
            <p class="list-empty">
                Expense details could not be loaded.
            </p>
        `;

        setActionsDisabled(true);

        setMessage(
            error?.message ||
            'Expense details could not be loaded.'
        );

        throw error;
    }
}


/**
 * Clears Expense Details state on sign-out.
 */
export function resetExpenseDetailPage() {
    currentUser = null;
    currentExpense = null;
    currentDetails = null;
    deletingExpense = false;

    if (!initialized) {
        return;
    }

    setMessage('');
    setActionsDisabled(true);

    elements.content.innerHTML = `
        <p class="list-empty">
            Select an expense to view its details.
        </p>
    `;
}