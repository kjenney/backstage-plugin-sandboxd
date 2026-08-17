/**
 * API hooks for sandboxd API key management.
 *
 * Communicates with the backend proxy to manage sandboxd API keys —
 * create, rotate, and revoke keys from the Backstage UI.
 *
 * Backend routes:
 *   GET    /api/sandboxd/v1/keys              -> list API keys
 *   POST   /api/sandboxd/v1/keys              -> create API key
 *   POST   /api/sandboxd/v1/keys/:keyId/rotate -> rotate API key
 *   DELETE /api/sandboxd/v1/keys/:keyId       -> revoke API key
 */
/**
 * A sandboxd API key resource.
 */
export interface SandboxdApiKey {
    id: string;
    name: string;
    description?: string;
    /** When the key was created (ISO 8601) */
    createdAt: string;
    /** When the key expires (ISO 8601), null if never */
    expiresAt: string | null;
    /** Current key state */
    state: 'active' | 'expired' | 'revoked';
    /** The key prefix (last 4 chars of the actual key for display) */
    keyPrefix: string;
}
/**
 * Result of a key rotation operation.
 */
export interface RotateApiKeyResult {
    newKey: SandboxdApiKey;
    previousKeyRevoked: boolean;
}
/**
 * Result of a key creation operation.
 */
export interface CreateApiKeyResult {
    id: string;
    name: string;
    description?: string;
    /** The actual key value (only returned on creation) */
    key: string;
    keyPrefix: string;
}
/**
 * Resolved identity for sandboxd auth — maps Backstage identity to sandboxd auth.
 */
export interface ResolvedSandboxdIdentity {
    /** The Backstage user entity reference */
    userEntityRef: string;
    /** The Backstage user's ownership entity refs */
    ownershipEntityRefs: string[];
    /** The Backstage identity token (for auth passthrough) */
    token?: string;
    /** The derived sandboxd tenant identifier */
    tenantId: string | undefined;
    /** The derived sandboxd API token */
    apiKey: string | undefined;
}
/**
 * Fetch the list of sandboxd API keys.
 * @param revalidateKey — increment to force a refetch.
 */
export declare function useSandboxdApiKeys(revalidateKey?: number): import("react-use/lib/useAsyncFn").AsyncState<SandboxdApiKey[]>;
/**
 * Create a new sandboxd API key.
 *
 * @returns The created key, including the full key value (only on creation).
 */
export declare function useSandboxdCreateApiKey(): (data: {
    name: string;
    description?: string;
    expiresAt?: string;
}) => Promise<CreateApiKeyResult>;
/**
 * Rotate an existing sandboxd API key.
 *
 * Revokes the old key and creates a replacement with the same name.
 *
 * @param keyId - The API key ID to rotate.
 * @returns The new key and whether the previous key was revoked.
 */
export declare function useSandboxdRotateApiKey(): (keyId: string) => Promise<RotateApiKeyResult>;
/**
 * Revoke an existing sandboxd API key.
 *
 * @param keyId - The API key ID to revoke.
 */
export declare function useSandboxdRevokeApiKey(): (keyId: string) => Promise<void>;
/**
 * Resolve the current user's sandboxd identity — maps Backstage identity
 * to sandboxd auth (tenant ID and API token).
 *
 * This hook reads the sandboxd configuration from the Backstage config
 * and resolves the identity based on multi-tenant mode settings.
 *
 * @returns The resolved identity or null if unauthenticated.
 */
export declare function useSandboxdAuth(): import("react-use/lib/useAsyncFn").AsyncState<ResolvedSandboxdIdentity | null>;
/**
 * Get the current user's sandboxd API token.
 *
 * This hook calls the backend to resolve the user's API token,
 * which handles both single-tenant and multi-tenant modes.
 *
 * @returns The sandboxd API token or undefined if not available.
 */
export declare function useSandboxdApiKey(): import("react-use/lib/useAsyncFn").AsyncState<string | undefined>;
/**
 * Get the current user's sandboxd tenant ID.
 *
 * This hook calls the backend to resolve the user's tenant ID,
 * which extracts the tenant from the user's Backstage identity
 * using the configured identity claim.
 *
 * @returns The tenant ID or undefined if single-tenant mode.
 */
export declare function useSandboxdTenantId(): import("react-use/lib/useAsyncFn").AsyncState<string | undefined>;
/**
 * Check if multi-tenant mode is enabled.
 *
 * @returns true if multi-tenant mode is enabled.
 */
export declare function useSandboxdIsMultiTenant(): boolean;
