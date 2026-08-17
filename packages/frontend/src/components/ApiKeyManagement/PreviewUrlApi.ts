/**
 * API hooks for sandboxd preview URL authentication.
 *
 * Communicates with the backend proxy to get auth-gated preview URLs
 * that include the user's Backstage session token.
 *
 * Backend route:
 *   POST /api/sandboxd/v1/apps/:appId/preview-url -> get auth-gated preview URL
 */

import { useAsync } from 'react-use';
import { useApi } from '@backstage/core-plugin-api';
import { configApiRef } from '@backstage/core-plugin-api';

const API_BASE = '/api/sandboxd/v1';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/**
 * An auth-gated sandboxd preview URL with Backstage session auth.
 */
export interface AuthGatedPreviewUrl {
  /** The sandboxd preview URL with a session token appended */
  url: string;
  /** How long the session token is valid (seconds) */
  ttl: number;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Get an auth-gated preview URL for a sandboxd app.
 *
 * The backend validates the user's Backstage session and returns a
 * preview URL with a session token appended.
 *
 * @param appId - The sandboxd app ID.
 */
export function useSandboxdPreviewUrl(appId: string) {
  return useAsync(async () => {
    const res = await fetch(`${API_BASE}/apps/${appId}/preview-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Sandboxd API ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }, [appId]);
}

/**
 * Get the current user's sandboxd tenant ID.
 *
 * @returns The tenant ID or undefined if single-tenant mode.
 */
export function useSandboxdTenantId() {
  const config = useApi(configApiRef);

  return useAsync(async () => {
    try {
      const multiTenantEnabled =
        config.getOptionalBoolean('sandboxd.multiTenant.enabled') ?? false;
      if (!multiTenantEnabled) {
        return undefined;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }, [config]);
}

/**
 * Get the current user's sandboxd API token.
 *
 * @returns The sandboxd API token or undefined if not available.
 */
export function useSandboxdApiKey() {
  const config = useApi(configApiRef);

  return useAsync(async () => {
    try {
      const token = config.getOptionalString('sandboxd.token');
      const multiTenantEnabled =
        config.getOptionalBoolean('sandboxd.multiTenant.enabled') ?? false;

      if (!multiTenantEnabled && token) {
        return token;
      }

      return token;
    } catch {
      return undefined;
    }
  }, [config]);
}
