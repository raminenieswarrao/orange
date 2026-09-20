import {
    getSupabaseClient
} from '../core/supabase-client.js';

export const SPLIT_METHOD = Object.freeze({
    EQUAL: 'EQUAL',
    CUSTOM: 'CUSTOM',
    PERCENTAGE: 'PERCENTAGE'
});

const EXPENSE_FIELDS = [
    'id',
    'group_id',
    'description',
    'total_amount',
    'currency',
    'paid_by',
    'split_method',
    'expense_date',
    'notes',
    'created_by',
    'created_at',
    'updated_at'
].join(', ');

const SHARE_FIELDS = [
    'expense_id',
    'user_id',
    'owed_amount',
    'split_value',
    'created_at'
].join(', ');

const PROFILE_FIELDS = [
    'id',
    'display_name',
    'username',
    'avatar_url'
].join(', ');


/**
 * Normalizes a currency amount to two decimal places.
 */
function normalizeAmount(value, fieldName) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        throw new Error(
            `${fieldName} must be a valid number.`
        );
    }

    const normalized =
        Math.round(
            (amount + Number.EPSILON) * 100
        ) / 100;

    if (normalized < 0) {
        throw new Error(
            `${fieldName} cannot be negative.`
        );
    }

    return normalized;
}


/**
 * Normalizes a percentage to four decimal places.
 */
function normalizePercentage(
    value,
    fieldName
) {
    const percentage = Number(value);

    if (!Number.isFinite(percentage)) {
        throw new Error(
            `${fieldName} must be a valid percentage.`
        );
    }

    const normalized =
        Math.round(
            (
                percentage +
                Number.EPSILON
            ) * 10000
        ) / 10000;

    if (
        normalized <= 0 ||
        normalized > 100
    ) {
        throw new Error(
            `${fieldName} must be greater than 0 and no more than 100.`
        );
    }

    return normalized;
}


/**
 * Validates an expense description.
 */
function normalizeDescription(value) {
    const description =
        String(value ?? '').trim();

    if (description.length < 1) {
        throw new Error(
            'Expense description is required.'
        );
    }

    if (description.length > 160) {
        throw new Error(
            'Expense description cannot exceed 160 characters.'
        );
    }

    return description;
}


/**
 * Validates optional expense notes.
 */
function normalizeNotes(value) {
    const notes =
        String(value ?? '').trim();

    if (notes.length > 1000) {
        throw new Error(
            'Expense notes cannot exceed 1000 characters.'
        );
    }

    return notes || null;
}


/**
 * Validates a three-letter currency code.
 */
function normalizeCurrency(value) {
    const currency =
        String(value || 'USD')
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
 * Validates the selected split participants.
 */
function normalizeShares(
    shares,
    splitMethod
) {
    if (
        !Array.isArray(shares) ||
        shares.length === 0
    ) {
        throw new Error(
            'Select at least one person for the split.'
        );
    }

    const normalized =
        shares.map((share, index) => {
            if (!share?.userId) {
                throw new Error(
                    'Every split participant must have a user ID.'
                );
            }

            const result = {
                userId: share.userId
            };

            if (
                splitMethod ===
                SPLIT_METHOD.CUSTOM
            ) {
                result.owedAmount =
                    normalizeAmount(
                        share.owedAmount,
                        `Exact share ${index + 1}`
                    );
            }

            if (
                splitMethod ===
                SPLIT_METHOD.PERCENTAGE
            ) {
                result.percentage =
                    normalizePercentage(
                        share.percentage,
                        `Percentage ${index + 1}`
                    );
            }

            return result;
        });

    const uniqueUserIds =
        new Set(
            normalized.map(
                (share) => share.userId
            )
        );

    if (
        uniqueUserIds.size !==
        normalized.length
    ) {
        throw new Error(
            'A person cannot appear more than once in a split.'
        );
    }

    return normalized;
}


/**
 * Validates that exact amounts equal the expense total.
 */
function validateCustomTotal(
    shares,
    totalAmount
) {
    const customTotal =
        shares.reduce(
            (sum, share) =>
                sum + share.owedAmount,
            0
        );

    const roundedTotal =
        Math.round(
            (
                customTotal +
                Number.EPSILON
            ) * 100
        ) / 100;

    if (roundedTotal !== totalAmount) {
        throw new Error(
            'Exact shares must add up to the expense total.'
        );
    }
}


/**
 * Validates that percentages total exactly 100.
 */
function validatePercentageTotal(shares) {
    const percentageTotal =
        shares.reduce(
            (sum, share) =>
                sum + share.percentage,
            0
        );

    const roundedTotal =
        Math.round(
            (
                percentageTotal +
                Number.EPSILON
            ) * 10000
        ) / 10000;

    if (roundedTotal !== 100) {
        throw new Error(
            'Percentages must add up to exactly 100%.'
        );
    }
}


/**
 * Creates an expense and all shares atomically.
 */
export async function createExpense({
    groupId,
    description,
    totalAmount,
    currency,
    paidBy,
    splitMethod,
    expenseDate,
    notes = null,
    shares
}) {
    if (!groupId) {
        throw new Error('Group is required.');
    }

    if (!paidBy) {
        throw new Error('Select who paid.');
    }

    if (
        !Object.values(SPLIT_METHOD)
            .includes(splitMethod)
    ) {
        throw new Error(
            'Select a valid split method.'
        );
    }

    const normalizedTotal =
        normalizeAmount(
            totalAmount,
            'Expense amount'
        );

    if (normalizedTotal <= 0) {
        throw new Error(
            'Expense amount must be greater than zero.'
        );
    }

    if (!expenseDate) {
        throw new Error(
            'Expense date is required.'
        );
    }

    const normalizedShares =
        normalizeShares(
            shares,
            splitMethod
        );

    if (
        splitMethod ===
        SPLIT_METHOD.CUSTOM
    ) {
        validateCustomTotal(
            normalizedShares,
            normalizedTotal
        );
    }

    if (
        splitMethod ===
        SPLIT_METHOD.PERCENTAGE
    ) {
        validatePercentageTotal(
            normalizedShares
        );
    }

    const client =
        await getSupabaseClient();

    const { data, error } = await client.rpc(
        'create_expense',
        {
            p_group_id: groupId,
            p_description:
                normalizeDescription(
                    description
                ),
            p_total_amount:
                normalizedTotal,
            p_paid_by: paidBy,
            p_split_method:
                splitMethod,
            p_shares:
                normalizedShares,
            p_currency:
                normalizeCurrency(currency),
            p_expense_date:
                expenseDate,
            p_notes:
                normalizeNotes(notes)
        }
    );

    if (error) {
        throw error;
    }

    return data;
}


/**
 * Updates an expense and replaces all shares atomically.
 */
export async function updateExpense({
    expenseId,
    description,
    totalAmount,
    currency,
    paidBy,
    splitMethod,
    expenseDate,
    notes = null,
    shares
}) {
    if (!expenseId) {
        throw new Error(
            'Expense ID is required.'
        );
    }

    if (!paidBy) {
        throw new Error('Select who paid.');
    }

    if (
        !Object.values(SPLIT_METHOD)
            .includes(splitMethod)
    ) {
        throw new Error(
            'Select a valid split method.'
        );
    }

    const normalizedTotal =
        normalizeAmount(
            totalAmount,
            'Expense amount'
        );

    if (normalizedTotal <= 0) {
        throw new Error(
            'Expense amount must be greater than zero.'
        );
    }

    if (!expenseDate) {
        throw new Error(
            'Expense date is required.'
        );
    }

    const normalizedShares =
        normalizeShares(
            shares,
            splitMethod
        );

    if (
        splitMethod ===
        SPLIT_METHOD.CUSTOM
    ) {
        validateCustomTotal(
            normalizedShares,
            normalizedTotal
        );
    }

    if (
        splitMethod ===
        SPLIT_METHOD.PERCENTAGE
    ) {
        validatePercentageTotal(
            normalizedShares
        );
    }

    const client =
        await getSupabaseClient();

    const { data, error } = await client.rpc(
        'update_expense',
        {
            p_expense_id: expenseId,
            p_description:
                normalizeDescription(
                    description
                ),
            p_total_amount:
                normalizedTotal,
            p_paid_by: paidBy,
            p_split_method:
                splitMethod,
            p_shares:
                normalizedShares,
            p_currency:
                normalizeCurrency(currency),
            p_expense_date:
                expenseDate,
            p_notes:
                normalizeNotes(notes)
        }
    );

    if (error) {
        throw error;
    }

    return data;
}


/**
 * Deletes an expense and its shares atomically.
 */
export async function deleteExpense(
    expenseId
) {
    if (!expenseId) {
        throw new Error(
            'Expense ID is required.'
        );
    }

    const client =
        await getSupabaseClient();

    const { data, error } = await client.rpc(
        'delete_expense',
        {
            p_expense_id: expenseId
        }
    );

    if (error) {
        throw error;
    }

    return data;
}


/**
 * Loads all expenses visible in one group.
 */
export async function loadGroupExpenses(
    groupId
) {
    if (!groupId) {
        throw new Error(
            'Group ID is required.'
        );
    }

    const client =
        await getSupabaseClient();

    const { data, error } = await client
        .from('expenses')
        .select(EXPENSE_FIELDS)
        .eq('group_id', groupId)
        .order('expense_date', {
            ascending: false
        })
        .order('created_at', {
            ascending: false
        });

    if (error) {
        throw error;
    }

    return data ?? [];
}


/**
 * Loads one expense visible to the current member.
 */
export async function loadExpense(
    expenseId
) {
    if (!expenseId) {
        throw new Error(
            'Expense ID is required.'
        );
    }

    const client =
        await getSupabaseClient();

    const { data, error } = await client
        .from('expenses')
        .select(EXPENSE_FIELDS)
        .eq('id', expenseId)
        .single();

    if (error) {
        throw error;
    }

    return data;
}


/**
 * Loads all shares for one expense.
 */
export async function loadExpenseShares(
    expenseId
) {
    if (!expenseId) {
        throw new Error(
            'Expense ID is required.'
        );
    }

    const client =
        await getSupabaseClient();

    const { data, error } = await client
        .from('expense_shares')
        .select(SHARE_FIELDS)
        .eq('expense_id', expenseId)
        .order('created_at', {
            ascending: true
        });

    if (error) {
        throw error;
    }

    return data ?? [];
}


/**
 * Loads shares for a collection of expenses.
 */
export async function loadSharesForExpenses(
    expenseIds
) {
    const uniqueExpenseIds = [
        ...new Set(
            (expenseIds ?? []).filter(Boolean)
        )
    ];

    if (uniqueExpenseIds.length === 0) {
        return [];
    }

    const client =
        await getSupabaseClient();

    const { data, error } = await client
        .from('expense_shares')
        .select(SHARE_FIELDS)
        .in('expense_id', uniqueExpenseIds);

    if (error) {
        throw error;
    }

    return data ?? [];
}


/**
 * Loads profiles by user IDs.
 */
export async function loadExpenseProfiles(
    userIds
) {
    const uniqueUserIds = [
        ...new Set(
            (userIds ?? []).filter(Boolean)
        )
    ];

    if (uniqueUserIds.length === 0) {
        return [];
    }

    const client =
        await getSupabaseClient();

    const { data, error } = await client
        .from('profiles')
        .select(PROFILE_FIELDS)
        .in('id', uniqueUserIds);

    if (error) {
        throw error;
    }

    return data ?? [];
}


/**
 * Loads an expense, shares and related profiles.
 */
export async function loadExpenseDetails(
    expenseId
) {
    if (!expenseId) {
        throw new Error(
            'Expense ID is required.'
        );
    }

    const [
        expense,
        shares
    ] = await Promise.all([
        loadExpense(expenseId),
        loadExpenseShares(expenseId)
    ]);

    const profileIds = [
        expense.paid_by,
        expense.created_by,
        ...shares.map(
            (share) => share.user_id
        )
    ];

    const profiles =
        await loadExpenseProfiles(
            profileIds
        );

    const profilesById =
        new Map(
            profiles.map(
                (profile) => [
                    profile.id,
                    profile
                ]
            )
        );

    const normalizedShares =
        shares.map((share) => ({
            ...share,
            profile:
                profilesById.get(
                    share.user_id
                ) ?? null
        }));

    return {
        expense,
        payer:
            profilesById.get(
                expense.paid_by
            ) ?? null,
        creator:
            profilesById.get(
                expense.created_by
            ) ?? null,
        shares: normalizedShares
    };
}