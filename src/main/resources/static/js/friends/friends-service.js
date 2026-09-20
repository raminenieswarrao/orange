import {
    getSupabaseClient
} from '../core/supabase-client.js';

export const FRIENDSHIP_STATUS = Object.freeze({
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    DECLINED: 'DECLINED'
});

const PROFILE_FIELDS =
    'id, username, display_name, avatar_url';

const FRIENDSHIP_FIELDS =
    'id, requester_id, addressee_id, status, created_at';

/**
 * Validates a user ID required by a friendship operation.
 */
function requireUserId(userId) {
    if (!userId) {
        throw new Error(
            'A signed-in user is required.'
        );
    }

    return userId;
}

/**
 * Removes characters that can interfere with a
 * Supabase/PostgREST OR filter.
 */
export function sanitizeProfileSearch(value = '') {
    return String(value)
        .trim()
        .replace(/[%_,()]/g, '');
}

/**
 * Loads profiles and returns them in a Map keyed by ID.
 */
export async function loadProfileMap(userIds) {
    const uniqueUserIds = [
        ...new Set(
            userIds.filter(Boolean)
        )
    ];

    if (uniqueUserIds.length === 0) {
        return new Map();
    }

    const client = await getSupabaseClient();

    const { data, error } = await client
        .from('profiles')
        .select(PROFILE_FIELDS)
        .in('id', uniqueUserIds);

    if (error) {
        throw error;
    }

    return new Map(
        (data ?? []).map((profile) => [
            profile.id,
            profile
        ])
    );
}

/**
 * Loads every friendship involving the current user.
 */
export async function loadFriendships(userId) {
    requireUserId(userId);

    const client = await getSupabaseClient();

    const { data, error } = await client
        .from('friendships')
        .select(FRIENDSHIP_FIELDS)
        .or(
            `requester_id.eq.${userId},` +
            `addressee_id.eq.${userId}`
        )
        .order('created_at', {
            ascending: false
        });

    if (error) {
        throw error;
    }

    return data ?? [];
}

/**
 * Returns the other user's ID from a friendship row.
 */
export function getOtherUserId(
    friendship,
    currentUserId
) {
    if (!friendship || !currentUserId) {
        return null;
    }

    return friendship.requester_id === currentUserId
        ? friendship.addressee_id
        : friendship.requester_id;
}

/**
 * Loads incoming requests, accepted friends and their profiles.
 */
export async function loadFriendsPageData(userId) {
    requireUserId(userId);

    const friendships =
        await loadFriendships(userId);

    const incomingRequests = friendships.filter(
        (friendship) =>
            friendship.status ===
                FRIENDSHIP_STATUS.PENDING &&
            friendship.addressee_id === userId
    );

    const acceptedFriendships = friendships.filter(
        (friendship) =>
            friendship.status ===
            FRIENDSHIP_STATUS.ACCEPTED
    );

    const relatedUserIds = friendships.map(
        (friendship) =>
            getOtherUserId(friendship, userId)
    );

    const profiles =
        await loadProfileMap(relatedUserIds);

    return {
        friendships,
        incomingRequests,
        acceptedFriendships,
        profiles
    };
}

/**
 * Loads accepted friend profiles.
 *
 * The Create Group page will reuse this function.
 */
export async function loadAcceptedFriends(userId) {
    requireUserId(userId);

    const friendships =
        await loadFriendships(userId);

    const acceptedFriendships = friendships.filter(
        (friendship) =>
            friendship.status ===
            FRIENDSHIP_STATUS.ACCEPTED
    );

    const friendIds = acceptedFriendships.map(
        (friendship) =>
            getOtherUserId(friendship, userId)
    );

    const profiles =
        await loadProfileMap(friendIds);

    return acceptedFriendships
        .map((friendship) => {
            const friendId =
                getOtherUserId(
                    friendship,
                    userId
                );

            return profiles.get(friendId);
        })
        .filter(Boolean);
}

/**
 * Searches profiles and includes any existing relationship
 * with the current user.
 */
export async function searchProfiles(
    userId,
    searchValue
) {
    requireUserId(userId);

    const query =
        sanitizeProfileSearch(searchValue);

    if (query.length < 2) {
        throw new Error(
            'Enter at least two valid characters.'
        );
    }

    const client = await getSupabaseClient();

    const {
        data: profiles,
        error: profileError
    } = await client
        .from('profiles')
        .select(PROFILE_FIELDS)
        .or(
            `username.ilike.%${query}%,` +
            `display_name.ilike.%${query}%`
        )
        .neq('id', userId)
        .limit(15);

    if (profileError) {
        throw profileError;
    }

    const friendships =
        await loadFriendships(userId);

    const relationships = new Map();

    friendships.forEach((friendship) => {
        const otherUserId =
            getOtherUserId(friendship, userId);

        relationships.set(
            otherUserId,
            friendship
        );
    });

    return (profiles ?? []).map((profile) => ({
        profile,
        relationship:
            relationships.get(profile.id) ?? null
    }));
}

/**
 * Sends a new friend request.
 */
export async function sendFriendRequest(
    requesterId,
    addresseeId
) {
    requireUserId(requesterId);

    if (
        !addresseeId ||
        requesterId === addresseeId
    ) {
        throw new Error(
            'Invalid friend request.'
        );
    }

    const client = await getSupabaseClient();

    const { data, error } = await client
        .from('friendships')
        .insert({
            requester_id: requesterId,
            addressee_id: addresseeId,
            status: FRIENDSHIP_STATUS.PENDING
        })
        .select(FRIENDSHIP_FIELDS)
        .single();

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Updates an incoming request to ACCEPTED or DECLINED.
 */
async function updateFriendRequest(
    friendshipId,
    addresseeId,
    status
) {
    if (!friendshipId) {
        throw new Error(
            'Friend request was not found.'
        );
    }

    requireUserId(addresseeId);

    const client = await getSupabaseClient();

    const { data, error } = await client
        .from('friendships')
        .update({
            status
        })
        .eq('id', friendshipId)
        .eq('addressee_id', addresseeId)
        .eq(
            'status',
            FRIENDSHIP_STATUS.PENDING
        )
        .select(FRIENDSHIP_FIELDS)
        .single();

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Accepts an incoming friend request.
 */
export function acceptFriendRequest(
    friendshipId,
    currentUserId
) {
    return updateFriendRequest(
        friendshipId,
        currentUserId,
        FRIENDSHIP_STATUS.ACCEPTED
    );
}

/**
 * Declines an incoming friend request.
 */
export function declineFriendRequest(
    friendshipId,
    currentUserId
) {
    return updateFriendRequest(
        friendshipId,
        currentUserId,
        FRIENDSHIP_STATUS.DECLINED
    );
}