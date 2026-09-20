import {
    loadGroups
} from '../groups/groups-service.js';

import {
    loadGroupExpenses,
    loadSharesForExpenses
} from '../expenses/expenses-service.js';

import {
    loadGroupSettlements,
    getSettlementAmountCents
} from '../settlements/settlements-service.js';

import {
    loadProfileMap
} from '../friends/friends-service.js';


/**
 * Converts a database money value into
 * integer cents.
 */
function toCents(value) {
    const numericValue =
        Number(value);

    if (!Number.isFinite(numericValue)) {
        return 0;
    }

    return Math.round(
        numericValue * 100
    );
}


/**
 * Adds cents to a map entry.
 */
function addCents(
    map,
    key,
    cents
) {
    map.set(
        key,
        (
            map.get(key) ?? 0
        ) + cents
    );
}


/**
 * Adds a signed balance to one currency.
 */
function addCurrencyBalance(
    currencyMap,
    currency,
    balanceCents
) {
    if (!currency) {
        return;
    }

    const current =
        currencyMap.get(currency) ?? {
            currency,
            overallCents: 0,
            owedToYouCents: 0,
            youOweCents: 0
        };

    if (balanceCents > 0) {
        current.owedToYouCents +=
            balanceCents;
    }

    if (balanceCents < 0) {
        current.youOweCents +=
            Math.abs(balanceCents);
    }

    current.overallCents +=
        balanceCents;

    currencyMap.set(
        currency,
        current
    );
}


/**
 * Groups expense shares by expense ID.
 */
function createSharesByExpense(
    shares
) {
    const sharesByExpense =
        new Map();

    shares.forEach((share) => {
        const expenseShares =
            sharesByExpense.get(
                share.expense_id
            ) ?? [];

        expenseShares.push(
            share
        );

        sharesByExpense.set(
            share.expense_id,
            expenseShares
        );
    });

    return sharesByExpense;
}


/**
 * Adds expense debts into group-level pairwise balances.
 *
 * Positive balance:
 * other person owes current user.
 *
 * Negative balance:
 * current user owes other person.
 *
 * Key:
 * groupId|currency|otherUserId
 */
function addExpenseBalances({
    group,
    expenses,
    sharesByExpense,
    userId,
    pairBalances
}) {
    expenses.forEach((expense) => {
        const payerId =
            expense.paid_by;

        const currency =
            expense.currency ||
            group.default_currency ||
            'USD';

        const expenseShares =
            sharesByExpense.get(
                expense.id
            ) ?? [];

        expenseShares.forEach(
            (share) => {
                const participantId =
                    share.user_id;

                if (
                    !participantId ||
                    participantId === payerId
                ) {
                    return;
                }

                const owedCents =
                    toCents(
                        share.owed_amount
                    );

                if (owedCents === 0) {
                    return;
                }

                /*
                 * Current user paid.
                 * Participant owes current user.
                 */
                if (payerId === userId) {
                    const key = [
                        group.id,
                        currency,
                        participantId
                    ].join('|');

                    addCents(
                        pairBalances,
                        key,
                        owedCents
                    );

                    return;
                }

                /*
                 * Someone else paid and the
                 * current user participated.
                 */
                if (
                    participantId === userId
                ) {
                    const key = [
                        group.id,
                        currency,
                        payerId
                    ].join('|');

                    addCents(
                        pairBalances,
                        key,
                        -owedCents
                    );
                }
            }
        );
    });
}


/**
 * Adds settlement adjustments into group-level
 * pairwise balances.
 *
 * Current user pays someone:
 * balance with that person increases.
 *
 * Someone pays current user:
 * balance with that person decreases.
 */
function addSettlementBalances({
    group,
    settlements,
    userId,
    pairBalances
}) {
    settlements.forEach(
        (settlement) => {
            const amountCents =
                getSettlementAmountCents(
                    settlement
                );

            if (amountCents === 0) {
                return;
            }

            const currency =
                settlement.currency ||
                group.default_currency ||
                'USD';

            if (
                settlement.paid_by ===
                userId
            ) {
                const otherUserId =
                    settlement.paid_to;

                if (!otherUserId) {
                    return;
                }

                const key = [
                    group.id,
                    currency,
                    otherUserId
                ].join('|');

                addCents(
                    pairBalances,
                    key,
                    amountCents
                );

                return;
            }

            if (
                settlement.paid_to ===
                userId
            ) {
                const otherUserId =
                    settlement.paid_by;

                if (!otherUserId) {
                    return;
                }

                const key = [
                    group.id,
                    currency,
                    otherUserId
                ].join('|');

                addCents(
                    pairBalances,
                    key,
                    -amountCents
                );
            }
        }
    );
}


/**
 * Collapses group-level pair balances into
 * Home-level person balances.
 *
 * This is important because the same person may appear
 * in multiple groups.
 *
 * Example:
 *
 * Group A:
 * Alex owes current user $30.
 *
 * Group B:
 * Current user owes Alex $20.
 *
 * Home result:
 * Alex owes current user $10.
 *
 * Different currencies are NEVER combined.
 *
 * Key:
 * currency|otherUserId
 */
function createGlobalPersonBalanceMap(
    pairBalances
) {
    const personBalances =
        new Map();

    pairBalances.forEach(
        (balanceCents, key) => {
            const [
                ,
                currency = 'USD',
                otherUserId
            ] = key.split('|');

            if (!otherUserId) {
                return;
            }

            const globalKey = [
                currency,
                otherUserId
            ].join('|');

            addCents(
                personBalances,
                globalKey,
                balanceCents
            );
        }
    );

    return personBalances;
}


/**
 * Converts globally-netted person balances into
 * Home currency totals.
 *
 * The same person's opposing balances across groups
 * have already been netted before reaching this step.
 */
function createCurrencySummaries(
    globalPersonBalances
) {
    const currencyMap =
        new Map();

    globalPersonBalances.forEach(
        (balanceCents, key) => {
            if (balanceCents === 0) {
                return;
            }

            const [
                currency = 'USD'
            ] = key.split('|');

            addCurrencyBalance(
                currencyMap,
                currency,
                balanceCents
            );
        }
    );

    return Array.from(
        currencyMap.values()
    )
        .map((summary) => ({
            ...summary,
            overallAmount:
                summary.overallCents / 100,
            owedToYouAmount:
                summary.owedToYouCents / 100,
            youOweAmount:
                summary.youOweCents / 100
        }))
        .sort(
            (left, right) =>
                left.currency.localeCompare(
                    right.currency
                )
        );
}


/**
 * Returns one group's balances grouped
 * by currency.
 *
 * Group summaries intentionally stay group-specific.
 */
function createGroupCurrencySummaries(
    group,
    pairBalances
) {
    const currencyMap =
        new Map();

    const prefix =
        `${group.id}|`;

    pairBalances.forEach(
        (balanceCents, key) => {
            if (!key.startsWith(prefix)) {
                return;
            }

            const parts =
                key.split('|');

            const currency =
                parts[1] ||
                group.default_currency ||
                'USD';

            addCurrencyBalance(
                currencyMap,
                currency,
                balanceCents
            );
        }
    );

    /*
     * Keep a zero-balance row for groups
     * with no expenses/payments yet.
     */
    if (currencyMap.size === 0) {
        const currency =
            group.default_currency ||
            'USD';

        currencyMap.set(
            currency,
            {
                currency,
                overallCents: 0,
                owedToYouCents: 0,
                youOweCents: 0
            }
        );
    }

    return Array.from(
        currencyMap.values()
    )
        .map((summary) => ({
            ...summary,
            overallAmount:
                summary.overallCents / 100,
            owedToYouAmount:
                summary.owedToYouCents / 100,
            youOweAmount:
                summary.youOweCents / 100
        }))
        .sort(
            (left, right) =>
                left.currency.localeCompare(
                    right.currency
                )
        );
}


/**
 * Returns every user ID participating in a non-zero
 * globally-netted balance.
 */
function getPersonBalanceUserIds(
    globalPersonBalances
) {
    const userIds =
        new Set();

    globalPersonBalances.forEach(
        (balanceCents, key) => {
            if (balanceCents === 0) {
                return;
            }

            const parts =
                key.split('|');

            const userId =
                parts[1];

            if (userId) {
                userIds.add(userId);
            }
        }
    );

    return Array.from(userIds);
}


/**
 * Creates flat person/currency rows for Home.
 *
 * Positive balance:
 * this person owes current user.
 *
 * Negative balance:
 * current user owes this person.
 *
 * One person can therefore have multiple rows if the
 * relationship exists in multiple currencies.
 */
function createPersonBalanceSummaries(
    globalPersonBalances,
    profileMap
) {
    const personBalances = [];

    globalPersonBalances.forEach(
        (balanceCents, key) => {
            if (balanceCents === 0) {
                return;
            }

            const [
                currency = 'USD',
                userId
            ] = key.split('|');

            if (!userId) {
                return;
            }

            personBalances.push({
                userId,
                profile:
                    profileMap.get(userId) ??
                    null,
                currency,
                balanceCents,
                amount:
                    Math.abs(
                        balanceCents
                    ) / 100,
                direction:
                    balanceCents > 0
                        ? 'OWED_TO_YOU'
                        : 'YOU_OWE'
            });
        }
    );

    return personBalances.sort(
        (left, right) => {
            if (
                left.currency !==
                right.currency
            ) {
                return left.currency.localeCompare(
                    right.currency
                );
            }

            return (
                right.amount -
                left.amount
            );
        }
    );
}


/**
 * Loads all expense/share/payment data needed
 * for one Home group summary.
 */
async function loadGroupFinancialData(
    group
) {
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

    const shares =
        await loadSharesForExpenses(
            expenses.map(
                (expense) =>
                    expense.id
            )
        );

    return {
        group,
        expenses,
        settlements,
        sharesByExpense:
            createSharesByExpense(
                shares
            )
    };
}


/**
 * Loads the complete settlement-aware Home
 * financial summary for the signed-in user.
 *
 * Home-level person relationships are netted across
 * every group before "Owed to you" and "You owe"
 * totals are calculated.
 *
 * Currency totals are intentionally kept separate.
 * Orange must not add USD + INR + EUR together
 * without an exchange-rate conversion.
 */
export async function loadHomeFinancialSummary(
    userId
) {
    if (!userId) {
        throw new Error(
            'A signed-in user is required.'
        );
    }

    const groups =
        await loadGroups();

    if (groups.length === 0) {
        return {
            groups: [],
            groupCount: 0,
            currencySummaries: [],
            personBalances: [],
            groupSummaries: []
        };
    }

    const financialData =
        await Promise.all(
            groups.map(
                (group) =>
                    loadGroupFinancialData(
                        group
                    )
            )
        );

    /*
     * First calculate each relationship inside each
     * individual group.
     */
    const pairBalances =
        new Map();

    financialData.forEach(
        ({
            group,
            expenses,
            settlements,
            sharesByExpense
        }) => {
            addExpenseBalances({
                group,
                expenses,
                sharesByExpense,
                userId,
                pairBalances
            });

            addSettlementBalances({
                group,
                settlements,
                userId,
                pairBalances
            });
        }
    );

    /*
     * Then collapse matching person + currency pairs
     * across ALL groups.
     */
    const globalPersonBalances =
        createGlobalPersonBalanceMap(
            pairBalances
        );

    const profileIds =
        getPersonBalanceUserIds(
            globalPersonBalances
        );

    const profileMap =
        profileIds.length > 0
            ? await loadProfileMap(
                profileIds
            )
            : new Map();

    /*
     * Home totals are calculated only after the
     * global person-level netting above.
     */
    const currencySummaries =
        createCurrencySummaries(
            globalPersonBalances
        );

    const personBalances =
        createPersonBalanceSummaries(
            globalPersonBalances,
            profileMap
        );

    /*
     * Group cards remain group-specific.
     */
    const groupSummaries =
        financialData.map(
            ({
                group,
                expenses,
                settlements
            }) => ({
                group,
                expenseCount:
                    expenses.length,
                settlementCount:
                    settlements.length,
                currencySummaries:
                    createGroupCurrencySummaries(
                        group,
                        pairBalances
                    )
            })
        );

    return {
        groups,
        groupCount:
            groups.length,
        currencySummaries,
        personBalances,
        groupSummaries
    };
}