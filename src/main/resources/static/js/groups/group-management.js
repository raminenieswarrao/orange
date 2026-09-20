import {
    GROUP_ROLE,
    addGroupMembers,
    deleteGroup,
    leaveGroup,
    removeGroupMember,
    setGroupMemberRole,
    transferGroupOwnership,
    updateGroupDetails
} from './groups-service.js';

import {
    loadAcceptedFriends
} from '../friends/friends-service.js';

import {
    createPersonCard,
    escapeHtml,
    getProfileDisplayName
} from '../shared/person-card.js';

let initialized = false;
let expanded = false;
let acceptedFriends = [];
let friendsLoaded = false;
let friendsLoading = false;
let selectedMemberIds = new Set();

let currentUser = null;
let currentGroup = null;
let currentMemberships = [];
let currentProfileMap = new Map();
let currentExpenses = [];
let currentSettlements = [];

const callbacks = {
    onRefresh: null,
    onExit: null,
    setMessage: null
};


/**
 * Formats a database role for display.
 */
function formatRole(role = GROUP_ROLE.MEMBER) {
    const normalized =
        String(role).toLowerCase();

    return (
        normalized.charAt(0).toUpperCase() +
        normalized.slice(1)
    );
}


/**
 * Sends a status message through Group Detail.
 */
function setMessage(message = '') {
    if (
        typeof callbacks.setMessage ===
        'function'
    ) {
        callbacks.setMessage(message);
    }
}


/**
 * Runs the refresh callback after a successful mutation.
 */
async function refreshGroup() {
    if (
        typeof callbacks.onRefresh ===
        'function'
    ) {
        await callbacks.onRefresh();
    }
}


/**
 * Leaves Group Detail after leave/delete succeeds.
 */
function exitGroup() {
    if (
        typeof callbacks.onExit ===
        'function'
    ) {
        callbacks.onExit();
    }
}


/**
 * Returns the current user's membership.
 */
function getCurrentMembership() {
    return currentMemberships.find(
        (membership) =>
            membership.user_id ===
            currentUser?.id
    ) ?? null;
}


/**
 * Returns whether the current user is OWNER or ADMIN.
 */
function isManager() {
    const role =
        getCurrentMembership()?.role;

    return (
        role === GROUP_ROLE.OWNER ||
        role === GROUP_ROLE.ADMIN
    );
}


/**
 * Returns whether the current user is OWNER.
 */
function isOwner() {
    return (
        getCurrentMembership()?.role ===
        GROUP_ROLE.OWNER
    );
}


/**
 * Creates currency options while preserving an existing
 * currency that may not be in the common Orange list.
 */
function createCurrencyOptions(currency) {
    const normalizedCurrency =
        String(currency || 'USD')
            .trim()
            .toUpperCase();

    const currencies = [
        'USD',
        'INR',
        'EUR',
        'GBP',
        'CAD'
    ];

    if (!currencies.includes(normalizedCurrency)) {
        currencies.unshift(normalizedCurrency);
    }

    return currencies
        .map(
            (candidate) => `
                <option
                    value="${escapeHtml(candidate)}"
                    ${
                        candidate === normalizedCurrency
                            ? 'selected'
                            : ''
                    }
                >
                    ${escapeHtml(candidate)}
                </option>
            `
        )
        .join('');
}


/**
 * Returns accepted friends who are not already members.
 */
function getAddMemberCandidates() {
    const memberIds = new Set(
        currentMemberships.map(
            (membership) =>
                membership.user_id
        )
    );

    return acceptedFriends.filter(
        (profile) =>
            profile?.id &&
            !memberIds.has(profile.id)
    );
}


/**
 * Drops selections that are no longer eligible.
 */
function normalizeSelectedMemberIds() {
    const candidateIds = new Set(
        getAddMemberCandidates().map(
            (profile) => profile.id
        )
    );

    selectedMemberIds = new Set(
        [...selectedMemberIds].filter(
            (userId) =>
                candidateIds.has(userId)
        )
    );
}


/**
 * Creates the Add members friend cards.
 */
function createMemberOptionsMarkup() {
    if (friendsLoading) {
        return `
            <p class="list-empty">
                Loading friends...
            </p>
        `;
    }

    if (!friendsLoaded) {
        return `
            <p class="list-empty">
                Open group management to load friends.
            </p>
        `;
    }

    const candidates =
        getAddMemberCandidates();

    if (candidates.length === 0) {
        return `
            <p class="list-empty">
                All accepted friends are already in this group.
            </p>
        `;
    }

    return candidates
        .map((profile) => {
            const selected =
                selectedMemberIds.has(
                    profile.id
                );

            return createPersonCard(
                profile,
                {
                    actions: `
                        <span
                            class="group-management-member-check"
                            aria-hidden="true"
                        >
                            ${selected ? '✓' : ''}
                        </span>
                    `,
                    className:
                        'group-management-member-option',
                    selectable: true,
                    selected
                }
            );
        })
        .join('');
}


/**
 * Creates role/remove controls for one membership.
 */
function createMemberActions(
    membership,
    name
) {
    const currentRole =
        getCurrentMembership()?.role;

    const isSelf =
        membership.user_id ===
        currentUser?.id;

    if (
        currentRole === GROUP_ROLE.OWNER &&
        !isSelf
    ) {
        return `
            <select
                class="group-management-role-select"
                data-group-role-user="${escapeHtml(
                    membership.user_id
                )}"
                data-original-role="${escapeHtml(
                    membership.role
                )}"
                aria-label="Change ${escapeHtml(
                    name
                )} role"
            >
                ${[
                    GROUP_ROLE.OWNER,
                    GROUP_ROLE.ADMIN,
                    GROUP_ROLE.MEMBER
                ]
                    .map(
                        (role) => `
                            <option
                                value="${role}"
                                ${
                                    role === membership.role
                                        ? 'selected'
                                        : ''
                                }
                            >
                                ${escapeHtml(
                                    formatRole(role)
                                )}
                            </option>
                        `
                    )
                    .join('')}
            </select>

            <button
                class="group-management-member-remove"
                type="button"
                data-group-member-remove="${escapeHtml(
                    membership.user_id
                )}"
                data-group-member-name="${escapeHtml(
                    name
                )}"
            >
                Remove
            </button>
        `;
    }

    if (
        currentRole === GROUP_ROLE.ADMIN &&
        membership.role === GROUP_ROLE.MEMBER &&
        !isSelf
    ) {
        return `
            <span class="group-member-role">
                ${escapeHtml(
                    formatRole(membership.role)
                )}
            </span>

            <button
                class="group-management-member-remove"
                type="button"
                data-group-member-remove="${escapeHtml(
                    membership.user_id
                )}"
                data-group-member-name="${escapeHtml(
                    name
                )}"
            >
                Remove
            </button>
        `;
    }

    return `
        <span class="group-member-role ${
            membership.role === GROUP_ROLE.OWNER
                ? 'owner'
                : ''
        }">
            ${escapeHtml(
                formatRole(membership.role)
            )}
        </span>
    `;
}


/**
 * Creates all rows in Manage members.
 */
function createManagedMembersMarkup() {
    return currentMemberships
        .map((membership) => {
            const profile =
                currentProfileMap.get(
                    membership.user_id
                );

            const name =
                getProfileDisplayName(profile);

            const isSelf =
                membership.user_id ===
                currentUser?.id;

            return `
                <article class="group-management-member">
                    <div class="group-management-member-copy">
                        <strong>
                            ${escapeHtml(name)}
                            ${isSelf ? ' (You)' : ''}
                        </strong>

                        <span>
                            ${escapeHtml(
                                formatRole(membership.role)
                            )}
                        </span>
                    </div>

                    <div class="group-management-member-actions">
                        ${createMemberActions(
                            membership,
                            name
                        )}
                    </div>
                </article>
            `;
        })
        .join('');
}


/**
 * Creates ownership-transfer controls for OWNER.
 */
function createOwnershipTransferMarkup() {
    if (!isOwner()) {
        return '';
    }

    const candidates =
        currentMemberships.filter(
            (membership) =>
                membership.user_id !==
                currentUser?.id
        );

    if (candidates.length === 0) {
        return `
            <section class="group-management-section">
                <div class="group-management-section-heading">
                    <div>
                        <h3>Transfer ownership</h3>

                        <p>
                            Add another member before
                            transferring ownership.
                        </p>
                    </div>
                </div>
            </section>
        `;
    }

    return `
        <section class="group-management-section">
            <div class="group-management-section-heading">
                <div>
                    <h3>Transfer ownership</h3>

                    <p>
                        The selected member becomes Owner
                        and you become Admin.
                    </p>
                </div>
            </div>

            <form
                id="groupManagementTransferForm"
                class="group-management-transfer"
            >
                <div class="group-management-transfer-controls">
                    <select
                        id="groupManagementTransferOwner"
                        required
                        aria-label="New group owner"
                    >
                        <option value="">
                            Select a member
                        </option>

                        ${candidates
                            .map((membership) => {
                                const profile =
                                    currentProfileMap.get(
                                        membership.user_id
                                    );

                                const name =
                                    getProfileDisplayName(
                                        profile
                                    );

                                return `
                                    <option
                                        value="${escapeHtml(
                                            membership.user_id
                                        )}"
                                    >
                                        ${escapeHtml(name)} ·
                                        ${escapeHtml(
                                            formatRole(
                                                membership.role
                                            )
                                        )}
                                    </option>
                                `;
                            })
                            .join('')}
                    </select>

                    <button
                        class="group-management-secondary-action"
                        type="submit"
                    >
                        Transfer
                    </button>
                </div>
            </form>
        </section>
    `;
}


/**
 * Creates the complete Group Management panel.
 */
export function createGroupManagementMarkup() {
    if (!currentGroup) {
        return '';
    }

    const membership =
        getCurrentMembership();

    const role =
        membership?.role ??
        GROUP_ROLE.MEMBER;

    const canManage =
        role === GROUP_ROLE.OWNER ||
        role === GROUP_ROLE.ADMIN;

    const owner =
        role === GROUP_ROLE.OWNER;

    const financialActivityExists =
        currentExpenses.length > 0 ||
        currentSettlements.length > 0;

    const ownerCount =
        currentMemberships.filter(
            (candidate) =>
                candidate.role ===
                GROUP_ROLE.OWNER
        ).length;

    return `
        <article
            id="groupManagementPanel"
            class="group-management-panel"
            ${expanded ? '' : 'hidden'}
        >
            <div class="group-management-header">
                <div class="group-management-header-copy">
                    <h2>Group management</h2>

                    <p>
                        You are a ${escapeHtml(
                            formatRole(role)
                        )} of this group.
                    </p>
                </div>

                <button
                    class="group-management-close"
                    type="button"
                    data-group-management-close
                    aria-label="Close group management"
                >
                    ×
                </button>
            </div>

            ${
                canManage
                    ? `
                        <section class="group-management-section">
                            <div class="group-management-section-heading">
                                <div>
                                    <h3>Edit group</h3>

                                    <p>
                                        Update the name, description,
                                        or group currency.
                                    </p>
                                </div>
                            </div>

                            <form
                                id="groupManagementEditForm"
                                class="group-management-form"
                            >
                                <div class="group-management-field">
                                    <label for="groupManagementName">
                                        Group name
                                    </label>

                                    <input
                                        id="groupManagementName"
                                        type="text"
                                        minlength="2"
                                        maxlength="80"
                                        value="${escapeHtml(
                                            currentGroup.name
                                        )}"
                                        required
                                    >
                                </div>

                                <div class="group-management-field">
                                    <label for="groupManagementDescription">
                                        Description
                                    </label>

                                    <textarea
                                        id="groupManagementDescription"
                                        maxlength="300"
                                    >${escapeHtml(
                                        currentGroup.description || ''
                                    )}</textarea>
                                </div>

                                <div class="group-management-field">
                                    <label for="groupManagementCurrency">
                                        Default currency
                                    </label>

                                    <select
                                        id="groupManagementCurrency"
                                        ${
                                            financialActivityExists
                                                ? 'disabled'
                                                : ''
                                        }
                                    >
                                        ${createCurrencyOptions(
                                            currentGroup.default_currency
                                        )}
                                    </select>

                                    <p class="group-management-help">
                                        ${
                                            financialActivityExists
                                                ? 'Currency is locked because this group already has expenses or payments.'
                                                : 'Currency can be changed only before financial activity exists.'
                                        }
                                    </p>
                                </div>

                                <div class="group-management-actions">
                                    <button
                                        class="group-management-action"
                                        type="submit"
                                    >
                                        Save changes
                                    </button>
                                </div>
                            </form>
                        </section>

                        <section class="group-management-section">
                            <div class="group-management-section-heading">
                                <div>
                                    <h3>Add members</h3>

                                    <p>
                                        Add accepted friends who are not
                                        already in the group.
                                    </p>
                                </div>
                            </div>

                            <form
                                id="groupManagementAddMembersForm"
                                class="group-management-member-picker"
                            >
                                <div
                                    id="groupManagementMemberOptions"
                                    class="group-management-member-options"
                                >
                                    ${createMemberOptionsMarkup()}
                                </div>

                                <span
                                    id="groupManagementSelectedCount"
                                    class="group-management-selected-count"
                                >
                                    ${selectedMemberIds.size} selected
                                </span>

                                <div class="group-management-actions">
                                    <button
                                        class="group-management-action"
                                        type="submit"
                                        ${
                                            selectedMemberIds.size === 0
                                                ? 'disabled'
                                                : ''
                                        }
                                    >
                                        Add selected
                                    </button>
                                </div>
                            </form>
                        </section>

                        <section class="group-management-section">
                            <div class="group-management-section-heading">
                                <div>
                                    <h3>Manage members</h3>

                                    <p>
                                        ${
                                            owner
                                                ? 'Owners can change roles and remove other members.'
                                                : 'Admins can remove Members. Role changes require an Owner.'
                                        }
                                    </p>
                                </div>
                            </div>

                            <div class="group-management-members">
                                ${createManagedMembersMarkup()}
                            </div>
                        </section>

                        ${createOwnershipTransferMarkup()}
                    `
                    : ''
            }

            <section class="group-management-section">
                <div class="group-management-danger-zone">
                    <div>
                        <h3>Leave group</h3>

                        <p>
                            You can leave only when your
                            membership can be removed safely.
                            ${
                                owner && ownerCount <= 1
                                    ? ' You are currently the last Owner, so ownership must be transferred first.'
                                    : ''
                            }
                        </p>
                    </div>

                    <div class="group-management-actions">
                        <button
                            class="group-management-danger-action"
                            type="button"
                            data-group-leave
                        >
                            Leave group
                        </button>
                    </div>
                </div>
            </section>

            ${
                owner
                    ? `
                        <section class="group-management-section">
                            <div class="group-management-danger-zone">
                                <div>
                                    <h3>Delete group</h3>

                                    <p>
                                        Permanently delete this group
                                        and its related group data.
                                        This cannot be undone.
                                    </p>
                                </div>

                                <div class="group-management-actions">
                                    <button
                                        class="group-management-danger-action"
                                        type="button"
                                        data-group-delete
                                    >
                                        Delete group
                                    </button>
                                </div>
                            </div>
                        </section>
                    `
                    : ''
            }
        </article>
    `;
}


/**
 * Updates the Add members picker without replacing the edit
 * form, preserving any unsaved field values.
 */
function renderMemberPicker() {
    const options =
        document.querySelector(
            '#groupManagementMemberOptions'
        );

    const selectedCount =
        document.querySelector(
            '#groupManagementSelectedCount'
        );

    const form =
        document.querySelector(
            '#groupManagementAddMembersForm'
        );

    if (!options || !selectedCount || !form) {
        return;
    }

    normalizeSelectedMemberIds();

    options.innerHTML =
        createMemberOptionsMarkup();

    selectedCount.textContent =
        `${selectedMemberIds.size} selected`;

    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );

    if (submitButton) {
        submitButton.disabled =
            selectedMemberIds.size === 0;
    }
}


/**
 * Updates the visible panel and options-button ARIA state.
 */
function applyExpandedState() {
    const panel =
        document.querySelector(
            '#groupManagementPanel'
        );

    const optionsButton =
        document.querySelector(
            '#groupDetailOptions'
        );

    if (panel) {
        panel.hidden = !expanded;
    }

    if (optionsButton) {
        optionsButton.setAttribute(
            'aria-expanded',
            String(expanded)
        );
    }
}


/**
 * Loads accepted friends for Add members.
 */
async function refreshFriends() {
    if (
        !currentUser?.id ||
        !isManager()
    ) {
        return;
    }

    friendsLoading = true;
    friendsLoaded = false;

    renderMemberPicker();

    try {
        acceptedFriends =
            await loadAcceptedFriends(
                currentUser.id
            );

        friendsLoaded = true;
    } finally {
        friendsLoading = false;

        normalizeSelectedMemberIds();
        renderMemberPicker();
    }
}


/**
 * Initializes callbacks once.
 */
export function initializeGroupManagement(
    options = {}
) {
    if (initialized) {
        return;
    }

    callbacks.onRefresh =
        options.onRefresh ?? null;

    callbacks.onExit =
        options.onExit ?? null;

    callbacks.setMessage =
        options.setMessage ?? null;

    initialized = true;
}


/**
 * Supplies the latest Group Detail data after every load.
 */
export function setGroupManagementContext({
    user,
    group,
    memberships = [],
    profileMap = new Map(),
    expenses = [],
    settlements = [],
    resetForDifferentGroup = false
}) {
    if (resetForDifferentGroup) {
        expanded = false;
        acceptedFriends = [];
        friendsLoaded = false;
        friendsLoading = false;
        selectedMemberIds = new Set();
    }

    currentUser = user ?? null;
    currentGroup = group ?? null;
    currentMemberships = memberships;
    currentProfileMap = profileMap;
    currentExpenses = expenses;
    currentSettlements = settlements;

    normalizeSelectedMemberIds();
}


/**
 * Reapplies panel visibility after Group Detail rerenders.
 */
export function syncGroupManagementState() {
    applyExpandedState();

    if (
        expanded &&
        isManager() &&
        !friendsLoaded &&
        !friendsLoading
    ) {
        refreshFriends()
            .catch((error) => {
                setMessage(
                    error?.message ||
                    'Friends could not be loaded for group management.'
                );
            });
    }
}


/**
 * Opens/closes Group Management from the ••• button.
 */
export async function toggleGroupManagement() {
    if (!currentGroup) {
        return;
    }

    expanded = !expanded;

    if (!expanded) {
        selectedMemberIds = new Set();
    }

    applyExpandedState();
    setMessage('');

    if (
        expanded &&
        isManager()
    ) {
        try {
            await refreshFriends();
        } catch (error) {
            setMessage(
                error?.message ||
                'Friends could not be loaded for group management.'
            );
        }
    }
}


/**
 * Closes Group Management.
 */
function closeGroupManagement() {
    expanded = false;
    selectedMemberIds = new Set();

    applyExpandedState();
    setMessage('');
}


/**
 * Selects or deselects one accepted friend.
 */
function toggleMember(userId) {
    if (!userId) {
        return;
    }

    const candidateIds = new Set(
        getAddMemberCandidates().map(
            (profile) => profile.id
        )
    );

    if (!candidateIds.has(userId)) {
        return;
    }

    if (selectedMemberIds.has(userId)) {
        selectedMemberIds.delete(userId);
    } else {
        selectedMemberIds.add(userId);
    }

    renderMemberPicker();
}


/**
 * Saves editable group details.
 */
async function saveGroupDetails(form) {
    if (!currentGroup?.id) {
        return;
    }

    const name =
        form.querySelector(
            '#groupManagementName'
        );

    const description =
        form.querySelector(
            '#groupManagementDescription'
        );

    const currency =
        form.querySelector(
            '#groupManagementCurrency'
        );

    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );

    if (!name || !description || !currency) {
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent =
            'Saving...';
    }

    setMessage('');

    try {
        await updateGroupDetails({
            groupId: currentGroup.id,
            name: name.value,
            description:
                description.value,
            defaultCurrency:
                currency.value
        });

        await refreshGroup();

        setMessage(
            'Group details updated.'
        );
    } catch (error) {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent =
                'Save changes';
        }

        setMessage(
            error?.message ||
            'Group details could not be updated.'
        );
    }
}


/**
 * Adds all selected accepted friends.
 */
async function addSelectedMembers(form) {
    if (!currentGroup?.id) {
        return;
    }

    const memberIds =
        [...selectedMemberIds];

    if (memberIds.length === 0) {
        setMessage(
            'Select at least one person to add.'
        );

        return;
    }

    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent =
            'Adding...';
    }

    setMessage('');

    try {
        const addedCount =
            await addGroupMembers(
                currentGroup.id,
                memberIds
            );

        selectedMemberIds =
            new Set();

        await refreshGroup();

        setMessage(
            addedCount === 1
                ? '1 member added.'
                : `${addedCount} members added.`
        );
    } catch (error) {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent =
                'Add selected';
        }

        setMessage(
            error?.message ||
            'Members could not be added.'
        );
    }
}


/**
 * Changes another member's role.
 */
async function changeMemberRole(select) {
    if (!currentGroup?.id) {
        return;
    }

    const userId =
        select.dataset.groupRoleUser;

    const originalRole =
        select.dataset.originalRole;

    const newRole =
        select.value;

    if (
        !userId ||
        !newRole ||
        newRole === originalRole
    ) {
        return;
    }

    const profile =
        currentProfileMap.get(userId);

    const name =
        getProfileDisplayName(profile);

    select.disabled = true;

    setMessage('');

    try {
        await setGroupMemberRole(
            currentGroup.id,
            userId,
            newRole
        );

        await refreshGroup();

        setMessage(
            `${name} is now ${formatRole(newRole)}.`
        );
    } catch (error) {
        select.disabled = false;
        select.value =
            originalRole;

        setMessage(
            error?.message ||
            'The member role could not be changed.'
        );
    }
}


/**
 * Removes another group member.
 */
async function removeMember(button) {
    if (!currentGroup?.id) {
        return;
    }

    const userId =
        button.dataset.groupMemberRemove;

    const name =
        button.dataset.groupMemberName ||
        'this member';

    if (!userId) {
        return;
    }

    const confirmed =
        window.confirm(
            `Remove ${name} from this group?`
        );

    if (!confirmed) {
        return;
    }

    button.disabled = true;
    button.textContent =
        'Removing...';

    setMessage('');

    try {
        await removeGroupMember(
            currentGroup.id,
            userId
        );

        await refreshGroup();

        setMessage(
            `${name} was removed from the group.`
        );
    } catch (error) {
        button.disabled = false;
        button.textContent =
            'Remove';

        setMessage(
            error?.message ||
            'The member could not be removed.'
        );
    }
}


/**
 * Transfers ownership to another existing member.
 */
async function transferOwnership(form) {
    if (!currentGroup?.id) {
        return;
    }

    const select =
        form.querySelector(
            '#groupManagementTransferOwner'
        );

    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );

    const newOwnerId =
        select?.value;

    if (!newOwnerId) {
        setMessage(
            'Select a member to become the new owner.'
        );

        return;
    }

    const profile =
        currentProfileMap.get(
            newOwnerId
        );

    const name =
        getProfileDisplayName(profile);

    const confirmed =
        window.confirm(
            `Transfer ownership to ${name}? You will become an Admin.`
        );

    if (!confirmed) {
        return;
    }

    if (select) {
        select.disabled = true;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent =
            'Transferring...';
    }

    setMessage('');

    try {
        await transferGroupOwnership(
            currentGroup.id,
            newOwnerId
        );

        await refreshGroup();

        setMessage(
            `Ownership transferred to ${name}.`
        );
    } catch (error) {
        if (select) {
            select.disabled = false;
        }

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent =
                'Transfer';
        }

        setMessage(
            error?.message ||
            'Ownership could not be transferred.'
        );
    }
}


/**
 * Leaves the current group when database rules allow it.
 */
async function leaveCurrentGroup(button) {
    if (!currentGroup?.id) {
        return;
    }

    const groupName =
        currentGroup.name ||
        'this group';

    const confirmed =
        window.confirm(
            `Leave ${groupName}? You will lose access to this group.`
        );

    if (!confirmed) {
        return;
    }

    button.disabled = true;
    button.textContent =
        'Leaving...';

    setMessage('');

    try {
        await leaveGroup(
            currentGroup.id
        );

        resetGroupManagement();
        exitGroup();
    } catch (error) {
        button.disabled = false;
        button.textContent =
            'Leave group';

        setMessage(
            error?.message ||
            'You could not leave this group.'
        );
    }
}


/**
 * Permanently deletes the current group.
 */
async function deleteCurrentGroup(button) {
    if (!currentGroup?.id) {
        return;
    }

    const groupName =
        currentGroup.name ||
        'this group';

    const confirmed =
        window.confirm(
            `Delete ${groupName}? This permanently deletes the group and its related data. This cannot be undone.`
        );

    if (!confirmed) {
        return;
    }

    button.disabled = true;
    button.textContent =
        'Deleting...';

    setMessage('');

    try {
        await deleteGroup(
            currentGroup.id
        );

        resetGroupManagement();
        exitGroup();
    } catch (error) {
        button.disabled = false;
        button.textContent =
            'Delete group';

        setMessage(
            error?.message ||
            'The group could not be deleted.'
        );
    }
}


/**
 * Handles Group Management clicks.
 *
 * Returns true when the event belonged to management.
 */
export function handleGroupManagementClick(
    event,
    container
) {
    const closeButton =
        event.target.closest(
            '[data-group-management-close]'
        );

    if (
        closeButton &&
        container.contains(closeButton)
    ) {
        closeGroupManagement();

        return true;
    }

    const memberOption =
        event.target.closest(
            '.group-management-member-option'
        );

    if (
        memberOption &&
        container.contains(
            memberOption
        )
    ) {
        toggleMember(
            memberOption.dataset.userId
        );

        return true;
    }

    const removeButton =
        event.target.closest(
            '[data-group-member-remove]'
        );

    if (
        removeButton &&
        container.contains(
            removeButton
        )
    ) {
        removeMember(
            removeButton
        );

        return true;
    }

    const leaveButton =
        event.target.closest(
            '[data-group-leave]'
        );

    if (
        leaveButton &&
        container.contains(
            leaveButton
        )
    ) {
        leaveCurrentGroup(
            leaveButton
        );

        return true;
    }

    const deleteButton =
        event.target.closest(
            '[data-group-delete]'
        );

    if (
        deleteButton &&
        container.contains(
            deleteButton
        )
    ) {
        deleteCurrentGroup(
            deleteButton
        );

        return true;
    }

    return false;
}


/**
 * Handles keyboard selection of Add members cards.
 *
 * Returns true when handled.
 */
export function handleGroupManagementKeydown(
    event,
    container
) {
    if (
        event.key !== 'Enter' &&
        event.key !== ' '
    ) {
        return false;
    }

    const memberOption =
        event.target.closest(
            '.group-management-member-option'
        );

    if (
        !memberOption ||
        !container.contains(
            memberOption
        )
    ) {
        return false;
    }

    event.preventDefault();

    toggleMember(
        memberOption.dataset.userId
    );

    return true;
}


/**
 * Handles Group Management form submissions.
 *
 * Returns true when handled.
 */
export function handleGroupManagementSubmit(
    event
) {
    const form =
        event.target;

    if (
        !(form instanceof HTMLFormElement)
    ) {
        return false;
    }

    if (
        form.id ===
        'groupManagementEditForm'
    ) {
        event.preventDefault();

        saveGroupDetails(form);

        return true;
    }

    if (
        form.id ===
        'groupManagementAddMembersForm'
    ) {
        event.preventDefault();

        addSelectedMembers(form);

        return true;
    }

    if (
        form.id ===
        'groupManagementTransferForm'
    ) {
        event.preventDefault();

        transferOwnership(form);

        return true;
    }

    return false;
}


/**
 * Handles OWNER role-selection changes.
 *
 * Returns true when handled.
 */
export function handleGroupManagementChange(
    event,
    container
) {
    const roleSelect =
        event.target.closest(
            '[data-group-role-user]'
        );

    if (
        !roleSelect ||
        !container.contains(
            roleSelect
        )
    ) {
        return false;
    }

    changeMemberRole(
        roleSelect
    );

    return true;
}


/**
 * Clears all user/group-specific management state.
 */
export function resetGroupManagement() {
    expanded = false;
    acceptedFriends = [];
    friendsLoaded = false;
    friendsLoading = false;
    selectedMemberIds =
        new Set();

    currentUser = null;
    currentGroup = null;
    currentMemberships = [];
    currentProfileMap =
        new Map();
    currentExpenses = [];
    currentSettlements = [];
}