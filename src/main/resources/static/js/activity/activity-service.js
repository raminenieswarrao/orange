import {
    loadGroups
} from '../groups/groups-service.js';

import {
    loadGroupExpenses
} from '../expenses/expenses-service.js';

import {
    loadGroupSettlements
} from '../settlements/settlements-service.js';


export const ACTIVITY_TYPE = Object.freeze({
    EXPENSE: 'EXPENSE',
    SETTLEMENT: 'SETTLEMENT'
});


/**
 * Converts a value into a Date-safe timestamp.
 */
function toTimestamp(value) {
    if (!value) {
        return 0;
    }

    const timestamp =
        new Date(value).getTime();

    return Number.isFinite(timestamp)
        ? timestamp
        : 0;
}


/**
 * Returns the most useful chronological date
 * for an expense.
 */
function getExpenseActivityDate(expense) {
    return (
        expense.expense_date ||
        expense.created_at ||
        expense.updated_at ||
        null
    );
}


/**
 * Returns the most useful chronological date
 * for a settlement.
 */
function getSettlementActivityDate(settlement) {
    return (
        settlement.settled_at ||
        settlement.created_at ||
        null
    );
}


/**
 * Converts one expense into an Activity item.
 */
function createExpenseActivity(
    group,
    expense
) {
    return {
        id: `expense:${expense.id}`,
        recordId: expense.id,

        type: ACTIVITY_TYPE.EXPENSE,

        groupId: group.id,
        groupName: group.name,

        description:
            expense.description ||
            'Expense',

        amount:
            Number(
                expense.total_amount ?? 0
            ),

        currency:
            expense.currency ||
            group.default_currency ||
            'USD',

        paidBy:
            expense.paid_by || null,

        createdBy:
            expense.created_by || null,

        splitMethod:
            expense.split_method || null,

        notes:
            expense.notes || null,

        occurredAt:
            getExpenseActivityDate(
                expense
            )
    };
}


/**
 * Converts one settlement into an Activity item.
 */
function createSettlementActivity(
    group,
    settlement
) {
    return {
        id: `settlement:${settlement.id}`,
        recordId: settlement.id,

        type: ACTIVITY_TYPE.SETTLEMENT,

        groupId: group.id,
        groupName: group.name,

        description: 'Payment',

        amount:
            Number(
                settlement.amount ?? 0
            ),

        currency:
            settlement.currency ||
            group.default_currency ||
            'USD',

        paidBy:
            settlement.paid_by || null,

        paidTo:
            settlement.paid_to || null,

        createdBy:
            settlement.created_by || null,

        notes:
            settlement.notes || null,

        occurredAt:
            getSettlementActivityDate(
                settlement
            )
    };
}


/**
 * Loads all activity visible to the current user.
 *
 * RLS on groups, expenses and settlements ensures
 * the user only receives records for groups they
 * are allowed to access.
 */
export async function loadActivity() {
    const groups =
        await loadGroups();

    if (groups.length === 0) {
        return [];
    }

    const groupActivity =
        await Promise.all(
            groups.map(
                async (group) => {
                    const [
                        expenses,
                        settlements
                    ] = await Promise.all([
                        loadGroupExpenses(
                            group.id
                        ),

                        loadGroupSettlements(
                            group.id
                        )
                    ]);

                    const expenseActivity =
                        expenses.map(
                            (expense) =>
                                createExpenseActivity(
                                    group,
                                    expense
                                )
                        );

                    const settlementActivity =
                        settlements.map(
                            (settlement) =>
                                createSettlementActivity(
                                    group,
                                    settlement
                                )
                        );

                    return [
                        ...expenseActivity,
                        ...settlementActivity
                    ];
                }
            )
        );

    return groupActivity
        .flat()
        .sort(
            (left, right) =>
                toTimestamp(
                    right.occurredAt
                ) -
                toTimestamp(
                    left.occurredAt
                )
        );
}


/**
 * Loads only the most recent Activity items.
 */
export async function loadRecentActivity(
    limit = 50
) {
    const activity =
        await loadActivity();

    const normalizedLimit =
        Number.isInteger(limit) &&
        limit > 0
            ? limit
            : 50;

    return activity.slice(
        0,
        normalizedLimit
    );
}