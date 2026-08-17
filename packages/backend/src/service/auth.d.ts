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
import { ApiRef } from '@backstage/core-plugin-api';
import { IdentityApi } from '@backstage/plugin-auth-node';
import express from 'express';
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
 * API reference for the sandboxd authentication API.
 *
 * This API provides methods for the frontend to resolve the current
 * user's sandboxd API token and tenant ID from Backstage identity.
 *
 * @public
 */
export declare const sandboxdAuthApiRef: ApiRef<SandboxdAuthApi>;
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
export declare class SandboxdAuthApi {
    private readonly identityApi;
    private readonly config;
    constructor(options: {
        identityApi: IdentityApi;
        config: Config;
    });
    /**
     * Get the current user's identity from Backstage.
     *
     * @param request — The incoming HTTP request to extract identity from.
     * @returns The Backstage user identity response (identity + token), or null if unauthenticated.
     */
    getUserInfo(request?: express.Request): Promise<BackstageIdentityResponse | null>;
    /**
     * Resolve the full identity for the current user — token, tenant, and claims.
     *
     * This is the core method that maps Backstage identity to sandboxd auth.
     * In single-tenant mode, returns the shared token. In multi-tenant mode,
     * resolves per-user tenant-scoped tokens.
     *
     * @returns The resolved identity, or null if unauthenticated.
     */
    resolveIdentity(): Promise<ResolvedIdentity | null>;
    /**
     * Resolve the current user's sandboxd API token.
     *
     * In single-tenant mode, returns the shared sandboxd.token from config.
     * In multi-tenant mode, returns the user's tenant-scoped token.
     *
     * @returns The sandboxd API token, or undefined if not available.
     */
    getApiKey(): Promise<string | undefined>;
    /**
     * Resolve the tenant ID for the current user.
     *
     * In multi-tenant mode, this extracts the user's tenant from their
     * Backstage identity using the configured identity claim.
     *
     * @returns The tenant identifier, or undefined if single-tenant mode.
     */
    getTenantId(): Promise<string | undefined>;
    /**
     * Resolve the tenant ID from a Backstage identity response.
     */
    private resolveTenantId;
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
    private resolveTenantToken;
    /**
     * Check if multi-tenant mode is enabled.
     */
    isMultiTenant(): boolean;
    /**
     * Get the identity claim configuration.
     */
    getIdentityClaim(): IdentityClaim;
}
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
export declare const sandboxdAuthBackendModule: import("@backstage/backend-plugin-api/dist/types/types.d-BJ6KGQ77").B;
/**
 * Creates the SandboxdAuthApi instance for the backend router.
 *
 * This is the factory function used by createRouter to create the
 * auth API instance. The frontend uses sandboxdAuthApiRef directly.
 *
 * @deprecated Use sandboxdAuthApiRef in the frontend instead.
 *             This function remains for backward compatibility.
 */
export declare function createSandboxdAuthApi(options: {
    identityApi: IdentityApi;
    config: Config;
}): SandboxdAuthApi;
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
export declare function createApiKeyHandlers(baseUrl: string, token: string | undefined, logger: Console): {
    listKeys: express.RequestHandler;
    createKey: express.RequestHandler;
    rotateKey: express.RequestHandler;
    revokeKey: express.RequestHandler;
};
/**
 * Creates a middleware that injects per-user authentication into
 * proxy requests when multi-tenant mode is enabled.
 *
 * When sandboxd runs in multi-tenant mode, each request to the
 * sandboxd control plane is routed through the authenticated user's
 * tenant-scoped API token. This middleware resolves the user's
 * identity and injects the appropriate authorization header.
 */
export declare function createTenantMiddleware(authApi: SandboxdAuthApi, config: Config): express.RequestHandler;
