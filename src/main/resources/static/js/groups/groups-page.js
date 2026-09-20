import {
    createGroup,
    loadGroups
} from './groups-service.js';

import {
    loadAcceptedFriends
} from '../friends/friends-service.js';

import {
    createPersonCard,
    escapeHtml
} from '../shared/person-card.js';

let currentUser = null;
let initialized = false;
let acceptedFriends = [];
let selectedMemberIds = new Set();

const elements = {};

/**
 * Finds the Groups-page elements.
 */
function findElements() {
    elements.screen =
        document.querySelector('#groups');

    elements.message =
        document.querySelector('#groupsMessage');

    elements.createButton =
        document.querySelector('#groupsCreateButton');

    elements.createPanel =
        document.querySelector('#createGroupPanel');

    elements.form =
        document.querySelector('#createGroupForm');

    elements.name =
        document.querySelector('#groupName');

    elements.description =
        document.querySelector('#groupDescription');

    elements.currency =
        document.querySelector('#groupCurrency');

    elements.memberOptions =
        document.querySelector('#groupMemberOptions');

    elements.selectedCount =
        document.querySelector('#selectedMemberCount');

    elements.cancelButton =
        document.querySelector('#cancelCreateGroup');

    elements.submitButton =
        document.querySelector('#submitCreateGroup');

    elements.groupsList =
        document.querySelector('#groupsList');
}

/**
 * Ensures the required Groups HTML exists.
 */
function validateElements() {
    const missing = Object.entries(elements)
        .filter(([, element]) => !element)
        .map(([name]) => name);

    if (missing.length > 0) {
        throw new Error(
            `Groups page is missing: ${missing.join(', ')}.`
        );
    }
}

/**
 * Displays a Groups-page status message.
 */
function setMessage(message = '') {
    elements.message.textContent = message;
}

/**
 * Returns initials for a group that has no image.
 */
function getGroupInitials(name = '') {
    const words = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    if (words.length === 0) {
        return 'O';
    }

    return words
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase();
}

/**
 * Creates the icon shown on a group card.
 */
function createGroupIcon(group) {
    if (group.image_url) {
        return `
            <img
                src="${escapeHtml(group.image_url)}"
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
 * Creates one group card.
 */
function createGroupCard(group) {
    const description =
        group.description ||
        `${group.default_currency} group`;

    return `
        <article
            class="group-card"
            data-group-id="${escapeHtml(group.id)}"
        >
            <div class="group-card-icon">
                ${createGroupIcon(group)}
            </div>

            <div class="group-card-copy">
                <strong>
                    ${escapeHtml(group.name)}
                </strong>

                <span>
                    ${escapeHtml(description)}
                </span>
            </div>

            <span
                class="group-card-arrow"
                aria-hidden="true"
            >
                ›
            </span>
        </article>
    `;
}

/**
 * Renders the signed-in user's groups.
 */
function renderGroups(groups) {
    if (groups.length === 0) {
        elements.groupsList.innerHTML = `
            <div class="groups-empty">
                <img
                    src="/assets/orange-icon.svg"
                    alt=""
                >

                <h2>No groups yet</h2>

                <p>
                    Create a group and invite accepted
                    friends to begin splitting expenses.
                </p>
            </div>
        `;
        return;
    }

    elements.groupsList.innerHTML =
        groups
            .map(createGroupCard)
            .join('');
}

/**
 * Loads and displays groups visible to the current user.
 */
export async function refreshGroups() {
    if (!currentUser) {
        return;
    }

    elements.groupsList.innerHTML = `
        <p class="list-empty">
            Loading groups...
        </p>
    `;

    try {
        const groups = await loadGroups();
        renderGroups(groups);
    } catch (error) {
        elements.groupsList.innerHTML = '';
        setMessage(error.message);
    }
}

/**
 * Updates the selected-member counter.
 */
function updateSelectedCount() {
    const count = selectedMemberIds.size;

    elements.selectedCount.textContent =
        `${count} selected`;
}

/**
 * Creates the selection control shown on a friend card.
 */
function createSelectionControl(selected) {
    return `
        <span
            class="member-check"
            aria-hidden="true"
        >
            ${selected ? '✓' : ''}
        </span>
    `;
}

/**
 * Renders accepted friends as selectable group members.
 */
function renderMemberOptions() {
    if (acceptedFriends.length === 0) {
        elements.memberOptions.innerHTML = `
            <p class="list-empty">
                Add and accept friends before inviting
                them to a group.
            </p>
        `;

        updateSelectedCount();
        return;
    }

    elements.memberOptions.innerHTML =
        acceptedFriends
            .map((profile) => {
                const selected =
                    selectedMemberIds.has(profile.id);

                return createPersonCard(
                    profile,
                    {
                        actions:
                            createSelectionControl(
                                selected
                            ),
                        className:
                            'group-member-option',
                        selectable: true,
                        selected
                    }
                );
            })
            .join('');

    updateSelectedCount();
}

/**
 * Loads accepted friends for the member picker.
 */
async function refreshMemberOptions() {
    if (!currentUser) {
        return;
    }

    elements.memberOptions.innerHTML = `
        <p class="list-empty">
            Loading friends...
        </p>
    `;

    acceptedFriends =
        await loadAcceptedFriends(currentUser.id);

    renderMemberOptions();
}

/**
 * Resets the Create Group form.
 */
function resetCreateForm() {
    elements.form.reset();
    elements.currency.value = 'USD';

    selectedMemberIds =
        new Set();

    renderMemberOptions();
}

/**
 * Opens the Create Group panel.
 */
async function showCreatePanel() {
    elements.createPanel.hidden = false;
    elements.createButton.textContent = 'Close';
    setMessage('');

    try {
        await refreshMemberOptions();
        elements.name.focus();
    } catch (error) {
        elements.memberOptions.innerHTML = '';
        setMessage(error.message);
    }
}

/**
 * Closes and resets the Create Group panel.
 */
function hideCreatePanel() {
    elements.createPanel.hidden = true;
    elements.createButton.textContent = 'Create';
    resetCreateForm();
    setMessage('');
}

/**
 * Toggles one selected group member.
 */
function toggleMember(profileId) {
    if (!profileId) {
        return;
    }

    if (selectedMemberIds.has(profileId)) {
        selectedMemberIds.delete(profileId);
    } else {
        selectedMemberIds.add(profileId);
    }

    renderMemberOptions();
}

/**
 * Handles mouse selection in the member picker.
 */
function handleMemberClick(event) {
    const card = event.target.closest(
        '.group-member-option'
    );

    if (
        !card ||
        !elements.memberOptions.contains(card)
    ) {
        return;
    }

    toggleMember(card.dataset.userId);
}

/**
 * Supports keyboard selection for accessibility.
 */
function handleMemberKeydown(event) {
    if (
        event.key !== 'Enter' &&
        event.key !== ' '
    ) {
        return;
    }

    const card = event.target.closest(
        '.group-member-option'
    );

    if (
        !card ||
        !elements.memberOptions.contains(card)
    ) {
        return;
    }

    event.preventDefault();
    toggleMember(card.dataset.userId);
}

/**
 * Creates the group from the submitted form.
 */
async function handleCreateGroup(event) {
    event.preventDefault();

    if (!currentUser) {
        setMessage(
            'Sign in before creating a group.'
        );
        return;
    }

    elements.submitButton.disabled = true;
    elements.cancelButton.disabled = true;
    setMessage('Creating group...');

    try {
        await createGroup({
            name: elements.name.value,
            description:
                elements.description.value,
            defaultCurrency:
                elements.currency.value,
            memberIds: [
                ...selectedMemberIds
            ]
        });

        hideCreatePanel();
        setMessage(
            'Your group was created.'
        );

        await refreshGroups();
    } catch (error) {
        setMessage(error.message);
    } finally {
        elements.submitButton.disabled = false;
        elements.cancelButton.disabled = false;
    }
}

/**
 * Handles the Create/Close header button.
 */
async function handleCreateButton() {
    if (elements.createPanel.hidden) {
        await showCreatePanel();
    } else {
        hideCreatePanel();
    }
}

/**
 * Initializes Groups-page event handlers once.
 */
export function initializeGroupsPage() {
    if (initialized) {
        return;
    }

    findElements();
    validateElements();

    elements.createButton.addEventListener(
        'click',
        handleCreateButton
    );

    elements.cancelButton.addEventListener(
        'click',
        hideCreatePanel
    );

    elements.form.addEventListener(
        'submit',
        handleCreateGroup
    );

    elements.memberOptions.addEventListener(
        'click',
        handleMemberClick
    );

    elements.memberOptions.addEventListener(
        'keydown',
        handleMemberKeydown
    );

    initialized = true;
}

/**
 * Supplies the authenticated user and opens Groups data.
 */
export async function openGroupsPage(
    user,
    {
        showCreate = false
    } = {}
) {
    if (!initialized) {
        initializeGroupsPage();
    }

    if (!user?.id) {
        throw new Error(
            'Sign in before opening Groups.'
        );
    }

    currentUser = user;
    setMessage('');

    await refreshGroups();

    if (showCreate) {
        await showCreatePanel();
    }
}

/**
 * Clears user-specific Groups state on sign-out.
 */
export function resetGroupsPage() {
    currentUser = null;
    acceptedFriends = [];
    selectedMemberIds = new Set();

    if (!initialized) {
        return;
    }

    elements.form.reset();
    elements.createPanel.hidden = true;
    elements.createButton.textContent = 'Create';
    elements.groupsList.innerHTML = '';
    elements.memberOptions.innerHTML = '';
    updateSelectedCount();
    setMessage('');
}