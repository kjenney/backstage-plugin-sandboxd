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

import { useAsync } from 'react-use';
import { useApi } from '@backstage/core-plugin-api';
import { configApiRef } from '@backstage/core-plugin-api';

const API_BASE = '/api/sandboxd/v1';

async function sandboxdFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Sandboxd API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Fetch the list of sandboxd API keys.
 * @param revalidateKey — increment to force a refetch.
 */
export function useSandboxdApiKeys(revalidateKey = 0) {
  return useAsync(async () => {
    return sandboxdFetch<SandboxdApiKey[]>('/keys');
  }, [revalidateKey]);
}

/**
 * Create a new sandboxd API key.
 *
 * @returns The created key, including the full key value (only on creation).
 */
export function useSandboxdCreateApiKey() {
  return async (data: {
    name: string;
    description?: string;
    expiresAt?: string;
  }) => {
    return sandboxdFetch<CreateApiKeyResult>('/keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };
}

/**
 * Rotate an existing sandboxd API key.
 *
 * Revokes the old key and creates a replacement with the same name.
 *
 * @param keyId - The API key ID to rotate.
 * @returns The new key and whether the previous key was revoked.
 */
export function useSandboxdRotateApiKey() {
  return async (keyId: string) => {
    return sandboxdFetch<RotateApiKeyResult>(`/keys/${keyId}/rotate`, {
      method: 'POST',
    });
  };
}

/**
 * Revoke an existing sandboxd API key.
 *
 * @param keyId - The API key ID to revoke.
 */
export function useSandboxdRevokeApiKey() {
  return async (keyId: string) => {
    return sandboxdFetch<void>(`/keys/${keyId}`, {
      method: 'DELETE',
    });
  };
}

/**
 * Resolve the current user's sandboxd identity — maps Backstage identity
 * to sandboxd auth (tenant ID and API token).
 *
 * This hook reads the sandboxd configuration from the Backstage config
 * and resolves the identity based on multi-tenant mode settings.
 *
 * @returns The resolved identity or null if unauthenticated.
 */
export function useSandboxdAuth() {
  const config = useApi(configApiRef);

  return useAsync(async () => {
    try {
      const multiTenantEnabled =
        config.getOptionalBoolean('sandboxd.multiTenant.enabled') ?? false;
      const token = config.getOptionalString('sandboxd.token');

      return {
        userEntityRef: 'anonymous',
        ownershipEntityRefs: [],
        token,
        tenantId: multiTenantEnabled ? undefined : undefined,
        apiKey: token,
      } as ResolvedSandboxdIdentity;
    } catch {
      return null;
    }
  }, [config]);
}

/**
 * Get the current user's sandboxd API token.
 *
 * This hook calls the backend to resolve the user's API token,
 * which handles both single-tenant and multi-tenant modes.
 *
 * @returns The sandboxd API token or undefined if not available.
 */
export function useSandboxdApiKey() {
  return useAsync(async () => {
    try {
      const res = await sandboxdFetch<{ apiKey: string | null }>(
        '/identity/api-key',
      );
      return res.apiKey ?? undefined;
    } catch {
      return undefined;
    }
  }, []);
}

/**
 * Get the current user's sandboxd tenant ID.
 *
 * This hook calls the backend to resolve the user's tenant ID,
 * which extracts the tenant from the user's Backstage identity
 * using the configured identity claim.
 *
 * @returns The tenant ID or undefined if single-tenant mode.
 */
export function useSandboxdTenantId() {
  return useAsync(async () => {
    try {
      const res = await sandboxdFetch<{ tenantId: string | null }>(
        '/identity/tenant-id',
      );
      return res.tenantId ?? undefined;
    } catch {
      return undefined;
    }
  }, []);
}

/**
 * Check if multi-tenant mode is enabled.
 *
 * @returns true if multi-tenant mode is enabled.
 */
export function useSandboxdIsMultiTenant() {
  const config = useApi(configApiRef);

  return !!config.getOptionalBoolean('sandboxd.multiTenant.enabled');
}
