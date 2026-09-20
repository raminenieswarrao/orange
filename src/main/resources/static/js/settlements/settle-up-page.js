import {
    loadGroup,
    loadGroupMembers
} from '../groups/groups-service.js';

import {
    loadProfileMap
} from '../friends/friends-service.js';

import {
    createSettlement
} from './settlements-service.js';

import {
    escapeHtml,
    getProfileDisplayName
} from '../shared/person-card.js';


let initialized = false;

let currentUser = null;
let currentGroup = null;
let currentMemberships = [];
let currentProfileMap = new Map();

const callbacks = {
    onCancel: null,
    onSaved: null
};

const elements = {};


/**
 * Adds the Settle Up screen to the Orange shell.
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

    screen.id = 'settleUp';
    screen.className =
        'screen settle-up-screen';

    screen.hidden = true;

    screen.innerHTML = `
        <header class="page-header">
            <button
                id="settleUpBack"
                class="icon-button"
                type="button"
                aria-label="Back to group"
            >
                ‹
            </button>

            <div>
                <span class="eyebrow">
                    SETTLEMENT
                </span>

                <h1>Settle up</h1>
            </div>

            <div
                class="page-header-spacer"
                aria-hidden="true"
            ></div>
        </header>

        <p
            id="settleUpMessage"
            class="page-message"
            role="status"
        ></p>

        <div id="settleUpContent">
            <p class="list-empty">
                Loading settlement...
            </p>
        </div>
    `;

    appShell.appendChild(screen);
}


/**
 * Finds screen elements.
 */
function findElements() {
    elements.screen =
        document.querySelector(
            '#settleUp'
        );

    elements.back =
        document.querySelector(
            '#settleUpBack'
        );

    elements.message =
        document.querySelector(
            '#settleUpMessage'
        );

    elements.content =
        document.querySelector(
            '#settleUpContent'
        );
}


/**
 * Displays a page-level message.
 */
function setMessage(message = '') {
    elements.message.textContent =
        message;
}


/**
 * Runs a callback when supplied.
 */
function runCallback(
    callback,
    ...args
) {
    if (typeof callback === 'function') {
        callback(...args);
    }
}


/**
 * Returns an HTML option for one profile.
 */
function createPersonOption(
    membership,
    selectedUserId = null
) {
    const profile =
        currentProfileMap.get(
            membership.user_id
        );

    const displayName =
        getProfileDisplayName(
            profile
        );

    const selected =
        membership.user_id ===
        selectedUserId
            ? 'selected'
            : '';

    return `
        <option
            value="${escapeHtml(
                membership.user_id
            )}"
            ${selected}
        >
            ${escapeHtml(displayName)}
        </option>
    `;
}


/**
 * Updates receiver options so the same
 * person cannot be both sender and receiver.
 */
function updateReceiverOptions() {
    if (
        !elements.paidBy ||
        !elements.paidTo
    ) {
        return;
    }

    const paidBy =
        elements.paidBy.value;

    const currentPaidTo =
        elements.paidTo.value;

    const receiverMemberships =
        currentMemberships.filter(
            (membership) =>
                membership.user_id !==
                paidBy
        );

    elements.paidTo.innerHTML =
        receiverMemberships
            .map(
                (membership) =>
                    createPersonOption(
                        membership,
                        currentPaidTo
                    )
            )
            .join('');

    if (
        receiverMemberships.length > 0 &&
        !receiverMemberships.some(
            (membership) =>
                membership.user_id ===
                currentPaidTo
        )
    ) {
        elements.paidTo.value =
            receiverMemberships[0]
                .user_id;
    }
}


/**
 * Renders the settlement form.
 */
function renderSettlementForm(
    options = {}
) {
    const {
        paidBy = currentUser?.id ?? null,
        paidTo = null,
        amount = null
    } = options;

    const senderId =
        currentMemberships.some(
            (membership) =>
                membership.user_id ===
                paidBy
        )
            ? paidBy
            : currentMemberships[0]
                ?.user_id ?? null;

    const availableReceivers =
        currentMemberships.filter(
            (membership) =>
                membership.user_id !==
                senderId
        );

    const receiverId =
        availableReceivers.some(
            (membership) =>
                membership.user_id ===
                paidTo
        )
            ? paidTo
            : availableReceivers[0]
                ?.user_id ?? null;

    const amountValue =
        Number.isFinite(
            Number(amount)
        ) &&
        Number(amount) > 0
            ? Number(amount).toFixed(2)
            : '';

    elements.content.innerHTML = `
        <form
            id="settleUpForm"
            class="settle-up-form"
            novalidate
        >
            <article class="settle-up-card">
                <div class="settle-up-heading">
                    <span>
                        ${escapeHtml(
                            currentGroup.default_currency
                        )}
                    </span>

                    <h2>
                        Record a payment
                    </h2>

                    <p>
                        Record money that moved between
                        members of this group.
                    </p>
                </div>

                <div class="settle-up-field">
                    <label for="settleUpPaidBy">
                        Who paid?
                    </label>

                    <select
                        id="settleUpPaidBy"
                        required
                    >
                        ${currentMemberships
                            .map(
                                (membership) =>
                                    createPersonOption(
                                        membership,
                                        senderId
                                    )
                            )
                            .join('')}
                    </select>
                </div>

                <div class="settle-up-direction">
                    <span aria-hidden="true">
                        ↓
                    </span>
                </div>

                <div class="settle-up-field">
                    <label for="settleUpPaidTo">
                        Who received the payment?
                    </label>

                    <select
                        id="settleUpPaidTo"
                        required
                    >
                        ${availableReceivers
                            .map(
                                (membership) =>
                                    createPersonOption(
                                        membership,
                                        receiverId
                                    )
                            )
                            .join('')}
                    </select>
                </div>

                <div class="settle-up-field">
                    <label for="settleUpAmount">
                        Amount
                    </label>

                    <div class="settle-up-money-input">
                        <span>
                            ${escapeHtml(
                                currentGroup.default_currency
                            )}
                        </span>

                        <input
                            id="settleUpAmount"
                            type="number"
                            inputmode="decimal"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            value="${escapeHtml(
                                amountValue
                            )}"
                            required
                        >
                    </div>
                </div>

                <div class="settle-up-field">
                    <label for="settleUpNotes">
                        Note
                        <span>
                            Optional
                        </span>
                    </label>

                    <textarea
                        id="settleUpNotes"
                        rows="3"
                        maxlength="500"
                        placeholder="Cash, Venmo, bank transfer..."
                    ></textarea>
                </div>
            </article>

            <div class="settle-up-actions">
                <button
                    id="settleUpCancel"
                    class="secondary-button"
                    type="button"
                >
                    Cancel
                </button>

                <button
                    id="settleUpSave"
                    class="primary-button"
                    type="submit"
                >
                    Record payment
                </button>
            </div>
        </form>
    `;

    findFormElements();
    bindFormEvents();
}


/**
 * Finds form-specific elements after rendering.
 */
function findFormElements() {
    elements.form =
        document.querySelector(
            '#settleUpForm'
        );

    elements.paidBy =
        document.querySelector(
            '#settleUpPaidBy'
        );

    elements.paidTo =
        document.querySelector(
            '#settleUpPaidTo'
        );

    elements.amount =
        document.querySelector(
            '#settleUpAmount'
        );

    elements.notes =
        document.querySelector(
            '#settleUpNotes'
        );

    elements.cancel =
        document.querySelector(
            '#settleUpCancel'
        );

    elements.save =
        document.querySelector(
            '#settleUpSave'
        );
}


/**
 * Enables or disables form controls while saving.
 */
function setSaving(saving) {
    if (elements.paidBy) {
        elements.paidBy.disabled =
            saving;
    }

    if (elements.paidTo) {
        elements.paidTo.disabled =
            saving;
    }

    if (elements.amount) {
        elements.amount.disabled =
            saving;
    }

    if (elements.notes) {
        elements.notes.disabled =
            saving;
    }

    if (elements.cancel) {
        elements.cancel.disabled =
            saving;
    }

    if (elements.save) {
        elements.save.disabled =
            saving;

        elements.save.textContent =
            saving
                ? 'Saving...'
                : 'Record payment';
    }
}


/**
 * Handles sender changes.
 */
function handlePaidByChange() {
    updateReceiverOptions();
}


/**
 * Cancels without writing anything.
 */
function handleCancel() {
    if (!currentGroup?.id) {
        return;
    }

    runCallback(
        callbacks.onCancel,
        currentGroup.id
    );
}


/**
 * Saves the settlement.
 */
async function handleSubmit(event) {
    event.preventDefault();

    setMessage('');

    if (
        !currentGroup?.id ||
        !currentUser?.id
    ) {
        setMessage(
            'A signed-in user and group are required.'
        );
        return;
    }

    const paidBy =
        elements.paidBy.value;

    const paidTo =
        elements.paidTo.value;

    const amount =
        elements.amount.value;

    const notes =
        elements.notes.value;

    if (!paidBy) {
        setMessage(
            'Select who paid.'
        );
        return;
    }

    if (!paidTo) {
        setMessage(
            'Select who received the payment.'
        );
        return;
    }

    if (paidBy === paidTo) {
        setMessage(
            'The sender and receiver must be different people.'
        );
        return;
    }

    const numericAmount =
        Number(amount);

    if (
        !Number.isFinite(
            numericAmount
        ) ||
        numericAmount <= 0
    ) {
        setMessage(
            'Enter a settlement amount greater than zero.'
        );

        elements.amount.focus();

        return;
    }

    setSaving(true);

    try {
        const settlement =
            await createSettlement({
                groupId:
                    currentGroup.id,
                paidBy,
                paidTo,
                amount:
                    numericAmount,
                notes
            });

        runCallback(
            callbacks.onSaved,
            currentGroup.id,
            settlement
        );
    } catch (error) {
        setMessage(
            error?.message ||
            'Settlement could not be saved.'
        );

        setSaving(false);
    }
}


/**
 * Binds events after the form is rendered.
 */
function bindFormEvents() {
    elements.paidBy.addEventListener(
        'change',
        handlePaidByChange
    );

    elements.cancel.addEventListener(
        'click',
        handleCancel
    );

    elements.form.addEventListener(
        'submit',
        handleSubmit
    );
}


/**
 * Initializes the Settle Up screen.
 */
export function initializeSettleUpPage(
    options = {}
) {
    if (initialized) {
        return elements.screen;
    }

    callbacks.onCancel =
        options.onCancel ?? null;

    callbacks.onSaved =
        options.onSaved ?? null;

    createScreenMarkup();
    findElements();

    elements.back.addEventListener(
        'click',
        handleCancel
    );

    initialized = true;

    return elements.screen;
}


/**
 * Opens Settle Up for one group.
 *
 * Optional values allow the caller to prefill
 * a suggested sender, receiver and amount.
 */
export async function openSettleUpPage(
    groupId,
    user,
    options = {}
) {
    if (!initialized) {
        throw new Error(
            'Settle Up page is not initialized.'
        );
    }

    if (!groupId || !user?.id) {
        throw new Error(
            'A group and signed-in user are required.'
        );
    }

    currentUser = user;

    setMessage('');

    elements.content.innerHTML = `
        <p class="list-empty">
            Loading settlement...
        </p>
    `;

    try {
        const [
            group,
            memberships
        ] = await Promise.all([
            loadGroup(groupId),
            loadGroupMembers(groupId)
        ]);

        if (
            !Array.isArray(memberships) ||
            memberships.length < 2
        ) {
            throw new Error(
                'At least two group members are required to settle up.'
            );
        }

        const profileMap =
            await loadProfileMap(
                memberships.map(
                    (membership) =>
                        membership.user_id
                )
            );

        currentGroup = group;
        currentMemberships =
            memberships;
        currentProfileMap =
            profileMap;

        renderSettlementForm(
            options
        );
    } catch (error) {
        elements.content.innerHTML = '';

        setMessage(
            error?.message ||
            'Settle Up could not be loaded.'
        );

        throw error;
    }
}


/**
 * Clears settlement page state on sign-out.
 */
export function resetSettleUpPage() {
    currentUser = null;
    currentGroup = null;
    currentMemberships = [];
    currentProfileMap = new Map();

    if (!initialized) {
        return;
    }

    elements.content.innerHTML = '';
    setMessage('');
}