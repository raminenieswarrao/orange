import {
    createExpense,
    loadExpenseDetails,
    updateExpense,
    SPLIT_METHOD
} from './expenses-service.js';

import {
    resetExpenseSuccessAnimation,
    showExpenseSuccessAnimation
} from './expense-success-animation.js';

import {
    loadGroup,
    loadGroupMembers
} from '../groups/groups-service.js';

import {
    loadProfileMap
} from '../friends/friends-service.js';

import {
    createPersonCard,
    escapeHtml,
    getProfileDisplayName
} from '../shared/person-card.js';

const QUICK_SPLIT = Object.freeze({
    YOU_PAID_EQUAL:
        'YOU_PAID_EQUAL',
    YOU_PAID_OTHER_OWES_ALL:
        'YOU_PAID_OTHER_OWES_ALL',
    OTHER_PAID_YOU_OWE_ALL:
        'OTHER_PAID_YOU_OWE_ALL'
});

let initialized = false;
let currentUser = null;
let currentGroup = null;
let memberships = [];
let profiles = new Map();

let currentExpenseId = null;
let splitMethod = SPLIT_METHOD.EQUAL;
let selectedUserIds = new Set();
let customAmounts = new Map();
let percentageValues = new Map();
let quickSplitPreset = null;

let formValues = {
    description: '',
    totalAmount: '',
    currency: 'USD',
    paidBy: '',
    expenseDate: '',
    notes: ''
};

const callbacks = {
    onCancel: null,
    onSaved: null
};

const elements = {};


/**
 * Adds the Add Expense screen to Orange.
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

    screen.id = 'addExpense';
    screen.className =
        'screen add-expense-screen';

    screen.hidden = true;

    screen.innerHTML = `
        <header class="page-header">
            <button
                id="addExpenseBack"
                class="icon-button"
                type="button"
                aria-label="Back to group"
            >
                ‹
            </button>

            <div>
                <span
                    id="addExpenseEyebrow"
                    class="eyebrow"
                >
                    NEW EXPENSE
                </span>

                <h1 id="addExpenseTitle">
                    Add expense
                </h1>
            </div>

            <span></span>
        </header>

        <p
            id="addExpenseMessage"
            class="page-message"
            role="status"
        ></p>

        <form
            id="addExpenseForm"
            class="expense-form"
        >
            <section
                id="addExpenseFields"
                class="expense-form-card"
            >
                <p class="list-empty">
                    Loading group...
                </p>
            </section>
        </form>
    `;

    appShell.appendChild(screen);
}


/**
 * Finds stable Add Expense elements.
 */
function findElements() {
    elements.screen =
        document.querySelector('#addExpense');

    elements.back =
        document.querySelector('#addExpenseBack');

    elements.message =
        document.querySelector('#addExpenseMessage');

    elements.eyebrow =
        document.querySelector('#addExpenseEyebrow');

    elements.title =
        document.querySelector('#addExpenseTitle');

    elements.form =
        document.querySelector('#addExpenseForm');

    elements.fields =
        document.querySelector('#addExpenseFields');
}


/**
 * Returns today's date using the user's local timezone.
 */
function getTodayValue() {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(
        today.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
        today.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
}


/**
 * Returns true while an existing expense is being edited.
 */
function isEditMode() {
    return Boolean(currentExpenseId);
}


/**
 * Updates the page heading for create or edit mode.
 */
function updatePageHeading() {
    const editing = isEditMode();

    elements.eyebrow.textContent =
        editing
            ? 'EDIT EXPENSE'
            : 'NEW EXPENSE';

    elements.title.textContent =
        editing
            ? 'Edit expense'
            : 'Add expense';
}


/**
 * Resets values that are rendered into the form.
 */
function resetFormValues(userId = '') {
    formValues = {
        description: '',
        totalAmount: '',
        currency: 'USD',
        paidBy: userId,
        expenseDate: getTodayValue(),
        notes: ''
    };
}


/**
 * Displays an Add Expense message.
 */
function setMessage(message = '') {
    elements.message.textContent = message;
}


/**
 * Returns a profile for a membership.
 */
function getMembershipProfile(membership) {
    return profiles.get(
        membership.user_id
    ) ?? null;
}


/**
 * Creates the payer options.
 */
function createPayerOptions() {
    return memberships
        .map((membership) => {
            const profile =
                getMembershipProfile(membership);

            if (!profile) {
                return '';
            }

            const selected =
                membership.user_id ===
                    formValues.paidBy
                    ? 'selected'
                    : '';

            return `
                <option
                    value="${escapeHtml(membership.user_id)}"
                    ${selected}
                >
                    ${escapeHtml(
                        getProfileDisplayName(profile)
                    )}
                </option>
            `;
        })
        .join('');
}


/**
 * Creates faster choices for a two-person expense.
 */
function createQuickSplitMarkup() {
    if (memberships.length !== 2) {
        return '';
    }

    const createButton = (
        preset,
        title,
        description
    ) => `
        <button
            class="expense-quick-split ${
                quickSplitPreset === preset
                    ? 'active'
                    : ''
            }"
            data-quick-split="${preset}"
            type="button"
            aria-pressed="${
                quickSplitPreset === preset
            }"
        >
            <strong>${title}</strong>
            <span>${description}</span>
        </button>
    `;

    return `
        <div class="expense-field expense-quick-split-field">
            <span class="expense-section-title">
                Quick split
            </span>

            <div class="expense-quick-splits">
                ${createButton(
                    QUICK_SPLIT.YOU_PAID_EQUAL,
                    'You paid',
                    'Split equally'
                )}

                ${createButton(
                    QUICK_SPLIT.YOU_PAID_OTHER_OWES_ALL,
                    'You paid',
                    'They owe the full amount'
                )}

                ${createButton(
                    QUICK_SPLIT.OTHER_PAID_YOU_OWE_ALL,
                    'They paid',
                    'You owe the full amount'
                )}
            </div>
        </div>
    `;
}


/**
 * Renders the form fields after group data loads.
 */
function renderForm() {
    elements.fields.innerHTML = `
        <div class="expense-field">
            <label for="expenseDescription">
                Description
            </label>

            <input
                id="expenseDescription"
                type="text"
                minlength="1"
                maxlength="160"
                value="${escapeHtml(
                    formValues.description
                )}"
                placeholder="Dinner, fuel, hotel..."
                autocomplete="off"
                required
            >
        </div>

        <div class="expense-field">
            <label for="expenseAmount">
                Amount
            </label>

            <div class="expense-amount-row">
                <select
                    id="expenseCurrency"
                    aria-label="Currency"
                >
                    <option
                        value="${escapeHtml(
                            formValues.currency
                        )}"
                    >
                        ${escapeHtml(
                            formValues.currency
                        )}
                    </option>
                </select>

                <div class="expense-amount-input">
                    <span aria-hidden="true">
                        $
                    </span>

                    <input
                        id="expenseAmount"
                        type="number"
                        min="0.01"
                        max="999999999999.99"
                        step="0.01"
                        inputmode="decimal"
                        value="${escapeHtml(
                            formValues.totalAmount
                        )}"
                        placeholder="0.00"
                        required
                    >
                </div>
            </div>
        </div>

        <div class="expense-field">
            <label for="expensePaidBy">
                Paid by
            </label>

            <select
                id="expensePaidBy"
                required
            >
                ${createPayerOptions()}
            </select>
        </div>

        ${createQuickSplitMarkup()}

        <div class="expense-field">
            <span class="expense-section-title">
                Split method
            </span>

            <div
                class="expense-split-tabs"
                role="tablist"
                aria-label="Split method"
            >
                <button
                    class="expense-split-tab ${
                        splitMethod ===
                        SPLIT_METHOD.EQUAL
                            ? 'active'
                            : ''
                    }"
                    data-split-method="EQUAL"
                    type="button"
                    role="tab"
                    aria-selected="${
                        splitMethod ===
                        SPLIT_METHOD.EQUAL
                    }"
                >
                    Split equally
                </button>

                <button
                    class="expense-split-tab ${
                        splitMethod ===
                        SPLIT_METHOD.CUSTOM
                            ? 'active'
                            : ''
                    }"
                    data-split-method="CUSTOM"
                    type="button"
                    role="tab"
                    aria-selected="${
                        splitMethod ===
                        SPLIT_METHOD.CUSTOM
                    }"
                >
                    Exact amounts
                </button>

                <button
                    class="expense-split-tab ${
                        splitMethod ===
                        SPLIT_METHOD.PERCENTAGE
                            ? 'active'
                            : ''
                    }"
                    data-split-method="PERCENTAGE"
                    type="button"
                    role="tab"
                    aria-selected="${
                        splitMethod ===
                        SPLIT_METHOD.PERCENTAGE
                    }"
                >
                    Percentages
                </button>
            </div>
        </div>

        <div class="expense-field">
            <span class="expense-section-title">
                Split between
            </span>

            <div
                id="expenseParticipants"
                class="expense-participants people-list"
            ></div>
        </div>

        <div
            id="expenseSplitSummary"
            class="expense-split-summary"
        ></div>

        <div class="expense-field">
            <label for="expenseDate">
                Date
            </label>

            <input
                id="expenseDate"
                type="date"
                value="${escapeHtml(
                    formValues.expenseDate
                )}"
                required
            >
        </div>

        <div class="expense-field">
            <label for="expenseNotes">
                Notes
                <span aria-hidden="true">
                    ·
                </span>
                Optional
            </label>

            <textarea
                id="expenseNotes"
                maxlength="1000"
                placeholder="Add any useful details"
            >${escapeHtml(
                formValues.notes
            )}</textarea>
        </div>

        <div class="expense-form-actions">
            <button
                id="cancelExpense"
                class="small-button quiet"
                type="button"
            >
                Cancel
            </button>

            <button
                id="saveExpense"
                class="primary-button"
                type="submit"
            >
                ${isEditMode()
                    ? 'Save changes'
                    : 'Save expense'}
            </button>
        </div>
    `;

    findDynamicElements();
    bindDynamicEvents();
    renderParticipants();
}


/**
 * Finds elements created inside the form.
 */
function findDynamicElements() {
    elements.description =
        document.querySelector(
            '#expenseDescription'
        );

    elements.amount =
        document.querySelector('#expenseAmount');

    elements.currency =
        document.querySelector('#expenseCurrency');

    elements.paidBy =
        document.querySelector('#expensePaidBy');

    elements.participants =
        document.querySelector(
            '#expenseParticipants'
        );

    elements.summary =
        document.querySelector(
            '#expenseSplitSummary'
        );

    elements.date =
        document.querySelector('#expenseDate');

    elements.notes =
        document.querySelector('#expenseNotes');

    elements.cancel =
        document.querySelector('#cancelExpense');

    elements.save =
        document.querySelector('#saveExpense');
}


/**
 * Connects events for the newly rendered form.
 */
function bindDynamicEvents() {
    elements.fields
        .querySelectorAll('[data-quick-split]')
        .forEach((button) => {
            button.addEventListener(
                'click',
                handleQuickSplitClick
            );
        });

    elements.fields
        .querySelectorAll('[data-split-method]')
        .forEach((button) => {
            button.addEventListener(
                'click',
                handleSplitMethodChange
            );
        });

    elements.participants.addEventListener(
        'click',
        handleParticipantClick
    );

    elements.participants.addEventListener(
        'keydown',
        handleParticipantKeydown
    );

    elements.participants.addEventListener(
        'input',
        handleShareValueInput
    );

    elements.amount.addEventListener(
        'input',
        handleTotalAmountInput
    );

    elements.paidBy.addEventListener(
        'change',
        clearQuickSplitPreset
    );

    elements.cancel.addEventListener(
        'click',
        handleCancel
    );
}


/**
 * Returns the current amount as a number.
 */
function getTotalAmount() {
    const amount =
        Number(elements.amount?.value);

    return Number.isFinite(amount)
        ? Math.round(
            (amount + Number.EPSILON) * 100
        ) / 100
        : 0;
}


/**
 * Returns the other member of a two-person group.
 */
function getOtherUserId() {
    if (
        memberships.length !== 2 ||
        !currentUser?.id
    ) {
        return null;
    }

    return memberships.find(
        (membership) =>
            membership.user_id !==
            currentUser.id
    )?.user_id ?? null;
}


/**
 * Updates which quick-split button appears selected.
 */
function updateQuickSplitButtons() {
    elements.fields
        .querySelectorAll('[data-quick-split]')
        .forEach((button) => {
            const active =
                button.dataset.quickSplit ===
                quickSplitPreset;

            button.classList.toggle(
                'active',
                active
            );

            button.setAttribute(
                'aria-pressed',
                String(active)
            );
        });
}


/**
 * Clears a shortcut when the user customizes the form.
 */
function clearQuickSplitPreset() {
    quickSplitPreset = null;
    updateQuickSplitButtons();
}


/**
 * Updates the selected split-method tab.
 */
function updateSplitMethodButtons() {
    elements.fields
        .querySelectorAll('[data-split-method]')
        .forEach((button) => {
            const active =
                button.dataset.splitMethod ===
                splitMethod;

            button.classList.toggle(
                'active',
                active
            );

            button.setAttribute(
                'aria-selected',
                String(active)
            );
        });
}


/**
 * Synchronizes exact amounts used by full-amount shortcuts.
 */
function syncQuickSplitAmounts() {
    const otherUserId = getOtherUserId();

    if (!otherUserId || !currentUser?.id) {
        return;
    }

    const total =
        getTotalAmount().toFixed(2);

    if (
        quickSplitPreset ===
        QUICK_SPLIT.YOU_PAID_OTHER_OWES_ALL
    ) {
        customAmounts = new Map([
            [currentUser.id, '0.00'],
            [otherUserId, total]
        ]);
    }

    if (
        quickSplitPreset ===
        QUICK_SPLIT.OTHER_PAID_YOU_OWE_ALL
    ) {
        customAmounts = new Map([
            [currentUser.id, total],
            [otherUserId, '0.00']
        ]);
    }
}


/**
 * Applies one two-person shortcut.
 */
function applyQuickSplitPreset(preset) {
    const otherUserId = getOtherUserId();

    if (!otherUserId || !currentUser?.id) {
        return;
    }

    quickSplitPreset = preset;
    selectedUserIds = new Set(
        memberships.map(
            (membership) =>
                membership.user_id
        )
    );

    percentageValues = new Map();

    if (
        preset ===
        QUICK_SPLIT.YOU_PAID_EQUAL
    ) {
        splitMethod = SPLIT_METHOD.EQUAL;
        customAmounts = new Map();
        formValues.paidBy = currentUser.id;
        elements.paidBy.value = currentUser.id;
    }

    if (
        preset ===
        QUICK_SPLIT.YOU_PAID_OTHER_OWES_ALL
    ) {
        splitMethod = SPLIT_METHOD.CUSTOM;
        formValues.paidBy = currentUser.id;
        elements.paidBy.value = currentUser.id;
        syncQuickSplitAmounts();
    }

    if (
        preset ===
        QUICK_SPLIT.OTHER_PAID_YOU_OWE_ALL
    ) {
        splitMethod = SPLIT_METHOD.CUSTOM;
        formValues.paidBy = otherUserId;
        elements.paidBy.value = otherUserId;
        syncQuickSplitAmounts();
    }

    updateQuickSplitButtons();
    updateSplitMethodButtons();
    renderParticipants();
}


/**
 * Handles a two-person quick-split choice.
 */
function handleQuickSplitClick(event) {
    applyQuickSplitPreset(
        event.currentTarget.dataset.quickSplit
    );
}


/**
 * Recalculates shortcut values when the total changes.
 */
function handleTotalAmountInput() {
    if (
        quickSplitPreset ===
            QUICK_SPLIT.YOU_PAID_OTHER_OWES_ALL ||
        quickSplitPreset ===
            QUICK_SPLIT.OTHER_PAID_YOU_OWE_ALL
    ) {
        syncQuickSplitAmounts();
        renderParticipants();
        return;
    }

    updateSplitSummary();
}


/**
 * Creates the participant action area.
 */
function createParticipantAction(
    userId,
    selected
) {
    if (
        splitMethod ===
            SPLIT_METHOD.CUSTOM &&
        selected
    ) {
        const amount =
            customAmounts.get(userId) ?? '';

        return `
            <div class="expense-participant-action">
                <input
                    class="custom-share-input"
                    data-custom-user-id="${escapeHtml(userId)}"
                    type="number"
                    min="0"
                    step="0.01"
                    inputmode="decimal"
                    value="${escapeHtml(String(amount))}"
                    placeholder="0.00"
                    aria-label="Exact share amount"
                >
            </div>
        `;
    }

    if (
        splitMethod ===
            SPLIT_METHOD.PERCENTAGE &&
        selected
    ) {
        const percentage =
            percentageValues.get(userId) ?? '';

        return `
            <div class="expense-participant-action">
                <input
                    class="custom-share-input percentage-share-input"
                    data-percentage-user-id="${escapeHtml(userId)}"
                    type="number"
                    min="0.0001"
                    max="100"
                    step="0.0001"
                    inputmode="decimal"
                    value="${escapeHtml(String(percentage))}"
                    placeholder="0.00%"
                    aria-label="Percentage share"
                >
            </div>
        `;
    }

    return `
        <div class="expense-participant-action">
            <span
                class="expense-participant-check"
                aria-hidden="true"
            >
                ${selected ? '✓' : ''}
            </span>
        </div>
    `;
}


/**
 * Renders all selectable group members.
 */
function renderParticipants() {
    elements.participants.innerHTML =
        memberships
            .map((membership) => {
                const profile =
                    getMembershipProfile(
                        membership
                    );

                const selected =
                    selectedUserIds.has(
                        membership.user_id
                    );

                return createPersonCard(
                    profile,
                    {
                        actions:
                            createParticipantAction(
                                membership.user_id,
                                selected
                            ),
                        className:
                            'expense-participant',
                        selectable: true,
                        selected
                    }
                );
            })
            .join('');

    updateSplitSummary();
}


/**
 * Seeds equal percentage values for selected people.
 */
function seedEqualPercentages() {
    const userIds = [
        ...selectedUserIds
    ];

    percentageValues = new Map();

    if (userIds.length === 0) {
        return;
    }

    const basePercentage =
        Math.floor(
            (100 / userIds.length) *
            10000
        ) / 10000;

    let assigned = 0;

    userIds.forEach((userId, index) => {
        const isLast =
            index === userIds.length - 1;

        const percentage = isLast
            ? Math.round(
                (
                    100 - assigned +
                    Number.EPSILON
                ) * 10000
            ) / 10000
            : basePercentage;

        percentageValues.set(
            userId,
            percentage
        );

        assigned += percentage;
    });
}


/**
 * Changes between the available split methods.
 */
function handleSplitMethodChange(event) {
    clearQuickSplitPreset();

    splitMethod =
        event.currentTarget.dataset.splitMethod;

    if (
        splitMethod ===
            SPLIT_METHOD.PERCENTAGE &&
        percentageValues.size === 0
    ) {
        seedEqualPercentages();
    }

    updateSplitMethodButtons();

    renderParticipants();
}


/**
 * Toggles one participant.
 */
function toggleParticipant(userId) {
    if (!userId) {
        return;
    }

    clearQuickSplitPreset();

    if (selectedUserIds.has(userId)) {
        selectedUserIds.delete(userId);
    } else {
        selectedUserIds.add(userId);
    }

    renderParticipants();
}


/**
 * Handles participant mouse selection.
 */
function handleParticipantClick(event) {
    if (
        event.target.closest(
            '.custom-share-input'
        )
    ) {
        return;
    }

    const card = event.target.closest(
        '.expense-participant'
    );

    if (
        !card ||
        !elements.participants.contains(card)
    ) {
        return;
    }

    toggleParticipant(
        card.dataset.userId
    );
}


/**
 * Handles participant keyboard selection.
 */
function handleParticipantKeydown(event) {
    if (
        event.key !== 'Enter' &&
        event.key !== ' '
    ) {
        return;
    }

    if (
        event.target.closest(
            '.custom-share-input'
        )
    ) {
        return;
    }

    const card = event.target.closest(
        '.expense-participant'
    );

    if (!card) {
        return;
    }

    event.preventDefault();

    toggleParticipant(
        card.dataset.userId
    );
}


/**
 * Stores an entered exact amount or percentage.
 */
function handleShareValueInput(event) {
    const customInput = event.target.closest(
        '[data-custom-user-id]'
    );

    if (customInput) {
        clearQuickSplitPreset();

        customAmounts.set(
            customInput.dataset.customUserId,
            customInput.value
        );

        updateSplitSummary();
        return;
    }

    const percentageInput =
        event.target.closest(
            '[data-percentage-user-id]'
        );

    if (!percentageInput) {
        return;
    }

    clearQuickSplitPreset();

    percentageValues.set(
        percentageInput.dataset.percentageUserId,
        percentageInput.value
    );

    updateSplitSummary();
}


/**
 * Calculates the entered custom-share total.
 */
function getCustomTotal() {
    return [
        ...selectedUserIds
    ].reduce(
        (sum, userId) => {
            const value = Number(
                customAmounts.get(userId)
            );

            return sum + (
                Number.isFinite(value)
                    ? value
                    : 0
            );
        },
        0
    );
}


/**
 * Calculates the entered percentage total.
 */
function getPercentageTotal() {
    return [
        ...selectedUserIds
    ].reduce(
        (sum, userId) => {
            const value = Number(
                percentageValues.get(userId)
            );

            return sum + (
                Number.isFinite(value)
                    ? value
                    : 0
            );
        },
        0
    );
}


/**
 * Updates the split summary.
 */
function updateSplitSummary() {
    const total = getTotalAmount();
    const participantCount =
        selectedUserIds.size;

    elements.summary.classList.remove(
        'invalid'
    );

    if (participantCount === 0) {
        elements.summary.innerHTML = `
            <span>No participants selected</span>
            <strong>$0.00</strong>
        `;

        elements.summary.classList.add(
            'invalid'
        );
        return;
    }

    if (
        splitMethod ===
        SPLIT_METHOD.EQUAL
    ) {
        const average =
            total / participantCount;

        elements.summary.innerHTML = `
            <span>
                ${participantCount}
                ${participantCount === 1
                    ? 'person'
                    : 'people'}
            </span>

            <strong>
                About $${average.toFixed(2)} each
            </strong>
        `;
        return;
    }

    if (
        splitMethod ===
        SPLIT_METHOD.PERCENTAGE
    ) {
        const percentageTotal =
            Math.round(
                (
                    getPercentageTotal() +
                    Number.EPSILON
                ) * 10000
            ) / 10000;

        const matches =
            percentageTotal === 100 &&
            total > 0;

        elements.summary.innerHTML = `
            <span>
                Percentage total
            </span>

            <strong>
                ${percentageTotal.toFixed(2)}%
                of
                100%
            </strong>
        `;

        elements.summary.classList.toggle(
            'invalid',
            !matches
        );
        return;
    }

    const customTotal =
        Math.round(
            (
                getCustomTotal() +
                Number.EPSILON
            ) * 100
        ) / 100;

    const matches =
        customTotal === total &&
        total > 0;

    elements.summary.innerHTML = `
        <span>
            Exact shares total
        </span>

        <strong>
            $${customTotal.toFixed(2)}
            of
            $${total.toFixed(2)}
        </strong>
    `;

    elements.summary.classList.toggle(
        'invalid',
        !matches
    );
}


/**
 * Builds the share payload for saving.
 */
function buildShares() {
    return [
        ...selectedUserIds
    ].map((userId) => {
        const share = {
            userId
        };

        if (
            splitMethod ===
            SPLIT_METHOD.CUSTOM
        ) {
            share.owedAmount =
                customAmounts.get(userId);
        }

        if (
            splitMethod ===
            SPLIT_METHOD.PERCENTAGE
        ) {
            share.percentage =
                percentageValues.get(userId);
        }

        return share;
    });
}


/**
 * Saves the expense.
 */
async function handleSubmit(event) {
    event.preventDefault();

    if (!currentGroup || !currentUser) {
        return;
    }

    elements.save.disabled = true;
    elements.cancel.disabled = true;

    const editing = isEditMode();

    setMessage(
        editing
            ? 'Saving changes...'
            : 'Saving expense...'
    );

    try {
        const expenseInput = {
            description:
                elements.description.value,
            totalAmount:
                elements.amount.value,
            currency:
                elements.currency.value,
            paidBy:
                elements.paidBy.value,
            splitMethod,
            expenseDate:
                elements.date.value,
            notes:
                elements.notes.value,
            shares: buildShares()
        };

        const savedExpense = editing
            ? await updateExpense({
                expenseId:
                    currentExpenseId,
                ...expenseInput
            })
            : await createExpense({
                groupId: currentGroup.id,
                ...expenseInput
            });

        setMessage('');

        await showExpenseSuccessAnimation(
            editing
        );

        if (
            typeof callbacks.onSaved ===
            'function'
        ) {
            callbacks.onSaved(
                currentGroup.id,
                currentExpenseId ??
                    savedExpense?.id ??
                    savedExpense?.[0]?.id ??
                    null,
                editing ? 'edit' : 'create'
            );
        }
    } catch (error) {
        setMessage(error.message);
    } finally {
        elements.save.disabled = false;
        elements.cancel.disabled = false;
    }
}


/**
 * Returns to Group Details without saving.
 */
function handleCancel() {
    if (
        typeof callbacks.onCancel ===
        'function'
    ) {
        callbacks.onCancel(
            currentGroup?.id,
            currentExpenseId
        );
    }
}


/**
 * Initializes Add Expense once.
 */
export function initializeAddExpensePage(
    options = {}
) {
    callbacks.onCancel =
        options.onCancel ??
        callbacks.onCancel;

    callbacks.onSaved =
        options.onSaved ??
        callbacks.onSaved;

    if (initialized) {
        return elements.screen;
    }

    createScreenMarkup();
    findElements();

    elements.back.addEventListener(
        'click',
        handleCancel
    );

    elements.form.addEventListener(
        'submit',
        handleSubmit
    );

    initialized = true;

    return elements.screen;
}


/**
 * Opens a fresh Add Expense form.
 */
export async function openAddExpensePage(
    groupId,
    user
) {
    if (!initialized) {
        throw new Error(
            'Add Expense page is not initialized.'
        );
    }

    if (!groupId || !user?.id) {
        throw new Error(
            'A group and signed-in user are required.'
        );
    }

    resetExpenseSuccessAnimation();

    currentUser = user;
    currentGroup = null;
    currentExpenseId = null;
    splitMethod = SPLIT_METHOD.EQUAL;
    customAmounts = new Map();
    percentageValues = new Map();
    quickSplitPreset = null;
    selectedUserIds = new Set();
    resetFormValues(user.id);

    updatePageHeading();

    setMessage('');

    elements.fields.innerHTML = `
        <p class="list-empty">
            Loading group members...
        </p>
    `;

    try {
        const [
            group,
            groupMemberships
        ] = await Promise.all([
            loadGroup(groupId),
            loadGroupMembers(groupId)
        ]);

        currentGroup = group;
        memberships = groupMemberships;

        formValues.currency =
            group.default_currency || 'USD';

        profiles = await loadProfileMap(
            memberships.map(
                (membership) =>
                    membership.user_id
            )
        );

        selectedUserIds = new Set(
            memberships.map(
                (membership) =>
                    membership.user_id
            )
        );

        if (memberships.length === 2) {
            quickSplitPreset =
                QUICK_SPLIT.YOU_PAID_EQUAL;
        }

        renderForm();

        elements.description.focus();
    } catch (error) {
        elements.fields.innerHTML = '';
        setMessage(error.message);
        throw error;
    }
}


/**
 * Opens an existing expense in edit mode.
 */
export async function openEditExpensePage(
    expenseId,
    user
) {
    if (!initialized) {
        throw new Error(
            'Add Expense page is not initialized.'
        );
    }

    if (!expenseId || !user?.id) {
        throw new Error(
            'An expense and signed-in user are required.'
        );
    }

    resetExpenseSuccessAnimation();

    currentUser = user;
    currentGroup = null;
    currentExpenseId = expenseId;
    splitMethod = SPLIT_METHOD.EQUAL;
    selectedUserIds = new Set();
    customAmounts = new Map();
    percentageValues = new Map();
    quickSplitPreset = null;
    resetFormValues(user.id);

    updatePageHeading();
    setMessage('');

    elements.fields.innerHTML = `
        <p class="list-empty">
            Loading expense...
        </p>
    `;

    try {
        const details =
            await loadExpenseDetails(
                expenseId
            );

        const expense = details.expense;

        const [
            group,
            groupMemberships
        ] = await Promise.all([
            loadGroup(expense.group_id),
            loadGroupMembers(expense.group_id)
        ]);

        currentGroup = group;
        memberships = groupMemberships;

        profiles = await loadProfileMap(
            memberships.map(
                (membership) =>
                    membership.user_id
            )
        );

        const memberIds = new Set(
            memberships.map(
                (membership) =>
                    membership.user_id
            )
        );

        selectedUserIds = new Set(
            details.shares
                .map(
                    (share) => share.user_id
                )
                .filter(
                    (userId) =>
                        memberIds.has(userId)
                )
        );

        splitMethod =
            Object.values(SPLIT_METHOD)
                .includes(
                    expense.split_method
                )
                ? expense.split_method
                : SPLIT_METHOD.EQUAL;

        if (
            splitMethod ===
            SPLIT_METHOD.CUSTOM
        ) {
            customAmounts = new Map(
                details.shares.map(
                    (share) => [
                        share.user_id,
                        String(
                            share.owed_amount
                        )
                    ]
                )
            );
        }

        if (
            splitMethod ===
            SPLIT_METHOD.PERCENTAGE
        ) {
            percentageValues = new Map(
                details.shares.map(
                    (share) => [
                        share.user_id,
                        String(
                            share.split_value ?? ''
                        )
                    ]
                )
            );
        }

        formValues = {
            description:
                expense.description ?? '',
            totalAmount:
                String(
                    expense.total_amount ?? ''
                ),
            currency:
                expense.currency ||
                group.default_currency ||
                'USD',
            paidBy:
                expense.paid_by ?? user.id,
            expenseDate:
                expense.expense_date ||
                getTodayValue(),
            notes:
                expense.notes ?? ''
        };

        renderForm();

        elements.description.focus();
    } catch (error) {
        elements.fields.innerHTML = '';
        setMessage(error.message);
        throw error;
    }
}


/**
 * Clears Add Expense state on sign-out.
 */
export function resetAddExpensePage() {
    resetExpenseSuccessAnimation();

    currentUser = null;
    currentGroup = null;
    currentExpenseId = null;
    memberships = [];
    profiles = new Map();
    selectedUserIds = new Set();
    customAmounts = new Map();
    percentageValues = new Map();
    quickSplitPreset = null;
    splitMethod = SPLIT_METHOD.EQUAL;
    resetFormValues();

    if (!initialized) {
        return;
    }

    elements.fields.innerHTML = '';
    setMessage('');
}