/**
 * API hooks for sandboxd preview URL authentication.
 *
 * Communicates with the backend proxy to get auth-gated preview URLs
 * that include the user's Backstage session token.
 *
 * Backend route:
 *   POST /api/sandboxd/v1/apps/:appId/preview-url -> get auth-gated preview URL
 */
/**
 * An auth-gated sandboxd preview URL with Backstage session auth.
 */
export interface AuthGatedPreviewUrl {
    /** The sandboxd preview URL with a session token appended */
    url: string;
    /** How long the session token is valid (seconds) */
    ttl: number;
}
/**
 * Get an auth-gated preview URL for a sandboxd app.
 *
 * The backend validates the user's Backstage session and returns a
 * preview URL with a session token appended.
 *
 * @param appId - The sandboxd app ID.
 */
export declare function useSandboxdPreviewUrl(appId: string): import("react-use/lib/useAsyncFn").AsyncState<any>;
/**
 * Get the current user's sandboxd tenant ID.
 *
 * @returns The tenant ID or undefined if single-tenant mode.
 */
export declare function useSandboxdTenantId(): import("react-use/lib/useAsyncFn").AsyncState<undefined>;
/**
 * Get the current user's sandboxd API token.
 *
 * @returns The sandboxd API token or undefined if not available.
 */
export declare function useSandboxdApiKey(): import("react-use/lib/useAsyncFn").AsyncState<string | undefined>;
