/*
 * Orange application entry point.
 */

const ROUTE_STORAGE_KEY =
    'orange.currentRoute';

let signedInUser = null;

let auth;
let navigation;
let friendsPage;
let groupsPage;
let groupDetailPage;
let homeService;
let activityPage;
let personCard;

const elements = {};


/**
 * Finds shared application elements.
 */
function findElements() {
    elements.signInButton =
        document.querySelector('#googleSignIn');

    elements.authMessage =
        document.querySelector('#authMessage');

    elements.welcomeName =
        document.querySelector('#welcomeName');

    elements.profileButton =
        document.querySelector('#profileButton');

    elements.profileMenu =
        document.querySelector('#profileMenu');

    elements.profileMenuName =
        document.querySelector(
            '#profileMenuName'
        );

    elements.profileMenuSignOut =
        document.querySelector(
            '#profileMenuSignOut'
        );

    elements.homeBalanceCard =
        document.querySelector(
            '#homeBalanceCard'
        );

    elements.homeOverallBalance =
        document.querySelector(
            '#homeOverallBalance'
        );

    elements.homeOverallMessage =
        document.querySelector(
            '#homeOverallMessage'
        );

    elements.homeCurrencyBalances =
        document.querySelector(
            '#homeCurrencyBalances'
        );

    elements.homeMoneySummary =
        document.querySelector(
            '#homeMoneySummary'
        );

    elements.homeOwedToYou =
        document.querySelector(
            '#homeOwedToYou'
        );

    elements.homeYouOwe =
        document.querySelector(
            '#homeYouOwe'
        );

    elements.homeOwedPeople =
        document.querySelector(
            '#homeOwedPeople'
        );

    elements.homeYouOwePeople =
        document.querySelector(
            '#homeYouOwePeople'
        );

    elements.homeMessage =
        document.querySelector(
            '#homeMessage'
        );

    elements.homeDashboard =
        document.querySelector(
            '#homeDashboard'
        );

    elements.homeGroupSummaries =
        document.querySelector(
            '#homeGroupSummaries'
        );

    elements.homeEmptyState =
        document.querySelector(
            '#homeEmptyState'
        );

    elements.homeAddSplit =
        document.querySelector(
            '#homeAddSplit'
        );

    elements.homeBottomAddSplit =
        document.querySelector(
            '#homeBottomAddSplit'
        );

    elements.homeSettle =
        document.querySelector(
            '#homeSettle'
        );

    elements.homeViewGroups =
        document.querySelector(
            '#homeViewGroups'
        );

    elements.homeAddFriend =
        document.querySelector(
            '#homeAddFriend'
        );

    elements.homeActivityNav =
        document.querySelector(
            '#home .bottom-nav button:last-child'
        );

    elements.friendsNav =
        document.querySelector(
            '#friendsNav'
        );

    elements.friendsBack =
        document.querySelector(
            '#friendsBack'
        );

    elements.friendsHomeNav =
        document.querySelector(
            '#friendsHomeNav'
        );

    elements.friendsActivityNav =
        document.querySelector(
            '#friends .bottom-nav button:last-child'
        );

    elements.signOutButton =
        document.querySelector(
            '#signOutButton'
        );

    elements.homeCreateGroup =
        document.querySelector(
            '#homeCreateGroup'
        );

    elements.homeGroupsNav =
        document.querySelector(
            '#homeGroupsNav'
        );

    elements.friendsGroupsNav =
        document.querySelector(
            '#friendsGroupsNav'
        );

    elements.groupsBack =
        document.querySelector(
            '#groupsBack'
        );

    elements.groupsHomeNav =
        document.querySelector(
            '#groupsHomeNav'
        );

    elements.groupsFriendsNav =
        document.querySelector(
            '#groupsFriendsNav'
        );

    elements.groupsActivityNav =
        document.querySelector(
            '#groups .bottom-nav button:last-child'
        );

    elements.groupsList =
        document.querySelector(
            '#groupsList'
        );
}


/**
 * Adds a stylesheet once.
 */
function loadStylesheet(href) {
    if (
        document.querySelector(
            `link[href="${href}"]`
        )
    ) {
        return;
    }

    const link =
        document.createElement('link');

    link.rel = 'stylesheet';
    link.href = href;

    document.head.appendChild(link);
}


/**
 * Loads Orange feature modules.
 */
async function loadModules() {
    [
        auth,
        navigation,
        friendsPage,
        groupsPage,
        groupDetailPage,
        homeService,
        activityPage,
        personCard
    ] = await Promise.all([
        import('./core/auth.js'),
        import('./core/navigation.js'),
        import('./friends/friends-page.js'),
        import('./groups/groups-page.js'),
        import('./groups/group-detail-page.js'),
        import('./home/home-service.js'),
        import('./activity/activity-page.js'),
        import('./shared/person-card.js')
    ]);
}


/**
 * Stores the current location for this browser tab.
 */
function saveRoute(
    screenId,
    groupId = null
) {
    sessionStorage.setItem(
        ROUTE_STORAGE_KEY,
        JSON.stringify({
            screenId,
            groupId
        })
    );
}


/**
 * Returns the last location saved in this tab.
 */
function loadSavedRoute() {
    try {
        const value =
            sessionStorage.getItem(
                ROUTE_STORAGE_KEY
            );

        if (!value) {
            return null;
        }

        return JSON.parse(value);
    } catch (error) {
        sessionStorage.removeItem(
            ROUTE_STORAGE_KEY
        );

        return null;
    }
}


/**
 * Removes saved navigation state.
 */
function clearSavedRoute() {
    sessionStorage.removeItem(
        ROUTE_STORAGE_KEY
    );
}


/**
 * Displays an authentication message.
 */
function setAuthMessage(message = '') {
    elements.authMessage.textContent =
        message;
}


/**
 * Displays a Home message.
 */
function setHomeMessage(message = '') {
    elements.homeMessage.textContent =
        message;
}


/**
 * Opens or closes the Home profile menu.
 */
function setProfileMenuOpen(open) {
    if (
        !elements.profileMenu ||
        !elements.profileButton
    ) {
        return;
    }

    elements.profileMenu.hidden =
        !open;

    elements.profileButton.setAttribute(
        'aria-expanded',
        String(open)
    );
}


/**
 * Closes the Home profile menu.
 */
function closeProfileMenu() {
    setProfileMenuOpen(false);
}


/**
 * Toggles the Home profile menu.
 */
function handleProfileButtonClick(event) {
    event.stopPropagation();

    const shouldOpen =
        elements.profileMenu.hidden;

    setProfileMenuOpen(
        shouldOpen
    );
}


/**
 * Closes the profile menu when clicking elsewhere.
 */
function handleDocumentClick(event) {
    if (
        !elements.profileMenu ||
        elements.profileMenu.hidden
    ) {
        return;
    }

    if (
        elements.profileButton.contains(
            event.target
        ) ||
        elements.profileMenu.contains(
            event.target
        )
    ) {
        return;
    }

    closeProfileMenu();
}


/**
 * Closes the profile menu with Escape.
 */
function handleDocumentKeydown(event) {
    if (
        event.key !== 'Escape' ||
        !elements.profileMenu ||
        elements.profileMenu.hidden
    ) {
        return;
    }

    closeProfileMenu();

    elements.profileButton.focus();
}


/**
 * Formats money.
 */
function formatMoney(
    amount,
    currency = 'USD'
) {
    const numericAmount =
        Number(amount);

    const safeAmount =
        Number.isFinite(numericAmount)
            ? numericAmount
            : 0;

    try {
        return new Intl.NumberFormat(
            undefined,
            {
                style: 'currency',
                currency
            }
        ).format(safeAmount);
    } catch {
        return `${currency} ${safeAmount.toFixed(2)}`;
    }
}


/**
 * Returns all currencies relevant to Home,
 * including zero-balance groups.
 */
function getHomeCurrencySummaries(summary) {
    const summaryMap =
        new Map();

    summary.currencySummaries
        .forEach((currencySummary) => {
            summaryMap.set(
                currencySummary.currency,
                {
                    ...currencySummary
                }
            );
        });

    summary.groupSummaries
        .forEach((groupSummary) => {
            groupSummary.currencySummaries
                .forEach(
                    (currencySummary) => {
                        if (
                            !summaryMap.has(
                                currencySummary.currency
                            )
                        ) {
                            summaryMap.set(
                                currencySummary.currency,
                                {
                                    currency:
                                        currencySummary.currency,
                                    overallCents: 0,
                                    owedToYouCents: 0,
                                    youOweCents: 0,
                                    overallAmount: 0,
                                    owedToYouAmount: 0,
                                    youOweAmount: 0
                                }
                            );
                        }
                    }
                );
        });

    return Array.from(
        summaryMap.values()
    ).sort(
        (left, right) =>
            left.currency.localeCompare(
                right.currency
            )
    );
}


/**
 * Returns a balance sentence.
 */
function getBalanceMessage(
    balanceCents,
    amount,
    currency
) {
    if (balanceCents > 0) {
        return `You are owed ${formatMoney(
            amount,
            currency
        )}.`;
    }

    if (balanceCents < 0) {
        return `You owe ${formatMoney(
            Math.abs(amount),
            currency
        )}.`;
    }

    return 'You\'re all settled up.';
}


/**
 * Resets visual state classes on the
 * main Home balance card.
 */
function resetHomeBalanceClasses() {
    elements.homeBalanceCard.classList.remove(
        'positive',
        'negative',
        'settled',
        'multiple'
    );
}


/**
 * Displays one or more currency values
 * inside a Home summary field.
 */
function renderCurrencyValues(
    element,
    currencySummaries,
    amountField
) {
    element.replaceChildren();

    if (currencySummaries.length === 0) {
        element.textContent =
            formatMoney(
                0,
                'USD'
            );

        return;
    }

    if (currencySummaries.length === 1) {
        const summary =
            currencySummaries[0];

        element.textContent =
            formatMoney(
                summary[amountField],
                summary.currency
            );

        return;
    }

    const container =
        document.createElement('span');

    container.className =
        'home-multi-money';

    currencySummaries.forEach(
        (summary) => {
            const row =
                document.createElement('span');

            row.className =
                'home-multi-money-row';

            const currency =
                document.createElement('small');

            currency.textContent =
                summary.currency;

            const value =
                document.createElement('span');

            value.textContent =
                formatMoney(
                    summary[amountField],
                    summary.currency
                );

            row.append(
                currency,
                value
            );

            container.appendChild(row);
        }
    );

    element.appendChild(container);
}


/**
 * Renders the currency-by-currency
 * overall balance breakdown.
 */
function renderHomeCurrencyBreakdown(
    currencySummaries
) {
    elements.homeCurrencyBalances
        .replaceChildren();

    if (currencySummaries.length <= 1) {
        elements.homeCurrencyBalances.hidden =
            true;

        return;
    }

    currencySummaries.forEach(
        (summary) => {
            const row =
                document.createElement('div');

            row.className =
                'home-currency-balance-row';

            const label =
                document.createElement('span');

            label.textContent =
                summary.currency;

            const value =
                document.createElement('strong');

            value.textContent =
                formatMoney(
                    Math.abs(
                        summary.overallAmount
                    ),
                    summary.currency
                );

            if (summary.overallCents > 0) {
                row.classList.add(
                    'positive'
                );

                label.textContent =
                    `${summary.currency} · owed to you`;
            } else if (
                summary.overallCents < 0
            ) {
                row.classList.add(
                    'negative'
                );

                label.textContent =
                    `${summary.currency} · you owe`;
            } else {
                row.classList.add(
                    'settled'
                );

                label.textContent =
                    `${summary.currency} · settled`;
            }

            row.append(
                label,
                value
            );

            elements.homeCurrencyBalances
                .appendChild(row);
        }
    );

    elements.homeCurrencyBalances.hidden =
        false;
}


/**
 * Returns initials for a Home person row.
 */
function getPersonInitials(name = '') {
    const words =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2);

    if (words.length === 0) {
        return 'O';
    }

    return words
        .map(
            (word) =>
                word.charAt(0)
        )
        .join('')
        .toUpperCase();
}


/**
 * Creates one compact Home person balance row.
 */
function createHomePersonBalanceRow(
    personBalance
) {
    const row =
        document.createElement('div');

    row.className =
        'home-person-balance-row';

    const avatar =
        document.createElement('span');

    avatar.className =
        'home-person-balance-avatar';

    const profile =
        personBalance.profile;

    const displayName =
        personCard.getProfileDisplayName(
            profile
        );

    avatar.textContent =
        getPersonInitials(
            displayName
        );

    const copy =
        document.createElement('span');

    copy.className =
        'home-person-balance-copy';

    const name =
        document.createElement('strong');

    name.textContent =
        displayName;

    const currency =
        document.createElement('small');

    currency.textContent =
        personBalance.currency;

    copy.append(
        name,
        currency
    );

    const amount =
        document.createElement('strong');

    amount.className =
        'home-person-balance-amount';

    amount.textContent =
        formatMoney(
            personBalance.amount,
            personBalance.currency
        );

    row.append(
        avatar,
        copy,
        amount
    );

    return row;
}


/**
 * Renders global Home person relationships.
 */
function renderHomePersonBalances(
    personBalances
) {
    elements.homeOwedPeople
        .replaceChildren();

    elements.homeYouOwePeople
        .replaceChildren();

    const owedToYou =
        personBalances.filter(
            (personBalance) =>
                personBalance.direction ===
                'OWED_TO_YOU'
        );

    const youOwe =
        personBalances.filter(
            (personBalance) =>
                personBalance.direction ===
                'YOU_OWE'
        );

    owedToYou.forEach(
        (personBalance) => {
            elements.homeOwedPeople
                .appendChild(
                    createHomePersonBalanceRow(
                        personBalance
                    )
                );
        }
    );

    youOwe.forEach(
        (personBalance) => {
            elements.homeYouOwePeople
                .appendChild(
                    createHomePersonBalanceRow(
                        personBalance
                    )
                );
        }
    );

    if (owedToYou.length === 0) {
        const empty =
            document.createElement('span');

        empty.className =
            'home-person-balance-empty';

        empty.textContent =
            'No one owes you';

        elements.homeOwedPeople
            .appendChild(empty);
    }

    if (youOwe.length === 0) {
        const empty =
            document.createElement('span');

        empty.className =
            'home-person-balance-empty';

        empty.textContent =
            'You don\'t owe anyone';

        elements.homeYouOwePeople
            .appendChild(empty);
    }
}


/**
 * Creates one Home group summary card.
 */
function createHomeGroupSummaryCard(
    groupSummary
) {
    const group =
        groupSummary.group;

    const card =
        document.createElement('button');

    card.type = 'button';

    card.className =
        'home-group-summary-card';

    card.dataset.homeGroupId =
        group.id;

    const top =
        document.createElement('div');

    top.className =
        'home-group-summary-top';

    const copy =
        document.createElement('div');

    const name =
        document.createElement('strong');

    name.textContent =
        group.name;

    const activity =
        document.createElement('span');

    const expenseCount =
        groupSummary.expenseCount;

    const settlementCount =
        groupSummary.settlementCount;

    activity.textContent =
        `${expenseCount} ${
            expenseCount === 1
                ? 'expense'
                : 'expenses'
        } · ${settlementCount} ${
            settlementCount === 1
                ? 'payment'
                : 'payments'
        }`;

    copy.append(
        name,
        activity
    );

    const arrow =
        document.createElement('span');

    arrow.className =
        'home-group-summary-arrow';

    arrow.setAttribute(
        'aria-hidden',
        'true'
    );

    arrow.textContent = '›';

    top.append(
        copy,
        arrow
    );

    const balances =
        document.createElement('div');

    balances.className =
        'home-group-summary-balances';

    groupSummary.currencySummaries
        .forEach((currencySummary) => {
            const row =
                document.createElement('div');

            row.className =
                'home-group-summary-balance';

            const label =
                document.createElement('span');

            const value =
                document.createElement('strong');

            if (
                currencySummary.overallCents >
                0
            ) {
                row.classList.add(
                    'positive'
                );

                label.textContent =
                    'You are owed';

                value.textContent =
                    formatMoney(
                        currencySummary.overallAmount,
                        currencySummary.currency
                    );
            } else if (
                currencySummary.overallCents <
                0
            ) {
                row.classList.add(
                    'negative'
                );

                label.textContent =
                    'You owe';

                value.textContent =
                    formatMoney(
                        Math.abs(
                            currencySummary.overallAmount
                        ),
                        currencySummary.currency
                    );
            } else {
                row.classList.add(
                    'settled'
                );

                label.textContent =
                    'Settled';

                value.textContent =
                    formatMoney(
                        0,
                        currencySummary.currency
                    );
            }

            row.append(
                label,
                value
            );

            balances.appendChild(row);
        });

    card.append(
        top,
        balances
    );

    return card;
}


/**
 * Renders real group summaries on Home.
 */
function renderHomeGroupSummaries(
    groupSummaries
) {
    elements.homeGroupSummaries
        .replaceChildren();

    groupSummaries
        .slice(0, 4)
        .forEach(
            (groupSummary) => {
                elements.homeGroupSummaries
                    .appendChild(
                        createHomeGroupSummaryCard(
                            groupSummary
                        )
                    );
            }
        );
}


/**
 * Places the Home UI in a loading state.
 */
function renderHomeLoading() {
    resetHomeBalanceClasses();

    elements.homeOverallBalance.textContent =
        '—';

    elements.homeOverallMessage.textContent =
        'Loading your balance...';

    elements.homeCurrencyBalances.hidden =
        true;

    elements.homeCurrencyBalances
        .replaceChildren();

    elements.homeMoneySummary.hidden =
        true;

    elements.homeOwedPeople
        .replaceChildren();

    elements.homeYouOwePeople
        .replaceChildren();

    elements.homeDashboard.hidden =
        true;

    elements.homeEmptyState.hidden =
        true;

    elements.homeGroupSummaries
        .replaceChildren();

    setHomeMessage('');
}


/**
 * Renders a Home dashboard with no groups.
 */
function renderEmptyHome() {
    resetHomeBalanceClasses();

    elements.homeBalanceCard.classList.add(
        'settled'
    );

    elements.homeOverallBalance.textContent =
        formatMoney(
            0,
            'USD'
        );

    elements.homeOverallMessage.textContent =
        'Create a group to start sharing expenses.';

    elements.homeCurrencyBalances.hidden =
        true;

    elements.homeMoneySummary.hidden =
        true;

    elements.homeOwedPeople
        .replaceChildren();

    elements.homeYouOwePeople
        .replaceChildren();

    elements.homeDashboard.hidden =
        true;

    elements.homeEmptyState.hidden =
        false;

    elements.homeGroupSummaries
        .replaceChildren();
}


/**
 * Renders Home financial totals.
 */
function renderHomeFinancialSummary(
    summary
) {
    if (summary.groupCount === 0) {
        renderEmptyHome();
        return;
    }

    elements.homeEmptyState.hidden =
        true;

    elements.homeDashboard.hidden =
        false;

    elements.homeMoneySummary.hidden =
        false;

    const currencySummaries =
        getHomeCurrencySummaries(
            summary
        );

    resetHomeBalanceClasses();

    if (currencySummaries.length === 1) {
        const currencySummary =
            currencySummaries[0];

        elements.homeOverallBalance.textContent =
            formatMoney(
                Math.abs(
                    currencySummary.overallAmount
                ),
                currencySummary.currency
            );

        elements.homeOverallMessage.textContent =
            getBalanceMessage(
                currencySummary.overallCents,
                currencySummary.overallAmount,
                currencySummary.currency
            );

        if (
            currencySummary.overallCents > 0
        ) {
            elements.homeBalanceCard
                .classList.add(
                    'positive'
                );
        } else if (
            currencySummary.overallCents < 0
        ) {
            elements.homeBalanceCard
                .classList.add(
                    'negative'
                );
        } else {
            elements.homeBalanceCard
                .classList.add(
                    'settled'
                );
        }
    } else {
        elements.homeBalanceCard
            .classList.add(
                'multiple'
            );

        elements.homeOverallBalance.textContent =
            'By currency';

        elements.homeOverallMessage.textContent =
            'Balances are kept separate by currency.';
    }

    renderHomeCurrencyBreakdown(
        currencySummaries
    );

    renderCurrencyValues(
        elements.homeOwedToYou,
        currencySummaries,
        'owedToYouAmount'
    );

    renderCurrencyValues(
        elements.homeYouOwe,
        currencySummaries,
        'youOweAmount'
    );

    renderHomePersonBalances(
        summary.personBalances ?? []
    );

    renderHomeGroupSummaries(
        summary.groupSummaries
    );
}


/**
 * Loads and renders Home data.
 */
async function refreshHomeDashboard() {
    if (!signedInUser?.id) {
        return;
    }

    renderHomeLoading();

    try {
        const summary =
            await homeService
                .loadHomeFinancialSummary(
                    signedInUser.id
                );

        renderHomeFinancialSummary(
            summary
        );
    } catch (error) {
        console.error(
            'Unable to load Home dashboard:',
            error
        );

        elements.homeOverallBalance.textContent =
            '—';

        elements.homeOverallMessage.textContent =
            'Your balance could not be loaded.';

        elements.homeMoneySummary.hidden =
            true;

        elements.homeOwedPeople
            .replaceChildren();

        elements.homeYouOwePeople
            .replaceChildren();

        elements.homeDashboard.hidden =
            true;

        elements.homeEmptyState.hidden =
            true;

        setHomeMessage(
            error?.message ||
            'Home could not be refreshed.'
        );
    }
}


/**
 * Renders the signed-in user's identity.
 */
function renderSignedInUser(user) {
    signedInUser = user;

    const displayName =
        auth.getUserDisplayName(user);

    const firstName =
        auth.getUserFirstName(user);

    const avatarUrl =
        auth.getUserAvatarUrl(user);

    elements.welcomeName.textContent =
        `Hello, ${firstName}`;

    elements.profileMenuName.textContent =
        displayName;

    elements.profileButton.style.backgroundImage = '';
    elements.profileButton.style.backgroundSize = '';
    elements.profileButton.style.backgroundPosition = '';

    if (avatarUrl) {
        elements.profileButton.textContent = '';

        elements.profileButton.style.backgroundImage =
            `url("${avatarUrl}")`;

        elements.profileButton.style.backgroundSize =
            'cover';

        elements.profileButton.style.backgroundPosition =
            'center';
    } else {
        elements.profileButton.textContent =
            displayName.charAt(0).toUpperCase();
    }
}


/**
 * Opens and refreshes the authenticated
 * Home screen.
 */
async function openHome() {
    if (!signedInUser) {
        navigation.showScreen('auth');
        return;
    }

    closeProfileMenu();

    navigation.showScreen('home');
    saveRoute('home');

    await refreshHomeDashboard();
}


/**
 * Opens Friends and refreshes its data.
 */
async function openFriends() {
    if (!signedInUser) {
        navigation.showScreen('auth');
        return;
    }

    closeProfileMenu();

    navigation.showScreen('friends');
    saveRoute('friends');

    try {
        await friendsPage.openFriendsPage(
            signedInUser
        );
    } catch (error) {
        document.querySelector(
            '#friendsMessage'
        ).textContent = error.message;
    }
}


/**
 * Opens Groups and refreshes its data.
 */
async function openGroups({
    showCreate = false
} = {}) {
    if (!signedInUser) {
        navigation.showScreen('auth');
        return;
    }

    closeProfileMenu();

    navigation.showScreen('groups');
    saveRoute('groups');

    try {
        await groupsPage.openGroupsPage(
            signedInUser,
            {
                showCreate
            }
        );
    } catch (error) {
        document.querySelector(
            '#groupsMessage'
        ).textContent = error.message;
    }
}


/**
 * Opens one selected group's details.
 */
async function openGroupDetail(groupId) {
    if (!signedInUser || !groupId) {
        return;
    }

    closeProfileMenu();

    navigation.showScreen('groupDetail');

    saveRoute(
        'groupDetail',
        groupId
    );

    try {
        await groupDetailPage.openGroupDetailPage(
            groupId,
            signedInUser
        );
    } catch (error) {
        console.error(
            'Unable to open group:',
            error
        );
    }
}


/**
 * Opens Activity and refreshes its feed.
 */
async function openActivity() {
    if (!signedInUser) {
        navigation.showScreen('auth');
        return;
    }

    closeProfileMenu();

    navigation.showScreen('activity');
    saveRoute('activity');

    try {
        await activityPage.openActivityPage(
            signedInUser
        );
    } catch (error) {
        console.error(
            'Unable to open Activity:',
            error
        );
    }
}


/**
 * Opens Groups when a Home action needs
 * a group to be selected first.
 */
async function openGroupsForGroupAction() {
    await openGroups();
}


/**
 * Restores the previous screen after a page reload.
 */
async function restoreSavedRoute() {
    const route = loadSavedRoute();

    if (!route?.screenId) {
        await openHome();
        return;
    }

    switch (route.screenId) {
        case 'friends':
            await openFriends();
            break;

        case 'groups':
            await openGroups();
            break;

        case 'groupDetail':
            if (route.groupId) {
                await openGroupDetail(
                    route.groupId
                );
            } else {
                await openGroups();
            }

            break;

        case 'activity':
            await openActivity();
            break;

        case 'home':
        default:
            await openHome();
    }
}


/**
 * Handles clicks on group cards.
 */
function handleGroupCardClick(event) {
    const card =
        event.target.closest(
            '.group-card'
        );

    if (
        !card ||
        !elements.groupsList.contains(
            card
        )
    ) {
        return;
    }

    openGroupDetail(
        card.dataset.groupId
    );
}


/**
 * Handles clicks on Home group summaries.
 */
function handleHomeGroupClick(event) {
    const card =
        event.target.closest(
            '[data-home-group-id]'
        );

    if (
        !card ||
        !elements.homeGroupSummaries.contains(
            card
        )
    ) {
        return;
    }

    openGroupDetail(
        card.dataset.homeGroupId
    );
}


/**
 * Starts Google authentication.
 */
async function handleGoogleSignIn() {
    setAuthMessage('');

    elements.signInButton.disabled =
        true;

    try {
        await auth.signInWithGoogle();
    } catch (error) {
        setAuthMessage(
            error.message
        );

        elements.signInButton.disabled =
            false;
    }
}


/**
 * Signs out of Orange.
 */
async function handleSignOut() {
    closeProfileMenu();

    try {
        await auth.signOut();
    } catch (error) {
        const message =
            error?.message ||
            'Sign out failed.';

        setHomeMessage(message);

        document.querySelector(
            '#friendsMessage'
        ).textContent =
            message;

        return;
    }

    handleSignedOut();
}


/**
 * Clears Home state.
 */
function resetHomeDashboard() {
    resetHomeBalanceClasses();

    elements.homeOverallBalance.textContent =
        formatMoney(
            0,
            'USD'
        );

    elements.homeOverallMessage.textContent =
        'You\'re all settled up.';

    elements.homeCurrencyBalances
        .replaceChildren();

    elements.homeCurrencyBalances.hidden =
        true;

    elements.homeMoneySummary.hidden =
        true;

    elements.homeOwedPeople
        .replaceChildren();

    elements.homeYouOwePeople
        .replaceChildren();

    elements.homeDashboard.hidden =
        true;

    elements.homeEmptyState.hidden =
        true;

    elements.homeGroupSummaries
        .replaceChildren();

    setHomeMessage('');
}


/**
 * Clears authenticated application state.
 */
function handleSignedOut() {
    signedInUser = null;

    clearSavedRoute();
    closeProfileMenu();

    friendsPage.resetFriendsPage();
    groupsPage.resetGroupsPage();
    groupDetailPage.resetGroupDetailPage();
    activityPage.resetActivityPage();

    resetHomeDashboard();

    elements.signInButton.disabled =
        false;

    elements.profileButton.textContent =
        'O';

    elements.profileButton.style.backgroundImage =
        '';

    elements.profileButton.style.backgroundSize =
        '';

    elements.profileButton.style.backgroundPosition =
        '';

    elements.profileMenuName.textContent =
        'Orange user';

    navigation.showScreen('auth');
}


/**
 * Responds to Supabase authentication changes.
 *
 * Token refresh and tab-focus events must not change
 * the current Orange screen.
 */
function handleAuthStateChange(
    event,
    session,
    user
) {
    if (event === 'SIGNED_OUT') {
        handleSignedOut();
        return;
    }

    if (session?.user && user) {
        renderSignedInUser(user);
    }
}


/**
 * Connects shared navigation events.
 */
function bindEvents() {
    elements.signInButton.addEventListener(
        'click',
        handleGoogleSignIn
    );

    elements.profileButton.addEventListener(
        'click',
        handleProfileButtonClick
    );

    elements.profileMenuSignOut.addEventListener(
        'click',
        handleSignOut
    );

    document.addEventListener(
        'click',
        handleDocumentClick
    );

    document.addEventListener(
        'keydown',
        handleDocumentKeydown
    );

    elements.homeAddFriend.addEventListener(
        'click',
        openFriends
    );

    elements.homeAddSplit.addEventListener(
        'click',
        openGroupsForGroupAction
    );

    elements.homeBottomAddSplit.addEventListener(
        'click',
        openGroupsForGroupAction
    );

    elements.homeSettle.addEventListener(
        'click',
        openGroupsForGroupAction
    );

    elements.homeViewGroups.addEventListener(
        'click',
        () => openGroups()
    );

    elements.homeGroupSummaries.addEventListener(
        'click',
        handleHomeGroupClick
    );

    elements.homeActivityNav.addEventListener(
        'click',
        openActivity
    );

    elements.friendsNav.addEventListener(
        'click',
        openFriends
    );

    elements.friendsBack.addEventListener(
        'click',
        openHome
    );

    elements.friendsHomeNav.addEventListener(
        'click',
        openHome
    );

    elements.friendsActivityNav.addEventListener(
        'click',
        openActivity
    );

    elements.signOutButton.addEventListener(
        'click',
        handleSignOut
    );

    elements.homeCreateGroup.addEventListener(
        'click',
        () => {
            openGroups({
                showCreate: true
            });
        }
    );

    elements.homeGroupsNav.addEventListener(
        'click',
        () => openGroups()
    );

    elements.friendsGroupsNav.addEventListener(
        'click',
        () => openGroups()
    );

    elements.groupsBack.addEventListener(
        'click',
        openHome
    );

    elements.groupsHomeNav.addEventListener(
        'click',
        openHome
    );

    elements.groupsFriendsNav.addEventListener(
        'click',
        openFriends
    );

    elements.groupsActivityNav.addEventListener(
        'click',
        openActivity
    );

    elements.groupsList.addEventListener(
        'click',
        handleGroupCardClick
    );
}


/**
 * Initializes Group Details and its navigation.
 */
function initializeGroupDetails() {
    loadStylesheet(
        '/css/group-detail.css'
    );

    groupDetailPage.initializeGroupDetailPage({
        onBack: () => openGroups(),
        onHome: openHome,
        onFriends: openFriends,
        onGroups: () => openGroups()
    });

    navigation.registerScreen(
        'groupDetail'
    );
}


/**
 * Initializes Activity and its navigation.
 */
function initializeActivity() {
    loadStylesheet(
        '/css/activity.css'
    );

    activityPage.initializeActivityPage({
        onHome: openHome,
        onFriends: openFriends,
        onGroups: () => openGroups(),
        onGroup: openGroupDetail
    });

    navigation.registerScreen(
        'activity'
    );
}


/**
 * Initializes the Orange application.
 */
async function initializeApplication() {
    try {
        findElements();

        await loadModules();

        navigation.initializeNavigation();

        friendsPage.initializeFriendsPage();

        groupsPage.initializeGroupsPage();

        initializeGroupDetails();

        initializeActivity();

        bindEvents();

        const session =
            await auth.getSession();

        await auth.onAuthStateChange(
            handleAuthStateChange
        );

        if (session?.user) {
            renderSignedInUser(
                session.user
            );

            await restoreSavedRoute();

            return;
        }

        window.setTimeout(
            () => {
                if (!signedInUser) {
                    navigation.showScreen(
                        'auth'
                    );
                }
            },
            2600
        );
    } catch (error) {
        console.error(
            'Orange startup failed:',
            error
        );

        if (elements.authMessage) {
            setAuthMessage(
                error.message
            );
        }

        if (elements.signInButton) {
            elements.signInButton.disabled =
                true;
        }

        document.querySelector(
            '#splash'
        ).hidden = true;

        document.querySelector(
            '#auth'
        ).hidden = false;
    }
}


/**
 * Application startup.
 */
window.addEventListener(
    'load',
    initializeApplication
);


/**
 * Register the Orange PWA service worker.
 */
if ('serviceWorker' in navigator) {
    window.addEventListener(
        'load',
        () => {
            navigator.serviceWorker.register(
                '/service-worker.js'
            );
        }
    );
}