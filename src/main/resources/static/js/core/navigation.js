const STARTUP_SPLASH_DURATION_MS = 5000;

const screens = new Map();

let activeScreenId = null;

let startupSplashStartedAt = null;
let startupSplashComplete = false;
let startupTargetScreenId = null;
let startupSplashTimer = null;


/**
 * Registers all elements marked with data-screen.
 */
export function registerDataScreens() {
    document.querySelectorAll('[data-screen]').forEach(
        (screen) => {
            if (screen.id) {
                screens.set(screen.id, screen);
            }
        }
    );
}


/**
 * Registers a screen using its element ID.
 */
export function registerScreen(screenId) {
    const screen =
        document.getElementById(screenId);

    if (!screen) {
        throw new Error(
            `Cannot register screen: #${screenId} was not found.`
        );
    }

    screens.set(screenId, screen);

    return screen;
}


/**
 * Registers several screen IDs at once.
 */
export function registerScreens(screenIds) {
    screenIds.forEach(registerScreen);
}


/**
 * Immediately displays one registered screen.
 *
 * This bypasses the startup splash delay and is used
 * internally once the five-second splash has completed.
 */
function displayScreen(screenId) {
    const nextScreen =
        screens.get(screenId);

    if (!nextScreen) {
        throw new Error(
            `Cannot show screen: #${screenId} is not registered.`
        );
    }

    screens.forEach(
        (screen, registeredId) => {
            screen.hidden =
                registeredId !== screenId;
        }
    );

    activeScreenId = screenId;

    window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto'
    });

    document.dispatchEvent(
        new CustomEvent(
            'orange:screen-change',
            {
                detail: {
                    screenId
                }
            }
        )
    );
}


/**
 * Completes the startup splash and opens whichever
 * application screen was requested during startup.
 */
function completeStartupSplash() {
    if (startupSplashComplete) {
        return;
    }

    startupSplashComplete = true;

    if (startupSplashTimer !== null) {
        window.clearTimeout(
            startupSplashTimer
        );

        startupSplashTimer = null;
    }

    const targetScreenId =
        startupTargetScreenId;

    startupTargetScreenId = null;

    if (
        targetScreenId &&
        screens.has(targetScreenId)
    ) {
        displayScreen(targetScreenId);
    }
}


/**
 * Holds the startup splash until its full duration
 * has elapsed.
 */
function queueStartupScreen(screenId) {
    startupTargetScreenId = screenId;

    if (startupSplashStartedAt === null) {
        startupSplashStartedAt =
            performance.now();
    }

    const elapsed =
        performance.now() -
        startupSplashStartedAt;

    const remaining =
        Math.max(
            0,
            STARTUP_SPLASH_DURATION_MS -
            elapsed
        );

    if (remaining === 0) {
        completeStartupSplash();
        return;
    }

    if (startupSplashTimer !== null) {
        window.clearTimeout(
            startupSplashTimer
        );
    }

    startupSplashTimer =
        window.setTimeout(
            completeStartupSplash,
            remaining
        );
}


/**
 * Displays one registered screen and hides the others.
 *
 * During a genuine application load/refresh, Orange keeps
 * the splash visible for five seconds before revealing the
 * requested application screen.
 *
 * After startup completes, navigation behaves normally.
 */
export function showScreen(screenId) {
    const nextScreen =
        screens.get(screenId);

    if (!nextScreen) {
        throw new Error(
            `Cannot show screen: #${screenId} is not registered.`
        );
    }

    /*
     * The splash itself is always allowed immediately.
     */
    if (screenId === 'splash') {
        displayScreen('splash');
        return;
    }

    /*
     * Only the initial application load is delayed.
     *
     * Home, Friends, Groups, Group Detail, Activity,
     * Add Expense, and other internal navigation remain
     * instant after startup.
     */
    if (!startupSplashComplete) {
        queueStartupScreen(screenId);
        return;
    }

    displayScreen(screenId);
}


/**
 * Returns the currently displayed screen ID.
 */
export function getActiveScreenId() {
    return activeScreenId;
}


/**
 * Returns a registered screen element.
 */
export function getScreen(screenId) {
    return screens.get(screenId) ?? null;
}


/**
 * Checks whether a screen has been registered.
 */
export function hasScreen(screenId) {
    return screens.has(screenId);
}


/**
 * Registers all Orange application screens.
 */
export function initializeNavigation() {
    registerScreens([
        'splash',
        'auth',
        'home',
        'friends',
        'groups'
    ]);

    /*
     * initializeNavigation() runs once during a genuine
     * document load. Starting the timer here means normal
     * SPA navigation does not restart the splash.
     */
    startupSplashStartedAt =
        performance.now();

    startupSplashComplete = false;
    startupTargetScreenId = null;

    if (startupSplashTimer !== null) {
        window.clearTimeout(
            startupSplashTimer
        );

        startupSplashTimer = null;
    }

    displayScreen('splash');

    /*
     * Safety timer:
     *
     * Even if startup data/auth takes longer or no screen
     * has been requested yet, the splash state itself is
     * considered complete after five seconds.
     *
     * A subsequently requested screen will then open
     * immediately.
     */
    startupSplashTimer =
        window.setTimeout(
            completeStartupSplash,
            STARTUP_SPLASH_DURATION_MS
        );
}