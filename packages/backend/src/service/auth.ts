/**
 * Authentication integration between Backstage and sandboxd.
 *
 * Bridges Backstage's auth identity system with sandboxd's API token
 * authentication and multi-tenant routing. This module provides:
 *
 * 1. Per-user API token resolution — maps Backstage user identity to
 *    sandboxd tenant-scoped API tokens
 * 2. Multi-tenant proxy routing — when sandboxd runs in multi-tenant mode,
 *    routes requests through the user's tenant-specific token
 * 3. Token management — CRUD operations for sandboxd API keys from
 *    Backstage (create, rotate, revoke)
 * 4. Backstage API registration — exposes SandboxdAuthApi as a proper
 *    Backstage API so the frontend can consume it
 */

import { Config } from '@backstage/config';
import { BackstageIdentityResponse } from '@backstage/core-plugin-api';
import {
  identityApiRef,
  ApiRef,
  createApiRef,
} from '@backstage/core-plugin-api';
import { IdentityApi } from '@backstage/plugin-auth-node';
import { createBackendModule, coreServices } from '@backstage/backend-plugin-api';
import express from 'express';
import fetch from 'node-fetch';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/**
 * A sandboxd API key resource.
 *
 * sandboxd supports API keys for per-user or per-service authentication.
 * Each key has a lifecycle state: active, expired, revoked.
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
 * Result of a token rotation operation.
 */
export interface RotateApiKeyResult {
  newKey: string;
  previousKeyRevoked: boolean;
}

/**
 * Configuration for sandboxd multi-tenant mode.
 */
interface MultiTenantConfig {
  enabled: boolean;
  /**
   * Backstage user identity claim that maps to a sandboxd tenant.
   * Default: 'email' — the user's email is used as the tenant identifier.
   */
  identityClaim: string;
}

/**
 * Identity claim types for tenant derivation.
 */
export type IdentityClaim = 'email' | 'userEntityRef' | string;

/**
 * User identity resolved from Backstage for sandboxd routing.
 */
export interface ResolvedIdentity {
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
 * Read sandboxd auth configuration from Backstage config.
 */
function readAuthConfig(config: Config): {
  token?: string;
  multiTenant: MultiTenantConfig;
} {
  const token = config.getOptionalString('sandboxd.token');
  const multiTenantEnabled =
    config.getOptionalBoolean('sandboxd.multiTenant.enabled') ?? false;
  const identityClaim =
    config.getOptionalString('sandboxd.multiTenant.identityClaim') ?? 'email';

  return {
    token,
    multiTenant: {
      enabled: multiTenantEnabled,
      identityClaim,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  SandboxdAuthApi — Backstage API                                    */
/* ------------------------------------------------------------------ */

/**
 * API reference for the sandboxd authentication API.
 *
 * This API provides methods for the frontend to resolve the current
 * user's sandboxd API token and tenant ID from Backstage identity.
 *
 * @public
 */
export const sandboxdAuthApiRef: ApiRef<SandboxdAuthApi> =
  createApiRef<SandboxdAuthApi>({
    id: 'plugin.sandboxd.auth',
  });

/**
 * SandboxdAuthApi — wraps Backstage's IdentityApi to resolve the current
 * user's identity and obtain a sandboxd API token.
 *
 * This class is the primary interface for auth integration between
 * Backstage and sandboxd. It is used by the proxy router to inject
 * per-user authentication headers into sandboxd requests.
 *
 * @public
 */
export class SandboxdAuthApi {
  private readonly identityApi: IdentityApi;
  private readonly config: ReturnType<typeof readAuthConfig>;

  constructor(options: {
    identityApi: IdentityApi;
    config: Config;
  }) {
    this.identityApi = options.identityApi;
    this.config = readAuthConfig(options.config);
  }

  /**
   * Get the current user's identity from Backstage.
   *
   * @param request — The incoming HTTP request to extract identity from.
   * @returns The Backstage user identity response (identity + token), or null if unauthenticated.
   */
  async getUserInfo(request?: express.Request): Promise<BackstageIdentityResponse | null> {
    if (!request) {
      return null;
    }
    try {
      const identityResponse = await this.identityApi.getIdentity({
        request,
      });
      return identityResponse ?? null;
    } catch (error) {
      // If identity API throws, the user may not be authenticated
      console.warn(
        `Sandboxd auth: failed to get identity: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Resolve the full identity for the current user — token, tenant, and claims.
   *
   * This is the core method that maps Backstage identity to sandboxd auth.
   * In single-tenant mode, returns the shared token. In multi-tenant mode,
   * resolves per-user tenant-scoped tokens.
   *
   * @returns The resolved identity, or null if unauthenticated.
   */
  async resolveIdentity(): Promise<ResolvedIdentity | null> {
    try {
      const userInfo = await this.identityApi.getIdentity({
        request: null as any,
      });

      if (!userInfo) {
        // Fall back to shared token for unauthenticated contexts
        return {
          userEntityRef: 'anonymous',
          ownershipEntityRefs: [],
          token: this.config.token,
          tenantId: undefined,
          apiKey: this.config.token,
        };
      }

      // Derive tenant ID from the configured identity claim
      const tenantId = this.resolveTenantId(userInfo);

      // Derive API token
      const apiKey = this.config.multiTenant.enabled
        ? this.resolveTenantToken(userInfo)
        : this.config.token;

      return {
        userEntityRef: userInfo.identity.userEntityRef,
        ownershipEntityRefs: userInfo.identity.ownershipEntityRefs,
        token: userInfo.token,
        tenantId,
        apiKey,
      };
    } catch (error) {
      console.error(
        `Sandboxd auth: identity resolution failed: ${(error as Error).message}`,
      );
      // Return anonymous with shared token as fallback
      return {
        userEntityRef: 'anonymous',
        ownershipEntityRefs: [],
        token: this.config.token,
        tenantId: undefined,
        apiKey: this.config.token,
      };
    }
  }

  /**
   * Resolve the current user's sandboxd API token.
   *
   * In single-tenant mode, returns the shared sandboxd.token from config.
   * In multi-tenant mode, returns the user's tenant-scoped token.
   *
   * @returns The sandboxd API token, or undefined if not available.
   */
  async getApiKey(): Promise<string | undefined> {
    if (this.config.token && !this.config.multiTenant.enabled) {
      // Single-tenant: use the shared token
      return this.config.token;
    }

    if (this.config.multiTenant.enabled) {
      // Multi-tenant: resolve per-user token
      return this.resolveTenantToken();
    }

    // No token configured — requests will be unauthenticated
    return undefined;
  }

  /**
   * Resolve the tenant ID for the current user.
   *
   * In multi-tenant mode, this extracts the user's tenant from their
   * Backstage identity using the configured identity claim.
   *
   * @returns The tenant identifier, or undefined if single-tenant mode.
   */
  async getTenantId(): Promise<string | undefined> {
    if (!this.config.multiTenant.enabled) {
      return undefined;
    }

    try {
      const userInfo = await this.identityApi.getIdentity({
        request: null as any,
      });
      return userInfo ? this.resolveTenantId(userInfo) : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Resolve the tenant ID from a Backstage identity response.
   */
  private resolveTenantId(userInfo: BackstageIdentityResponse): string | undefined {
    const claim = this.config.multiTenant.identityClaim;

    if (claim === 'email') {
      // Extract domain from email — user@company.com → company
      const ownershipEntityRefs = userInfo.identity.ownershipEntityRefs;
      if (ownershipEntityRefs.length > 0) {
        const emailMatch = ownershipEntityRefs[0].match(/@(.+)$/);
        return emailMatch ? emailMatch[1] : ownershipEntityRefs[0];
      }
    }

    // For other claims, use the userEntityRef directly
    return userInfo.identity.userEntityRef;
  }

  /**
   * Resolve a tenant-scoped API token for the current user.
   *
   * In multi-tenant mode, the user's identity (from the configured claim,
   * default: email) maps to a sandboxd tenant. The tenant's API token
   * is resolved from the Backstage identity token (when sandboxd supports
   * auth token passthrough) or falls back to the shared token.
   *
   * @returns The tenant-scoped token, or the shared token as fallback.
   */
  private resolveTenantToken(userInfo?: BackstageIdentityResponse): string | undefined {
    // Strategy 1: Use the Backstage identity token as the sandboxd bearer token
    // This works when sandboxd supports Backstage auth token passthrough
    if (userInfo) {
      const token = userInfo.token ?? this.config.token;
      return token ?? undefined;
    }

    // Strategy 2: Fallback to the shared sandboxd token
    return this.config.token;
  }

  /**
   * Check if multi-tenant mode is enabled.
   */
  isMultiTenant(): boolean {
    return this.config.multiTenant.enabled;
  }

  /**
   * Get the identity claim configuration.
   */
  getIdentityClaim(): IdentityClaim {
    return this.config.multiTenant.identityClaim;
  }
}

/* ------------------------------------------------------------------ */
/*  Backstage Module Registration                                      */
/* ------------------------------------------------------------------ */

/**
 * Backend module that provides the SandboxdAuthApi for the plugin.
 *
 * This module creates the auth API instance. In the current Backstage version,
 * the auth API is created in createRouter and passed to handlers directly.
 * The frontend consumes the auth API through the backend proxy routes.
 *
 * For newer Backstage versions using createBackendPlugin, the auth API
 * would be registered via the plugin's registerInit with the auth API factory.
 */
export const sandboxdAuthBackendModule = createBackendModule({
  pluginId: 'sandboxd',
  moduleId: 'auth',
  register(reg: any) {
    reg.registerInit({
      deps: {
        identityApi: identityApiRef,
        config: coreServices.rootConfig,
      },
      async init({ identityApi, config }: { identityApi: IdentityApi; config: Config }) {
        const authApi = new SandboxdAuthApi({
          identityApi,
          config,
        });
        // Store the auth API in a global for the router to use.
        // In newer Backstage versions, this would be registered via
        // the plugin's registerInit with the auth API factory.
        // For the old createRouter pattern, the router creates the
        // auth API directly via createSandboxdAuthApi().
        (global as any).__SANDBOXD_AUTH_API__ = authApi;
      },
    });
  },
});

/* ------------------------------------------------------------------ */
/*  Auth API wrapper (legacy — for backend router use)                 */
/* ------------------------------------------------------------------ */

/**
 * Creates the SandboxdAuthApi instance for the backend router.
 *
 * This is the factory function used by createRouter to create the
 * auth API instance. The frontend uses sandboxdAuthApiRef directly.
 *
 * @deprecated Use sandboxdAuthApiRef in the frontend instead.
 *             This function remains for backward compatibility.
 */
export function createSandboxdAuthApi(options: {
  identityApi: IdentityApi;
  config: Config;
}): SandboxdAuthApi {
  return new SandboxdAuthApi(options);
}

/* ------------------------------------------------------------------ */
/*  API Key Management                                                 */
/* ------------------------------------------------------------------ */

/**
 * Creates a handler for sandboxd API key management operations.
 *
 * These handlers provide a Backstage-native way to manage sandboxd
 * API keys — create, rotate, and revoke keys from the UI.
 *
 * Routes:
 *   GET    /v1/keys              -> list API keys
 *   POST   /v1/keys              -> create a new API key
 *   POST   /v1/keys/:keyId/rotate -> rotate an API key (revoke old, create new)
 *   DELETE /v1/keys/:keyId       -> revoke an API key
 */
export function createApiKeyHandlers(
  baseUrl: string,
  token: string | undefined,
  logger: Console,
): {
  listKeys: express.RequestHandler;
  createKey: express.RequestHandler;
  rotateKey: express.RequestHandler;
  revokeKey: express.RequestHandler;
} {
  /**
   * List all sandboxd API keys.
   */
  const listKeys: express.RequestHandler = async (_req, res) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res_ = await fetch(`${baseUrl}/v1/keys`, { headers });
      if (!res_.ok) {
        const text = await res_.text();
        logger.error(
          `API key list failed: ${res_.status} ${text}`,
        );
        res.status(res_.status).json({
          error: 'Failed to list API keys',
          detail: text,
        });
        return;
      }

      const keys = await res_.json();
      res.json(keys);
    } catch (error) {
      logger.error(`API key list error: ${error}`);
      res.status(502).json({
        error: 'Failed to list API keys — sandboxd control plane unreachable',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Create a new sandboxd API key.
   *
   * Expects a JSON body with:
   *   - name: string (human-readable key name)
   *   - description: string (optional)
   *   - expiresAt: string (optional, ISO 8601)
   */
  const createKey: express.RequestHandler = async (req, res) => {
    const { name, description, expiresAt } = req.body || {};

    if (!name) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const body = JSON.stringify({ name, description, expiresAt });
      const res_ = await fetch(`${baseUrl}/v1/keys`, {
        method: 'POST',
        headers,
        body,
      });

      if (!res_.ok) {
        const text = await res_.text();
        logger.error(
          `API key create failed: ${res_.status} ${text}`,
        );
        res.status(res_.status).json({
          error: 'Failed to create API key',
          detail: text,
        });
        return;
      }

      const key = await res_.json();
      logger.info(`API key created: ${name} (id: ${key.id})`);
      res.status(201).json(key);
    } catch (error) {
      logger.error(`API key create error: ${error}`);
      res.status(502).json({
        error: 'Failed to create API key — sandboxd control plane unreachable',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Rotate an existing API key.
   *
   * Revokes the current key and creates a replacement. The frontend
   * should update its configuration with the new key value.
   *
   * @param req.params.keyId - The API key ID to rotate.
   */
  const rotateKey: express.RequestHandler = async (req, res) => {
    const { keyId } = req.params;

    if (!keyId) {
      res.status(400).json({ error: 'Missing keyId parameter' });
      return;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // First, revoke the old key
      const revokeRes = await fetch(
        `${baseUrl}/v1/keys/${keyId}/revoke`,
        {
          method: 'POST',
          headers,
        },
      );

      // Then create a replacement key with the same name
      // (we need to get the original key's name first)
      const listRes = await fetch(`${baseUrl}/v1/keys`, {
        method: 'GET',
        headers,
      });

      let originalKeyName = `key-${keyId}`;
      if (listRes.ok) {
        const keys = await listRes.json();
        const originalKey = keys.find(
          (k: SandboxdApiKey) => k.id === keyId,
        );
        if (originalKey) {
          originalKeyName = originalKey.name;
        }
      }

      const body = JSON.stringify({
        name: originalKeyName,
        description: 'Rotated key',
      });

      const createRes = await fetch(`${baseUrl}/v1/keys`, {
        method: 'POST',
        headers,
        body,
      });

      if (!createRes.ok) {
        const text = await createRes.text();
        logger.error(
          `API key rotate (create replacement) failed: ${createRes.status} ${text}`,
        );
        res.status(502).json({
          error: 'Failed to rotate API key — could not create replacement',
          detail: text,
        });
        return;
      }

      const newKey = await createRes.json();
      logger.info(`API key rotated: ${keyId} → ${newKey.id}`);
      res.status(201).json({
        newKey,
        previousKeyRevoked: revokeRes.ok,
      });
    } catch (error) {
      logger.error(`API key rotate error: ${error}`);
      res.status(502).json({
        error: 'Failed to rotate API key — sandboxd control plane unreachable',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Revoke an existing API key.
   *
   * @param req.params.keyId - The API key ID to revoke.
   */
  const revokeKey: express.RequestHandler = async (req, res) => {
    const { keyId } = req.params;

    if (!keyId) {
      res.status(400).json({ error: 'Missing keyId parameter' });
      return;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res_ = await fetch(
        `${baseUrl}/v1/keys/${keyId}/revoke`,
        {
          method: 'POST',
          headers,
        },
      );

      if (!res_.ok) {
        const text = await res_.text();
        logger.error(
          `API key revoke failed: ${res_.status} ${text}`,
        );
        res.status(res_.status).json({
          error: 'Failed to revoke API key',
          detail: text,
        });
        return;
      }

      logger.info(`API key revoked: ${keyId}`);
      res.json({ message: 'API key revoked successfully' });
    } catch (error) {
      logger.error(`API key revoke error: ${error}`);
      res.status(502).json({
        error: 'Failed to revoke API key — sandboxd control plane unreachable',
        message: (error as Error).message,
      });
    }
  };

  return { listKeys, createKey, rotateKey, revokeKey };
}

/* ------------------------------------------------------------------ */
/*  Multi-tenant proxy middleware                                      */
/* ------------------------------------------------------------------ */

/**
 * Creates a middleware that injects per-user authentication into
 * proxy requests when multi-tenant mode is enabled.
 *
 * When sandboxd runs in multi-tenant mode, each request to the
 * sandboxd control plane is routed through the authenticated user's
 * tenant-scoped API token. This middleware resolves the user's
 * identity and injects the appropriate authorization header.
 */
export function createTenantMiddleware(
  authApi: SandboxdAuthApi,
  config: Config,
): express.RequestHandler {
  const authConfig = readAuthConfig(config);

  return async (req, res, next) => {
    if (!authConfig.multiTenant.enabled) {
      return next();
    }

    try {
      const userInfo = await authApi.getUserInfo();
      if (!userInfo) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No Backstage identity found for this request',
        });
        return;
      }

      // Attach user identity to the request for downstream use
      (req as any).sandboxdUserIdentity = userInfo.identity;

      // Get the tenant-scoped token
      const tenantToken = await authApi.getApiKey();
      if (tenantToken) {
        (req as any).sandboxdAuthHeader = `Bearer ${tenantToken}`;
      }

      // Get tenant ID for routing
      const tenantId = await authApi.getTenantId();
      if (tenantId) {
        (req as any).sandboxdTenantId = tenantId;
      }

      next();
    } catch (error) {
      console.error(
        `Multi-tenant auth middleware error: ${(error as Error).message}`,
      );
      res.status(500).json({
        error: 'Internal authentication error',
        message: (error as Error).message,
      });
    }
  };
}
