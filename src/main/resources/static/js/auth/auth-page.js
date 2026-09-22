import {
    signInWithPassword,
    signUpWithPassword,
    sendPasswordResetEmail,
    updatePassword
} from '../core/auth.js';


let initialized = false;

const elements = {};

const callbacks = {
    onSignedIn: null,
    onPasswordUpdated: null
};


/**
 * Finds password-authentication UI elements.
 */
function findElements() {
    elements.signInPanel =
        document.querySelector(
            '#authSignInPanel'
        );

    elements.signUpPanel =
        document.querySelector(
            '#authSignUpPanel'
        );

    elements.forgotPanel =
        document.querySelector(
            '#authForgotPasswordPanel'
        );

    elements.recoveryPanel =
        document.querySelector(
            '#authRecoveryPanel'
        );

    elements.message =
        document.querySelector(
            '#authMessage'
        );

    elements.passwordSignInForm =
        document.querySelector(
            '#passwordSignInForm'
        );

    elements.authIdentifier =
        document.querySelector(
            '#authEmail'
        );

    elements.authPassword =
        document.querySelector(
            '#authPassword'
        );

    elements.showSignUp =
        document.querySelector(
            '#showSignUpButton'
        );

    elements.showSignIn =
        document.querySelector(
            '#showSignInButton'
        );

    elements.forgotPassword =
        document.querySelector(
            '#forgotPasswordButton'
        );

    elements.forgotPasswordBack =
        document.querySelector(
            '#forgotPasswordBack'
        );

    elements.signUpForm =
        document.querySelector(
            '#signUpForm'
        );

    elements.signUpDisplayName =
        document.querySelector(
            '#signUpDisplayName'
        );

    elements.signUpUsername =
        document.querySelector(
            '#signUpUsername'
        );

    elements.signUpEmail =
        document.querySelector(
            '#signUpEmail'
        );

    elements.signUpPassword =
        document.querySelector(
            '#signUpPassword'
        );

    elements.signUpConfirmPassword =
        document.querySelector(
            '#signUpConfirmPassword'
        );

    elements.forgotPasswordForm =
        document.querySelector(
            '#forgotPasswordForm'
        );

    elements.forgotPasswordEmail =
        document.querySelector(
            '#forgotPasswordEmail'
        );

    elements.recoveryForm =
        document.querySelector(
            '#recoveryPasswordForm'
        );

    elements.recoveryPassword =
        document.querySelector(
            '#recoveryPassword'
        );

    elements.recoveryPasswordConfirm =
        document.querySelector(
            '#recoveryPasswordConfirm'
        );

    elements.changePasswordDialog =
        document.querySelector(
            '#changePasswordDialog'
        );

    elements.changePasswordForm =
        document.querySelector(
            '#changePasswordForm'
        );

    elements.changePasswordNew =
        document.querySelector(
            '#changePasswordNew'
        );

    elements.changePasswordConfirm =
        document.querySelector(
            '#changePasswordConfirm'
        );

    elements.changePasswordMessage =
        document.querySelector(
            '#changePasswordMessage'
        );

    elements.changePasswordCancel =
        document.querySelector(
            '#changePasswordCancel'
        );
}


/**
 * Displays an authentication message.
 */
function setMessage(
    message = ''
) {
    elements.message.textContent =
        message;
}


/**
 * Displays a change-password message.
 */
function setChangePasswordMessage(
    message = ''
) {
    elements.changePasswordMessage
        .textContent =
        message;
}


/**
 * Shows exactly one authentication panel.
 */
function showPanel(
    panel
) {
    elements.signInPanel.hidden =
        panel !== 'signin';

    elements.signUpPanel.hidden =
        panel !== 'signup';

    elements.forgotPanel.hidden =
        panel !== 'forgot';

    elements.recoveryPanel.hidden =
        panel !== 'recovery';

    setMessage('');
}


/**
 * Returns to the normal sign-in screen.
 */
export function showSignInPanel() {
    showPanel(
        'signin'
    );

    elements.passwordSignInForm
        .reset();
}


/**
 * Shows the password-recovery screen after
 * the user opens a Supabase recovery link.
 */
export function showPasswordRecovery() {
    showPanel(
        'recovery'
    );

    elements.recoveryForm
        .reset();

    window.setTimeout(
        () => {
            elements.recoveryPassword
                ?.focus();
        },
        0
    );
}


/**
 * Opens the signed-in change-password dialog.
 */
export function openChangePasswordDialog() {
    if (
        !elements.changePasswordDialog
    ) {
        return;
    }

    elements.changePasswordForm
        .reset();

    setChangePasswordMessage('');

    elements.changePasswordDialog
        .showModal();

    window.setTimeout(
        () => {
            elements.changePasswordNew
                ?.focus();
        },
        0
    );
}


/**
 * Handles email-or-username/password sign in.
 */
async function handlePasswordSignIn(
    event
) {
    event.preventDefault();

    setMessage('');

    const submit =
        elements.passwordSignInForm
            .querySelector(
                '[type="submit"]'
            );

    submit.disabled =
        true;

    try {
        const data =
            await signInWithPassword(
                elements.authIdentifier.value,
                elements.authPassword.value
            );

        if (
            data?.user &&
            typeof callbacks.onSignedIn ===
            'function'
        ) {
            await callbacks.onSignedIn(
                data.user
            );
        }

    } catch (error) {
        setMessage(
            error?.message ||
            'Unable to sign in.'
        );

    } finally {
        submit.disabled =
            false;
    }
}


/**
 * Handles password-account creation.
 */
async function handleSignUp(
    event
) {
    event.preventDefault();

    setMessage('');

    const password =
        elements.signUpPassword
            .value;

    const confirmPassword =
        elements.signUpConfirmPassword
            .value;

    if (
        password !== confirmPassword
    ) {
        setMessage(
            'Passwords do not match.'
        );

        return;
    }

    const submit =
        elements.signUpForm
            .querySelector(
                '[type="submit"]'
            );

    submit.disabled =
        true;

    try {
        const data =
            await signUpWithPassword({
                email:
                    elements.signUpEmail
                        .value,

                password,

                username:
                    elements.signUpUsername
                        .value,

                displayName:
                    elements.signUpDisplayName
                        .value
            });

        /*
         * Email confirmation can be enabled or
         * disabled in Supabase.
         *
         * If a session exists immediately,
         * continue into Orange.
         */
        if (
            data?.session?.user
        ) {
            if (
                typeof callbacks.onSignedIn ===
                'function'
            ) {
                await callbacks.onSignedIn(
                    data.session.user
                );
            }

            return;
        }

        /*
         * Otherwise Supabase is waiting for
         * email confirmation.
         */
        setMessage(
            'Account created. Check your email to confirm your Orange account.'
        );

        elements.signUpForm
            .reset();

    } catch (error) {
        setMessage(
            normalizeSignUpError(
                error
            )
        );

    } finally {
        submit.disabled =
            false;
    }
}


/**
 * Produces user-friendly signup errors.
 */
function normalizeSignUpError(
    error
) {
    const message =
        String(
            error?.message ||
            ''
        );

    const normalized =
        message.toLowerCase();

    if (
        normalized.includes(
            'username is not available'
        ) ||
        normalized.includes(
            'duplicate'
        )
    ) {
        return (
            'Username is not available. ' +
            'Please choose another.'
        );
    }

    if (
        normalized.includes(
            'already registered'
        ) ||
        normalized.includes(
            'already been registered'
        )
    ) {
        return (
            'An account already exists ' +
            'for this email.'
        );
    }

    return (
        message ||
        'Unable to create account.'
    );
}


/**
 * Handles forgot-password requests.
 */
async function handleForgotPassword(
    event
) {
    event.preventDefault();

    setMessage('');

    const submit =
        elements.forgotPasswordForm
            .querySelector(
                '[type="submit"]'
            );

    submit.disabled =
        true;

    try {
        await sendPasswordResetEmail(
            elements.forgotPasswordEmail
                .value
        );

        /*
         * Keep this message intentionally generic.
         * Do not reveal whether an account exists.
         */
        setMessage(
            'If an Orange account exists for that email, a password reset link has been sent.'
        );

        elements.forgotPasswordForm
            .reset();

    } catch (error) {
        setMessage(
            error?.message ||
            'Unable to send reset email.'
        );

    } finally {
        submit.disabled =
            false;
    }
}


/**
 * Handles the password-recovery screen.
 */
async function handleRecoveryPassword(
    event
) {
    event.preventDefault();

    setMessage('');

    const password =
        elements.recoveryPassword
            .value;

    const confirmPassword =
        elements.recoveryPasswordConfirm
            .value;

    if (
        password !== confirmPassword
    ) {
        setMessage(
            'Passwords do not match.'
        );

        return;
    }

    const submit =
        elements.recoveryForm
            .querySelector(
                '[type="submit"]'
            );

    submit.disabled =
        true;

    try {
        const data =
            await updatePassword(
                password
            );

        setMessage(
            'Your password has been updated.'
        );

        elements.recoveryForm
            .reset();

        if (
            data?.user &&
            typeof callbacks
                .onPasswordUpdated ===
            'function'
        ) {
            await callbacks
                .onPasswordUpdated(
                    data.user
                );
        }

    } catch (error) {
        setMessage(
            error?.message ||
            'Unable to update password.'
        );

    } finally {
        submit.disabled =
            false;
    }
}


/**
 * Changes a password while already signed in.
 */
async function handleChangePassword(
    event
) {
    event.preventDefault();

    setChangePasswordMessage('');

    const password =
        elements.changePasswordNew
            .value;

    const confirmPassword =
        elements.changePasswordConfirm
            .value;

    if (
        password !== confirmPassword
    ) {
        setChangePasswordMessage(
            'Passwords do not match.'
        );

        return;
    }

    const submit =
        elements.changePasswordForm
            .querySelector(
                '[type="submit"]'
            );

    submit.disabled =
        true;

    try {
        await updatePassword(
            password
        );

        elements.changePasswordForm
            .reset();

        setChangePasswordMessage(
            'Password updated.'
        );

        window.setTimeout(
            () => {
                if (
                    elements
                        .changePasswordDialog
                        .open
                ) {
                    elements
                        .changePasswordDialog
                        .close();
                }
            },
            650
        );

    } catch (error) {
        setChangePasswordMessage(
            error?.message ||
            'Unable to change password.'
        );

    } finally {
        submit.disabled =
            false;
    }
}


/**
 * Closes the change-password dialog.
 */
function handleChangePasswordCancel() {
    elements.changePasswordForm
        .reset();

    setChangePasswordMessage('');

    elements.changePasswordDialog
        .close();
}


/**
 * Connects password-auth events.
 *
 * Google login deliberately remains in app.js
 * so the existing OAuth flow is preserved.
 */
function bindEvents() {
    elements.passwordSignInForm
        .addEventListener(
            'submit',
            handlePasswordSignIn
        );

    elements.showSignUp
        .addEventListener(
            'click',
            () => {
                showPanel(
                    'signup'
                );

                elements.signUpDisplayName
                    .focus();
            }
        );

    elements.showSignIn
        .addEventListener(
            'click',
            showSignInPanel
        );

    elements.forgotPassword
        .addEventListener(
            'click',
            () => {
                showPanel(
                    'forgot'
                );

                elements.forgotPasswordEmail
                    .focus();
            }
        );

    elements.forgotPasswordBack
        .addEventListener(
            'click',
            showSignInPanel
        );

    elements.signUpForm
        .addEventListener(
            'submit',
            handleSignUp
        );

    elements.forgotPasswordForm
        .addEventListener(
            'submit',
            handleForgotPassword
        );

    elements.recoveryForm
        .addEventListener(
            'submit',
            handleRecoveryPassword
        );

    elements.changePasswordForm
        .addEventListener(
            'submit',
            handleChangePassword
        );

    elements.changePasswordCancel
        .addEventListener(
            'click',
            handleChangePasswordCancel
        );
}


/**
 * Initializes password authentication UI.
 */
export function initializeAuthPage(
    options = {}
) {
    callbacks.onSignedIn =
        options.onSignedIn ??
        callbacks.onSignedIn;

    callbacks.onPasswordUpdated =
        options.onPasswordUpdated ??
        callbacks.onPasswordUpdated;

    if (initialized) {
        return;
    }

    findElements();

    bindEvents();

    showSignInPanel();

    initialized =
        true;
}


/**
 * Resets password-auth UI after signing out.
 */
export function resetAuthPage() {
    if (!initialized) {
        return;
    }

    elements.passwordSignInForm
        .reset();

    elements.signUpForm
        .reset();

    elements.forgotPasswordForm
        .reset();

    elements.recoveryForm
        .reset();

    setMessage('');

    showPanel(
        'signin'
    );
}