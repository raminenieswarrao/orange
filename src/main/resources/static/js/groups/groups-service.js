import {
    getSupabaseClient
} from '../core/supabase-client.js';

const GROUP_FIELDS = [
    'id',
    'name',
    'description',
    'image_url',
    'default_currency',
    'created_by',
    'created_at',
    'updated_at'
].join(', ');

export const GROUP_ROLE = Object.freeze({
    OWNER: 'OWNER',
    ADMIN: 'ADMIN',
    MEMBER: 'MEMBER'
});

/**
 * Normalizes and validates a group name.
 */
function validateGroupName(value) {
    const name = String(value ?? '').trim();

    if (name.length < 2) {
        throw new Error(
            'Group name must contain at least 2 characters.'
        );
    }

    if (name.length > 80) {
        throw new Error(
            'Group name cannot exceed 80 characters.'
        );
    }

    return name;
}

/**
 * Normalizes and validates an optional description.
 */
function validateDescription(value) {
    const description =
        String(value ?? '').trim();

    if (description.length > 300) {
        throw new Error(
            'Group description cannot exceed 300 characters.'
        );
    }

    return description || null;
}

/**
 * Normalizes and validates a three-letter currency code.
 */
function validateCurrency(value) {
    const currency = String(
        value || 'USD'
    )
        .trim()
        .toUpperCase();

    if (!/^[A-Z]{3}$/.test(currency)) {
        throw new Error(
            'Currency must use a 3-letter code.'
        );
    }

    return currency;
}

/**
 * Validates a group role.
 */
function validateGroupRole(value) {
    const role =
        String(value ?? '')
            .trim()
            .toUpperCase();

    if (
        role !== GROUP_ROLE.OWNER &&
        role !== GROUP_ROLE.ADMIN &&
        role !== GROUP_ROLE.MEMBER
    ) {
        throw new Error(
            'A valid group role is required.'
        );
    }

    return role;
}

/**
 * Requires a group ID.
 */
function requireGroupId(groupId) {
    if (!groupId) {
        throw new Error(
            'Group ID is required.'
        );
    }

    return groupId;
}

/**
 * Requires a user ID.
 */
function requireUserId(userId) {
    if (!userId) {
        throw new Error(
            'User ID is required.'
        );
    }

    return userId;
}

/**
 * Removes missing and duplicate member IDs.
 */
function normalizeMemberIds(memberIds) {
    if (!Array.isArray(memberIds)) {
        return [];
    }

    return [
        ...new Set(
            memberIds.filter(Boolean)
        )
    ];
}

/**
 * Creates a group and its memberships atomically through
 * the public.create_group PostgreSQL function.
 */
export async function createGroup({
    name,
    description = null,
    defaultCurrency = 'USD',
    memberIds = []
}) {
    const client = await getSupabaseClient();

    const normalizedName =
        validateGroupName(name);

    const normalizedDescription =
        validateDescription(description);

    const normalizedCurrency =
        validateCurrency(defaultCurrency);

    const normalizedMemberIds =
        normalizeMemberIds(memberIds);

    const { data, error } = await client.rpc(
        'create_group',
        {
            p_name: normalizedName,
            p_description:
                normalizedDescription,
            p_default_currency:
                normalizedCurrency,
            p_member_ids:
                normalizedMemberIds
        }
    );

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Loads all groups visible to the authenticated user.
 *
 * Row-level security limits the result to groups that the
 * current user currently belongs to.
 */
export async function loadGroups() {
    const client = await getSupabaseClient();

    const { data, error } = await client
        .from('groups')
        .select(GROUP_FIELDS)
        .order('updated_at', {
            ascending: false
        });

    if (error) {
        throw error;
    }

    return data ?? [];
}

/**
 * Loads one group visible to the authenticated user.
 */
export async function loadGroup(groupId) {
    requireGroupId(groupId);

    const client = await getSupabaseClient();

    const { data, error } = await client
        .from('groups')
        .select(GROUP_FIELDS)
        .eq('id', groupId)
        .single();

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Loads the current user's membership for one group.
 */
export async function loadCurrentMembership(
    groupId,
    userId
) {
    requireGroupId(groupId);
    requireUserId(userId);

    const client = await getSupabaseClient();

    const { data, error } = await client
        .from('group_members')
        .select(
            'group_id, user_id, role, joined_at'
        )
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Loads all memberships visible for one group.
 */
export async function loadGroupMembers(groupId) {
    requireGroupId(groupId);

    const client = await getSupabaseClient();

    const { data, error } = await client
        .from('group_members')
        .select(
            'group_id, user_id, role, joined_at'
        )
        .eq('group_id', groupId)
        .order('joined_at', {
            ascending: true
        });

    if (error) {
        throw error;
    }

    return data ?? [];
}

/**
 * Updates editable group details through the secure
 * public.update_group_details PostgreSQL function.
 *
 * The database decides whether the authenticated user has
 * permission and whether a currency change is safe.
 */
export async function updateGroupDetails({
    groupId,
    name,
    description = null,
    defaultCurrency
}) {
    requireGroupId(groupId);

    const normalizedName =
        validateGroupName(name);

    const normalizedDescription =
        validateDescription(description);

    const normalizedCurrency =
        validateCurrency(defaultCurrency);

    const client = await getSupabaseClient();

    const { data, error } = await client.rpc(
        'update_group_details',
        {
            p_group_id: groupId,
            p_name: normalizedName,
            p_description:
                normalizedDescription,
            p_default_currency:
                normalizedCurrency
        }
    );

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Adds accepted friends to an existing group through the
 * secure public.add_group_members PostgreSQL function.
 *
 * New memberships always begin with MEMBER role.
 */
export async function addGroupMembers(
    groupId,
    memberIds
) {
    requireGroupId(groupId);

    const normalizedMemberIds =
        normalizeMemberIds(memberIds);

    if (normalizedMemberIds.length === 0) {
        throw new Error(
            'Select at least one person to add.'
        );
    }

    const client = await getSupabaseClient();

    const { data, error } = await client.rpc(
        'add_group_members',
        {
            p_group_id: groupId,
            p_member_ids:
                normalizedMemberIds
        }
    );

    if (error) {
        throw error;
    }

    return Number(data ?? 0);
}

/**
 * Changes one membership role through the secure
 * public.set_group_member_role PostgreSQL function.
 *
 * The database enforces OWNER-only role management and
 * last-owner protection.
 */
export async function setGroupMemberRole(
    groupId,
    userId,
    role
) {
    requireGroupId(groupId);
    requireUserId(userId);

    const normalizedRole =
        validateGroupRole(role);

    const client = await getSupabaseClient();

    const { data, error } = await client.rpc(
        'set_group_member_role',
        {
            p_group_id: groupId,
            p_user_id: userId,
            p_role: normalizedRole
        }
    );

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Removes another user from a group through the secure
 * public.remove_group_member PostgreSQL function.
 *
 * The database enforces manager permissions, role rules,
 * last-owner protection, and financial-history protection.
 */
export async function removeGroupMember(
    groupId,
    userId
) {
    requireGroupId(groupId);
    requireUserId(userId);

    const client = await getSupabaseClient();

    const { error } = await client.rpc(
        'remove_group_member',
        {
            p_group_id: groupId,
            p_user_id: userId
        }
    );

    if (error) {
        throw error;
    }
}

/**
 * Leaves the current authenticated user's group through
 * the secure public.leave_group PostgreSQL function.
 *
 * The database prevents the last OWNER from leaving and
 * protects members who still have financial history.
 */
export async function leaveGroup(groupId) {
    requireGroupId(groupId);

    const client = await getSupabaseClient();

    const { error } = await client.rpc(
        'leave_group',
        {
            p_group_id: groupId
        }
    );

    if (error) {
        throw error;
    }
}

/**
 * Atomically transfers ownership to another existing group
 * member through public.transfer_group_ownership.
 *
 * The selected member becomes OWNER and the transferring
 * owner becomes ADMIN.
 */
export async function transferGroupOwnership(
    groupId,
    newOwnerId
) {
    requireGroupId(groupId);
    requireUserId(newOwnerId);

    const client = await getSupabaseClient();

    const { error } = await client.rpc(
        'transfer_group_ownership',
        {
            p_group_id: groupId,
            p_new_owner_id:
                newOwnerId
        }
    );

    if (error) {
        throw error;
    }
}

/**
 * Deletes a group through the secure public.delete_group
 * PostgreSQL function.
 *
 * Only an OWNER may perform this operation. Related rows
 * are removed by the database's existing cascade rules.
 */
export async function deleteGroup(groupId) {
    requireGroupId(groupId);

    const client = await getSupabaseClient();

    const { data, error } = await client.rpc(
        'delete_group',
        {
            p_group_id: groupId
        }
    );

    if (error) {
        throw error;
    }

    return data;
}