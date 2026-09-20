let supabaseClient = null;
let publicConfig = null;

/**
 * Loads Orange's public frontend configuration from Spring Boot.
 */
async function loadPublicConfig() {
    if (publicConfig) {
        return publicConfig;
    }

    const response = await fetch('/api/public/config', {
        method: 'GET',
        headers: {
            Accept: 'application/json'
        },
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error(
            `Unable to load Orange configuration (${response.status}).`
        );
    }

    const config = await response.json();

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw new Error(
            'SUPABASE_URL or SUPABASE_ANON_KEY is missing.'
        );
    }

    publicConfig = config;
    return publicConfig;
}

/**
 * Returns Orange's shared Supabase browser client.
 */
export async function getSupabaseClient() {
    if (supabaseClient) {
        return supabaseClient;
    }

    if (!window.supabase?.createClient) {
        throw new Error(
            'The Supabase JavaScript library is not loaded.'
        );
    }

    const config = await loadPublicConfig();

    supabaseClient = window.supabase.createClient(
        config.supabaseUrl,
        config.supabaseAnonKey,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );

    return supabaseClient;
}

/**
 * Returns the authenticated user or null when signed out.
 */
export async function getCurrentUser() {
    const client = await getSupabaseClient();

    const {
        data: { user },
        error
    } = await client.auth.getUser();

    if (error) {
        throw error;
    }

    return user;
}

/**
 * Returns the active session or null when signed out.
 */
export async function getCurrentSession() {
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