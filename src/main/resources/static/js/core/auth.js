import {
    getSupabaseClient
} from './supabase-client.js';


/**
 * Normalizes an email address.
 */
function normalizeEmail(value) {
    const email =
        String(value ?? '')
            .trim()
            .toLowerCase();

    if (!email) {
        throw new Error(
            'Email is required.'
        );
    }

    return email;
}


/**
 * Normalizes an email-or-username login identifier.
 */
function normalizeIdentifier(value) {
    const identifier =
        String(value ?? '')
            .trim();

    if (!identifier) {
        throw new Error(
            'Email or username is required.'
        );
    }

    if (identifier.length > 254) {
        throw new Error(
            'Email or username is too long.'
        );
    }

    return identifier;
}


/**
 * Validates an Orange username.
 */
function normalizeUsername(value) {
    const username =
        String(value ?? '')
            .trim();

    if (!username) {
        throw new Error(
            'Username is required.'
        );
    }

    if (
        !/^[A-Za-z0-9_]{3,30}$/
            .test(username)
    ) {
        throw new Error(
            'Username must contain 3 to 30 letters, numbers, or underscores.'
        );
    }

    return username;
}


/**
 * Validates a password supplied by the user.
 */
function normalizePassword(value) {
    const password =
        String(value ?? '');

    if (!password) {
        throw new Error(
            'Password is required.'
        );
    }

    if (password.length < 8) {
        throw new Error(
            'Password must contain at least 8 characters.'
        );
    }

    return password;
}


/**
 * Returns the active authentication session.
 */
export async function getSession() {
    const client =
        await getSupabaseClient();

    const {
        data: { session },
        error
    } =
        await client.auth.getSession();

    if (error) {
        throw error;
    }

    return session;
}


/**
 * Returns the currently authenticated user.
 */
export async function getSignedInUser() {
    const session =
        await getSession();

    return session?.user ?? null;
}


/**
 * Starts Google OAuth authentication.
 */
export async function signInWithGoogle() {
    const client =
        await getSupabaseClient();

    const {
        data,
        error
    } =
        await client.auth.signInWithOAuth({
            provider: 'google',

            options: {
                redirectTo:
                    window.location.origin
            }
        });

    if (error) {
        throw error;
    }

    return data;
}


/**
 * Signs into Orange using either:
 *
 * - email + password
 * - username + password
 *
 * Username resolution happens only on the
 * Orange Spring Boot backend.
 */
export async function signInWithPassword(
    identifier,
    password
) {
    const normalizedIdentifier =
        normalizeIdentifier(
            identifier
        );

    const normalizedPassword =
        normalizePassword(
            password
        );

    const response =
        await fetch(
            '/api/auth/password-login',
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json',

                    'Accept':
                        'application/json'
                },

                body:
                    JSON.stringify({
                        identifier:
                            normalizedIdentifier,

                        password:
                            normalizedPassword
                    })
            }
        );

    let body = null;

    try {
        body =
            await response.json();
    } catch {
        body = null;
    }

    if (!response.ok) {
        throw new Error(
            body?.message ||
            'Invalid username/email or password.'
        );
    }

    if (
        !body?.accessToken ||
        !body?.refreshToken
    ) {
        throw new Error(
            'Orange could not create a login session.'
        );
    }

    const client =
        await getSupabaseClient();

    const {
        data,
        error
    } =
        await client.auth.setSession({
            access_token:
                body.accessToken,

            refresh_token:
                body.refreshToken
        });

    if (error) {
        throw error;
    }

    return data;
}


/**
 * Checks whether an Orange username is available.
 *
 * This RPC is intentionally safe for anonymous use.
 */
export async function isUsernameAvailable(
    username
) {
    const normalizedUsername =
        normalizeUsername(
            username
        );

    const client =
        await getSupabaseClient();

    const {
        data,
        error
    } =
        await client.rpc(
            'is_username_available',
            {
                p_username:
                    normalizedUsername
            }
        );

    if (error) {
        throw error;
    }

    return data === true;
}


/**
 * Creates an Orange account using email/password.
 */
export async function signUpWithPassword({
    email,
    password,
    username,
    displayName
}) {
    const client =
        await getSupabaseClient();

    const normalizedEmail =
        normalizeEmail(
            email
        );

    const normalizedPassword =
        normalizePassword(
            password
        );

    const normalizedUsername =
        normalizeUsername(
            username
        );

    const normalizedDisplayName =
        String(displayName ?? '')
            .trim();

    if (!normalizedDisplayName) {
        throw new Error(
            'Name is required.'
        );
    }

    if (
        normalizedDisplayName.length >
        80
    ) {
        throw new Error(
            'Name cannot exceed 80 characters.'
        );
    }

    const usernameAvailable =
        await isUsernameAvailable(
            normalizedUsername
        );

    if (!usernameAvailable) {
        throw new Error(
            'Username is not available. Please choose another.'
        );
    }

    const {
        data,
        error
    } =
        await client.auth.signUp({
            email:
                normalizedEmail,

            password:
                normalizedPassword,

            options: {
                emailRedirectTo:
                    window.location.origin,

                data: {
                    username:
                        normalizedUsername,

                    full_name:
                        normalizedDisplayName,

                    name:
                        normalizedDisplayName
                }
            }
        });

    if (error) {
        throw error;
    }

    return data;
}


/**
 * Sends a password-reset email.
 */
export async function sendPasswordResetEmail(
    email
) {
    const client =
        await getSupabaseClient();

    const normalizedEmail =
        normalizeEmail(
            email
        );

    const {
        data,
        error
    } =
        await client.auth
            .resetPasswordForEmail(
                normalizedEmail,
                {
                    redirectTo:
                        window.location.origin
                }
            );

    if (error) {
        throw error;
    }

    return data;
}


/**
 * Sets or changes the password for the currently
 * authenticated Orange account.
 */
export async function updatePassword(
    newPassword
) {
    const client =
        await getSupabaseClient();

    const normalizedPassword =
        normalizePassword(
            newPassword
        );

    const {
        data,
        error
    } =
        await client.auth.updateUser({
            password:
                normalizedPassword
        });

    if (error) {
        throw error;
    }

    return data;
}


/**
 * Signs the current user out of Orange.
 */
export async function signOut() {
    const client =
        await getSupabaseClient();

    const {
        error
    } =
        await client.auth.signOut();

    if (error) {
        throw error;
    }
}


/**
 * Runs the supplied callback whenever the authentication
 * state changes.
 */
export async function onAuthStateChange(
    callback
) {
    if (
        typeof callback !==
        'function'
    ) {
        throw new TypeError(
            'Authentication callback must be a function.'
        );
    }

    const client =
        await getSupabaseClient();

    const {
        data: { subscription }
    } =
        client.auth
            .onAuthStateChange(
                (
                    event,
                    session
                ) => {
                    callback(
                        event,
                        session,
                        session?.user ??
                            null
                    );
                }
            );

    return () => {
        subscription.unsubscribe();
    };
}


/**
 * Creates a display name from Supabase user metadata.
 */
export function getUserDisplayName(
    user
) {
    if (!user) {
        return 'Friend';
    }

    return (
        user.user_metadata
            ?.full_name ||
        user.user_metadata
            ?.name ||
        user.user_metadata
            ?.username ||
        user.email
            ?.split('@')[0] ||
        'Friend'
    ).trim();
}


/**
 * Returns the user's first name for the home greeting.
 */
export function getUserFirstName(
    user
) {
    const displayName =
        getUserDisplayName(
            user
        );

    return displayName
        .split(/\s+/)[0];
}


/**
 * Returns the profile image when one is available.
 */
export function getUserAvatarUrl(
    user
) {
    if (!user) {
        return null;
    }

    return (
        user.user_metadata
            ?.avatar_url ||
        user.user_metadata
            ?.picture ||
        null
    );
}