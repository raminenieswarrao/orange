import {
    getSupabaseClient
} from '../core/supabase-client.js';


/**
 * Normalizes a settlement amount to two decimals.
 */
function normalizeAmount(amount) {
    const numericAmount =
        Number(amount);

    if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
    ) {
        throw new Error(
            'Settlement amount must be greater than zero.'
        );
    }

    return (
        Math.round(
            numericAmount * 100
        ) / 100
    );
}


/**
 * Validates the required settlement values.
 */
function validateSettlementInput({
    groupId,
    paidBy,
    paidTo,
    amount
}) {
    if (!groupId) {
        throw new Error(
            'A group is required.'
        );
    }

    if (!paidBy) {
        throw new Error(
            'Select who paid.'
        );
    }

    if (!paidTo) {
        throw new Error(
            'Select who received the payment.'
        );
    }

    if (paidBy === paidTo) {
        throw new Error(
            'The sender and receiver must be different people.'
        );
    }

    return normalizeAmount(amount);
}


/**
 * Creates a settlement using the secure
 * create_settlement database RPC.
 */
export async function createSettlement({
    groupId,
    paidBy,
    paidTo,
    amount,
    notes = null
}) {
    const normalizedAmount =
        validateSettlementInput({
            groupId,
            paidBy,
            paidTo,
            amount
        });

    const client =
        await getSupabaseClient();

    const normalizedNotes =
        typeof notes === 'string'
            ? notes.trim()
            : '';

    const {
        data,
        error
    } = await client.rpc(
        'create_settlement',
        {
            p_group_id:
                groupId,
            p_paid_by:
                paidBy,
            p_paid_to:
                paidTo,
            p_amount:
                normalizedAmount,
            p_notes:
                normalizedNotes || null
        }
    );

    if (error) {
        throw new Error(
            error.message ||
            'Settlement could not be saved.'
        );
    }

    return data;
}


/**
 * Loads all settlements for a group.
 *
 * RLS ensures only an authenticated member
 * of the group can read these rows.
 */
export async function loadGroupSettlements(
    groupId
) {
    if (!groupId) {
        throw new Error(
            'A group is required.'
        );
    }

    const client =
        await getSupabaseClient();

    const {
        data,
        error
    } = await client
        .from('settlements')
        .select(`
            id,
            group_id,
            paid_by,
            paid_to,
            amount,
            currency,
            settled_at,
            notes,
            created_by,
            created_at
        `)
        .eq(
            'group_id',
            groupId
        )
        .order(
            'settled_at',
            {
                ascending: false
            }
        )
        .order(
            'created_at',
            {
                ascending: false
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            'Settlements could not be loaded.'
        );
    }

    return data ?? [];
}


/**
 * Loads one settlement.
 *
 * RLS ensures the current user must be able
 * to read the settlement's group.
 */
export async function loadSettlement(
    settlementId
) {
    if (!settlementId) {
        throw new Error(
            'A settlement is required.'
        );
    }

    const client =
        await getSupabaseClient();

    const {
        data,
        error
    } = await client
        .from('settlements')
        .select(`
            id,
            group_id,
            paid_by,
            paid_to,
            amount,
            currency,
            settled_at,
            notes,
            created_by,
            created_at
        `)
        .eq(
            'id',
            settlementId
        )
        .single();

    if (error) {
        throw new Error(
            error.message ||
            'Settlement could not be loaded.'
        );
    }

    return data;
}


/**
 * Deletes a settlement.
 *
 * Existing RLS permits deletion by the
 * settlement creator or a group manager.
 *
 * Returning the deleted row lets Orange
 * distinguish a successful deletion from
 * an RLS-protected zero-row operation.
 */
export async function deleteSettlement(
    settlementId
) {
    if (!settlementId) {
        throw new Error(
            'A settlement is required.'
        );
    }

    const client =
        await getSupabaseClient();

    const {
        data,
        error
    } = await client
        .from('settlements')
        .delete()
        .eq(
            'id',
            settlementId
        )
        .select('id');

    if (error) {
        throw new Error(
            error.message ||
            'Settlement could not be deleted.'
        );
    }

    if (
        !Array.isArray(data) ||
        data.length !== 1
    ) {
        throw new Error(
            'You do not have permission to delete this payment, or it no longer exists.'
        );
    }

    return data[0];
}


/**
 * Converts a settlement amount into integer cents.
 */
export function getSettlementAmountCents(
    settlement
) {
    const amountCents =
        Math.round(
            Number(
                settlement?.amount ?? 0
            ) * 100
        );

    return Number.isFinite(amountCents)
        ? amountCents
        : 0;
}