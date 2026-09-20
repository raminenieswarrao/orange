import {
    loadRecentActivity,
    ACTIVITY_TYPE
} from './activity-service.js';

import {
    loadProfileMap
} from '../friends/friends-service.js';

let initialized = false;
let currentUser = null;
let currentActivity = [];
let currentProfileMap = new Map();

const callbacks = {
    onHome: null,
    onFriends: null,
    onGroups: null,
    onGroup: null
};


/**
 * Escapes user/database text before rendering.
 */
function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&#039;');
}


/**
 * Formats a monetary amount.
 */
function formatMoney(
    amount,
    currency = 'USD'
) {
    const numericAmount =
        Number(amount);

    const safeAmount =
        Number.isFinite(numericAmount)
            ? numericAmount
            : 0;

    try {
        return new Intl.NumberFormat(
            undefined,
            {
                style: 'currency',
                currency
            }
        ).format(safeAmount);
    } catch {
        return `${currency} ${safeAmount.toFixed(2)}`;
    }
}


/**
 * Returns a readable person name.
 */
function getProfileName(userId) {
    if (!userId) {
        return 'Someone';
    }

    if (
        currentUser?.id &&
        userId === currentUser.id
    ) {
        return 'You';
    }

    const profile =
        currentProfileMap.get(
            userId
        );

    if (!profile) {
        return 'Someone';
    }

    return (
        profile.display_name ||
        profile.full_name ||
        profile.name ||
        profile.username ||
        'Someone'
    );
}


/**
 * Returns a compact readable activity date.
 */
function formatActivityDate(value) {
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

    const now =
        new Date();

    const sameYear =
        date.getFullYear() ===
        now.getFullYear();

    return new Intl.DateTimeFormat(
        undefined,
        {
            month: 'short',
            day: 'numeric',
            ...(sameYear
                ? {}
                : {
                    year: 'numeric'
                }),
            hour: 'numeric',
            minute: '2-digit'
        }
    ).format(date);
}


/**
 * Returns the text describing one expense.
 */
function getExpenseDescription(item) {
    const payerName =
        getProfileName(
            item.paidBy
        );

    if (
        currentUser?.id &&
        item.paidBy === currentUser.id
    ) {
        return 'You paid';
    }

    return `${payerName} paid`;
}


/**
 * Returns the text describing one payment.
 */
function getSettlementDescription(item) {
    const payerName =
        getProfileName(
            item.paidBy
        );

    const receiverName =
        getProfileName(
            item.paidTo
        );

    if (
        currentUser?.id &&
        item.paidBy === currentUser.id
    ) {
        return `You paid ${receiverName}`;
    }

    if (
        currentUser?.id &&
        item.paidTo === currentUser.id
    ) {
        return `${payerName} paid you`;
    }

    return `${payerName} paid ${receiverName}`;
}


/**
 * Returns Activity card markup for one expense.
 */
function createExpenseMarkup(item) {
    return `
        <article
            class="activity-card activity-expense"
            data-activity-group-id="${escapeHtml(item.groupId)}"
            tabindex="0"
            role="button"
        >
            <div
                class="activity-icon expense"
                aria-hidden="true"
            >
                $
            </div>

            <div class="activity-copy">
                <div class="activity-title-row">
                    <strong>
                        ${escapeHtml(item.description)}
                    </strong>

                    <span class="activity-amount">
                        ${escapeHtml(
                            formatMoney(
                                item.amount,
                                item.currency
                            )
                        )}
                    </span>
                </div>

                <p>
                    ${escapeHtml(
                        getExpenseDescription(item)
                    )}
                    ·
                    ${escapeHtml(item.groupName)}
                </p>

                ${
                    item.notes
                        ? `
                            <p class="activity-note">
                                ${escapeHtml(item.notes)}
                            </p>
                        `
                        : ''
                }

                <span class="activity-date">
                    ${escapeHtml(
                        formatActivityDate(
                            item.occurredAt
                        )
                    )}
                </span>
            </div>
        </article>
    `;
}


/**
 * Returns Activity card markup for one settlement.
 */
function createSettlementMarkup(item) {
    return `
        <article
            class="activity-card activity-payment"
            data-activity-group-id="${escapeHtml(item.groupId)}"
            tabindex="0"
            role="button"
        >
            <div
                class="activity-icon payment"
                aria-hidden="true"
            >
                ✓
            </div>

            <div class="activity-copy">
                <div class="activity-title-row">
                    <strong>
                        ${escapeHtml(
                            getSettlementDescription(
                                item
                            )
                        )}
                    </strong>

                    <span class="activity-amount payment">
                        ${escapeHtml(
                            formatMoney(
                                item.amount,
                                item.currency
                            )
                        )}
                    </span>
                </div>

                <p>
                    Payment
                    ·
                    ${escapeHtml(item.groupName)}
                </p>

                ${
                    item.notes
                        ? `
                            <p class="activity-note">
                                ${escapeHtml(item.notes)}
                            </p>
                        `
                        : ''
                }

                <span class="activity-date">
                    ${escapeHtml(
                        formatActivityDate(
                            item.occurredAt
                        )
                    )}
                </span>
            </div>
        </article>
    `;
}


/**
 * Creates all Activity list markup.
 */
function createActivityMarkup() {
    if (currentActivity.length === 0) {
        return `
            <section class="activity-empty">
                <div
                    class="activity-empty-icon"
                    aria-hidden="true"
                >
                    ☰
                </div>

                <h2>No activity yet</h2>

                <p>
                    Expenses and payments from your
                    groups will appear here.
                </p>
            </section>
        `;
    }

    return currentActivity
        .map((item) => {
            if (
                item.type ===
                ACTIVITY_TYPE.SETTLEMENT
            ) {
                return createSettlementMarkup(
                    item
                );
            }

            return createExpenseMarkup(
                item
            );
        })
        .join('');
}


/**
 * Renders the Activity page.
 */
function renderActivity() {
    const list =
        document.querySelector(
            '#activityList'
        );

    if (!list) {
        return;
    }

    list.innerHTML =
        createActivityMarkup();
}


/**
 * Loads profile details for all people referenced
 * by the Activity feed.
 */
async function loadActivityProfiles() {
    const userIds =
        new Set();

    currentActivity.forEach(
        (item) => {
            if (item.paidBy) {
                userIds.add(
                    item.paidBy
                );
            }

            if (item.paidTo) {
                userIds.add(
                    item.paidTo
                );
            }

            if (item.createdBy) {
                userIds.add(
                    item.createdBy
                );
            }
        }
    );

    if (currentUser?.id) {
        userIds.add(
            currentUser.id
        );
    }

    if (userIds.size === 0) {
        currentProfileMap =
            new Map();

        return;
    }

    currentProfileMap =
        await loadProfileMap(
            Array.from(userIds)
        );
}


/**
 * Displays a page-level Activity message.
 */
function setActivityMessage(
    message = ''
) {
    const element =
        document.querySelector(
            '#activityMessage'
        );

    if (element) {
        element.textContent =
            message;
    }
}


/**
 * Opens a group from an Activity row.
 */
function openActivityGroup(
    groupId
) {
    if (
        !groupId ||
        typeof callbacks.onGroup !==
            'function'
    ) {
        return;
    }

    callbacks.onGroup(
        groupId
    );
}


/**
 * Handles clicks inside the Activity list.
 */
function handleActivityClick(event) {
    const card =
        event.target.closest(
            '[data-activity-group-id]'
        );

    if (!card) {
        return;
    }

    openActivityGroup(
        card.dataset.activityGroupId
    );
}


/**
 * Supports opening cards from the keyboard.
 */
function handleActivityKeydown(event) {
    if (
        event.key !== 'Enter' &&
        event.key !== ' '
    ) {
        return;
    }

    const card =
        event.target.closest(
            '[data-activity-group-id]'
        );

    if (!card) {
        return;
    }

    event.preventDefault();

    openActivityGroup(
        card.dataset.activityGroupId
    );
}


/**
 * Creates the Activity screen once.
 */
function createActivityScreen() {
    const existing =
        document.querySelector(
            '#activity'
        );

    if (existing) {
        return existing;
    }

    const screen =
        document.createElement(
            'section'
        );

    screen.id = 'activity';
    screen.className =
        'screen activity-screen';

    screen.hidden = true;

    screen.innerHTML = `
        <header class="page-header">
            <button
                id="activityBack"
                class="icon-button"
                type="button"
                aria-label="Back to home"
            >
                ‹
            </button>

            <div>
                <span class="eyebrow">
                    RECENT CHANGES
                </span>

                <h1>Activity</h1>
            </div>

            <span
                class="activity-header-spacer"
                aria-hidden="true"
            ></span>
        </header>

        <p
            id="activityMessage"
            class="page-message"
            role="status"
        ></p>

        <section
            id="activityList"
            class="activity-list"
            aria-live="polite"
        ></section>

        <nav
            class="bottom-nav"
            aria-label="Primary navigation"
        >
            <button
                id="activityHomeNav"
                type="button"
            >
                <span>⌂</span>
                Home
            </button>

            <button
                id="activityFriendsNav"
                type="button"
            >
                <span>♟</span>
                Friends
            </button>

            <button
                id="activityAddSplit"
                class="split-button"
                type="button"
                aria-label="Add split"
            >
                ＋
            </button>

            <button
                id="activityGroupsNav"
                type="button"
            >
                <span>◉</span>
                Groups
            </button>

            <button
                class="active"
                type="button"
            >
                <span>☰</span>
                Activity
            </button>
        </nav>
    `;

    document.querySelector(
        '.app-shell'
    ).appendChild(screen);

    return screen;
}


/**
 * Initializes Activity UI and navigation.
 */
export function initializeActivityPage(
    options = {}
) {
    if (initialized) {
        return;
    }

    callbacks.onHome =
        options.onHome ?? null;

    callbacks.onFriends =
        options.onFriends ?? null;

    callbacks.onGroups =
        options.onGroups ?? null;

    callbacks.onGroup =
        options.onGroup ?? null;

    const screen =
        createActivityScreen();

    screen.querySelector(
        '#activityBack'
    ).addEventListener(
        'click',
        () => callbacks.onHome?.()
    );

    screen.querySelector(
        '#activityHomeNav'
    ).addEventListener(
        'click',
        () => callbacks.onHome?.()
    );

    screen.querySelector(
        '#activityFriendsNav'
    ).addEventListener(
        'click',
        () => callbacks.onFriends?.()
    );

    screen.querySelector(
        '#activityGroupsNav'
    ).addEventListener(
        'click',
        () => callbacks.onGroups?.()
    );

    screen.querySelector(
        '#activityAddSplit'
    ).addEventListener(
        'click',
        () => callbacks.onGroups?.()
    );

    screen.querySelector(
        '#activityList'
    ).addEventListener(
        'click',
        handleActivityClick
    );

    screen.querySelector(
        '#activityList'
    ).addEventListener(
        'keydown',
        handleActivityKeydown
    );

    initialized = true;
}


/**
 * Loads and opens the Activity page.
 */
export async function openActivityPage(
    user
) {
    if (!initialized) {
        throw new Error(
            'Activity page is not initialized.'
        );
    }

    if (!user?.id) {
        throw new Error(
            'A signed-in user is required.'
        );
    }

    currentUser = user;

    setActivityMessage(
        'Loading activity...'
    );

    const list =
        document.querySelector(
            '#activityList'
        );

    list.innerHTML = `
        <p class="list-empty">
            Loading activity...
        </p>
    `;

    try {
        currentActivity =
            await loadRecentActivity(
                100
            );

        await loadActivityProfiles();

        renderActivity();

        setActivityMessage('');
    } catch (error) {
        console.error(
            'Unable to load Activity:',
            error
        );

        currentActivity = [];
        currentProfileMap =
            new Map();

        list.innerHTML = '';

        setActivityMessage(
            error?.message ||
            'Activity could not be loaded.'
        );

        throw error;
    }
}


/**
 * Clears Activity page state.
 */
export function resetActivityPage() {
    currentUser = null;
    currentActivity = [];
    currentProfileMap =
        new Map();

    const list =
        document.querySelector(
            '#activityList'
        );

    if (list) {
        list.replaceChildren();
    }

    setActivityMessage('');
}