/**
 * Escapes text before placing database values into HTML.
 */
export function escapeHtml(value = '') {
    return String(value).replace(
        /[&<>'"]/g,
        (character) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        })[character]
    );
}

/**
 * Returns the best available display name for a profile.
 */
export function getProfileDisplayName(profile) {
    if (!profile) {
        return 'Orange user';
    }

    return (
        profile.display_name ||
        profile.username ||
        'Orange user'
    );
}

/**
 * Returns the username text only when one exists.
 */
function createUsernameMarkup(profile) {
    if (!profile?.username) {
        return '';
    }

    return `
        <span>
            @${escapeHtml(profile.username)}
        </span>
    `;
}

/**
 * Creates the avatar markup for a profile.
 */
function createAvatarMarkup(profile, displayName) {
    if (profile?.avatar_url) {
        return `
            <img
                src="${escapeHtml(profile.avatar_url)}"
                alt=""
                referrerpolicy="no-referrer"
            >
        `;
    }

    const initial =
        displayName.charAt(0).toUpperCase() || '?';

    return `
        <span class="person-initial">
            ${escapeHtml(initial)}
        </span>
    `;
}

/**
 * Creates one reusable profile card.
 *
 * Options:
 * - actions: trusted button markup created by Orange
 * - className: optional additional CSS class
 * - selectable: enables group-member selection semantics
 * - selected: marks a selectable person as selected
 */
export function createPersonCard(
    profile,
    {
        actions = '',
        className = '',
        selectable = false,
        selected = false
    } = {}
) {
    if (!profile?.id) {
        return '';
    }

    const displayName =
        getProfileDisplayName(profile);

    const avatar =
        createAvatarMarkup(profile, displayName);

    const username =
        createUsernameMarkup(profile);

    const classes = [
        'person-card',
        className,
        selectable ? 'person-card-selectable' : '',
        selected ? 'is-selected' : ''
    ]
        .filter(Boolean)
        .join(' ');

    const selectionAttributes = selectable
        ? `
            role="checkbox"
            tabindex="0"
            aria-checked="${selected}"
        `
        : '';

    return `
        <article
            class="${escapeHtml(classes)}"
            data-user-id="${escapeHtml(profile.id)}"
            ${selectionAttributes}
        >
            <div class="person-avatar">
                ${avatar}
            </div>

            <div class="person-copy">
                <strong>
                    ${escapeHtml(displayName)}
                </strong>

                ${username}
            </div>

            <div class="person-actions">
                ${actions}
            </div>
        </article>
    `;
}