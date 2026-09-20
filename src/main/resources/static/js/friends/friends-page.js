import {
    FRIENDSHIP_STATUS,
    acceptFriendRequest,
    declineFriendRequest,
    getOtherUserId,
    loadFriendsPageData,
    searchProfiles,
    sendFriendRequest
} from './friends-service.js';

import {
    createPersonCard,
    escapeHtml
} from '../shared/person-card.js';

let currentUser = null;
let initialized = false;

const elements = {};

/**
 * Finds the Friends-page elements required by this module.
 */
function findElements() {
    elements.screen =
        document.querySelector('#friends');

    elements.message =
        document.querySelector('#friendsMessage');

    elements.searchForm =
        document.querySelector('#friendSearchForm');

    elements.searchInput =
        document.querySelector('#friendSearch');

    elements.resultsSection =
        document.querySelector(
            '#searchResultsSection'
        );

    elements.results =
        document.querySelector(
            '#friendSearchResults'
        );

    elements.requests =
        document.querySelector('#friendRequests');

    elements.requestCount =
        document.querySelector('#requestCount');

    elements.friends =
        document.querySelector('#friendsList');
}

/**
 * Ensures the required HTML exists.
 */
function validateElements() {
    const missing = Object.entries(elements)
        .filter(([, element]) => !element)
        .map(([name]) => name);

    if (missing.length > 0) {
        throw new Error(
            `Friends page is missing: ${missing.join(', ')}.`
        );
    }
}

/**
 * Displays a Friends-page status message.
 */
function setMessage(message = '') {
    elements.message.textContent = message;
}

/**
 * Creates the action shown beside a search result.
 */
function createRelationshipAction(
    profile,
    relationship
) {
    if (!relationship) {
        return `
            <button
                class="small-button accept"
                data-action="add"
                data-user-id="${escapeHtml(profile.id)}"
                type="button"
            >
                Add
            </button>
        `;
    }

    if (
        relationship.status ===
        FRIENDSHIP_STATUS.ACCEPTED
    ) {
        return `
            <span class="friend-chip">
                Friend
            </span>
        `;
    }

    if (
        relationship.status ===
        FRIENDSHIP_STATUS.PENDING
    ) {
        return `
            <span class="friend-chip pending">
                Pending
            </span>
        `;
    }

    return `
        <span class="friend-chip">
            ${escapeHtml(relationship.status)}
        </span>
    `;
}

/**
 * Renders incoming friend requests.
 */
function renderIncomingRequests(
    incomingRequests,
    profiles
) {
    elements.requestCount.textContent =
        incomingRequests.length;

    if (incomingRequests.length === 0) {
        elements.requests.innerHTML = `
            <p class="list-empty">
                No pending friend requests.
            </p>
        `;
        return;
    }

    elements.requests.innerHTML =
        incomingRequests
            .map((friendship) => {
                const profile = profiles.get(
                    friendship.requester_id
                );

                return createPersonCard(
                    profile,
                    {
                        actions: `
                            <button
                                class="small-button accept"
                                data-action="accept"
                                data-id="${escapeHtml(
                                    friendship.id
                                )}"
                                type="button"
                            >
                                Accept
                            </button>

                            <button
                                class="small-button quiet"
                                data-action="decline"
                                data-id="${escapeHtml(
                                    friendship.id
                                )}"
                                type="button"
                            >
                                Decline
                            </button>
                        `
                    }
                );
            })
            .join('');
}

/**
 * Renders accepted friends.
 */
function renderAcceptedFriends(
    acceptedFriendships,
    profiles
) {
    if (acceptedFriendships.length === 0) {
        elements.friends.innerHTML = `
            <p class="list-empty">
                Your accepted friends will appear here.
            </p>
        `;
        return;
    }

    elements.friends.innerHTML =
        acceptedFriendships
            .map((friendship) => {
                const friendId = getOtherUserId(
                    friendship,
                    currentUser.id
                );

                return createPersonCard(
                    profiles.get(friendId),
                    {
                        actions: `
                            <span class="friend-chip">
                                Friend
                            </span>
                        `
                    }
                );
            })
            .join('');
}

/**
 * Loads and renders requests and accepted friends.
 */
export async function refreshFriendsPage() {
    if (!currentUser) {
        return;
    }

    setMessage('');

    elements.requests.innerHTML = `
        <p class="list-empty">
            Loading requests...
        </p>
    `;

    elements.friends.innerHTML = `
        <p class="list-empty">
            Loading friends...
        </p>
    `;

    try {
        const {
            incomingRequests,
            acceptedFriendships,
            profiles
        } = await loadFriendsPageData(
            currentUser.id
        );

        renderIncomingRequests(
            incomingRequests,
            profiles
        );

        renderAcceptedFriends(
            acceptedFriendships,
            profiles
        );
    } catch (error) {
        elements.requests.innerHTML = '';
        elements.friends.innerHTML = '';
        setMessage(error.message);
    }
}

/**
 * Searches for Orange users.
 */
async function handleSearch(event) {
    event.preventDefault();

    if (!currentUser) {
        setMessage(
            'Sign in before searching for friends.'
        );
        return;
    }

    const query =
        elements.searchInput.value.trim();

    if (query.length < 2) {
        setMessage(
            'Enter at least two characters.'
        );
        return;
    }

    setMessage('Searching...');
    elements.resultsSection.hidden = false;

    elements.results.innerHTML = `
        <p class="list-empty">
            Searching Orange users...
        </p>
    `;

    try {
        const results = await searchProfiles(
            currentUser.id,
            query
        );

        if (results.length === 0) {
            elements.results.innerHTML = `
                <p class="list-empty">
                    No Orange users found.
                </p>
            `;

            setMessage('');
            return;
        }

        elements.results.innerHTML = results
            .map((result) => {
                const action =
                    createRelationshipAction(
                        result.profile,
                        result.relationship
                    );

                return createPersonCard(
                    result.profile,
                    {
                        actions: action
                    }
                );
            })
            .join('');

        setMessage('');
    } catch (error) {
        elements.results.innerHTML = '';
        setMessage(error.message);
    }
}

/**
 * Sends a friend request from a search result.
 */
async function handleAdd(button) {
    const addresseeId =
        button.dataset.userId;

    await sendFriendRequest(
        currentUser.id,
        addresseeId
    );

    const pendingChip =
        document.createElement('span');

    pendingChip.className =
        'friend-chip pending';

    pendingChip.textContent = 'Pending';

    button.replaceWith(pendingChip);

    setMessage('Friend request sent.');
}

/**
 * Accepts or declines an incoming request.
 */
async function handleRequestDecision(
    button,
    action
) {
    const friendshipId =
        button.dataset.id;

    if (action === 'accept') {
        await acceptFriendRequest(
            friendshipId,
            currentUser.id
        );

        setMessage(
            'Friend request accepted.'
        );
    } else {
        await declineFriendRequest(
            friendshipId,
            currentUser.id
        );

        setMessage(
            'Friend request declined.'
        );
    }

    await refreshFriendsPage();
}

/**
 * Handles Friends-page action buttons.
 */
async function handleScreenClick(event) {
    const button =
        event.target.closest('[data-action]');

    if (
        !button ||
        !elements.screen.contains(button) ||
        !currentUser
    ) {
        return;
    }

    const action =
        button.dataset.action;

    if (
        !['add', 'accept', 'decline']
            .includes(action)
    ) {
        return;
    }

    button.disabled = true;
    setMessage('');

    try {
        if (action === 'add') {
            await handleAdd(button);
            return;
        }

        await handleRequestDecision(
            button,
            action
        );
    } catch (error) {
        setMessage(error.message);
        button.disabled = false;
    }
}

/**
 * Initializes Friends-page event handlers once.
 */
export function initializeFriendsPage() {
    if (initialized) {
        return;
    }

    findElements();
    validateElements();

    elements.searchForm.addEventListener(
        'submit',
        handleSearch
    );

    elements.screen.addEventListener(
        'click',
        handleScreenClick
    );

    initialized = true;
}

/**
 * Supplies the authenticated user and loads Friends data.
 */
export async function openFriendsPage(user) {
    if (!initialized) {
        initializeFriendsPage();
    }

    if (!user?.id) {
        throw new Error(
            'Sign in before opening Friends.'
        );
    }

    currentUser = user;
    await refreshFriendsPage();
}

/**
 * Clears user-specific Friends-page state on sign-out.
 */
export function resetFriendsPage() {
    currentUser = null;

    if (!initialized) {
        return;
    }

    elements.searchInput.value = '';
    elements.resultsSection.hidden = true;
    elements.results.innerHTML = '';
    elements.requests.innerHTML = '';
    elements.friends.innerHTML = '';
    elements.requestCount.textContent = '0';
    setMessage('');
}