import {
    getSupabaseClient
} from './supabase-client.js';

/**
 * Returns the active authentication session.
 */
export async function getSession() {
    const client = await getSupabaseClient();

    const {
        data: { session },
        error
    } = await client.auth.getSession();

    if (error) {
        throw error;
    }

    return session;
}

/**
 * Returns the currently authenticated user.
 */
export async function getSignedInUser() {
    const session = await getSession();
    return session?.user ?? null;
}

/**
 * Starts Google OAuth authentication.
 *
 * Supabase redirects the user back to the Orange app
 * after Google authentication succeeds.
 */
export async function signInWithGoogle() {
    const client = await getSupabaseClient();

    const { data, error } =
        await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
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
    const client = await getSupabaseClient();

    const { error } = await client.auth.signOut();

    if (error) {
        throw error;
    }
}

/**
 * Runs the supplied callback whenever the authentication
 * state changes.
 *
 * The callback receives:
 * - event: Supabase authentication event
 * - session: current session or null
 * - user: authenticated user or null
 *
 * Returns a function that removes the listener.
 */
export async function onAuthStateChange(callback) {
    if (typeof callback !== 'function') {
        throw new TypeError(
            'Authentication callback must be a function.'
        );
    }

    const client = await getSupabaseClient();

    const {
        data: { subscription }
    } = client.auth.onAuthStateChange(
        (event, session) => {
            callback(
                event,
                session,
                session?.user ?? null
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
export function getUserDisplayName(user) {
    if (!user) {
        return 'Friend';
    }

    return (
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Friend'
    ).trim();
}

/**
 * Returns the user's first name for the home greeting.
 */
export function getUserFirstName(user) {
    const displayName = getUserDisplayName(user);
    return displayName.split(/\s+/)[0];
}

/**
 * Returns the Google profile image when one is available.
 */
export function getUserAvatarUrl(user) {
    if (!user) {
        return null;
    }

    return (
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null
    );
}