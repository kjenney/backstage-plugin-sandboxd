/**
 * Preview URL authentication gate.
 *
 * sandboxd preview URLs are public by design — anyone with the URL can
 * access the app. This module adds a Backstage session-based auth gate
 * so that only authenticated Backstage users can access sandboxd previews.
 *
 * The flow:
 * 1. Frontend requests a preview URL via POST /api/sandboxd/v1/apps/:appId/preview-url
 * 2. Backend validates the user's Backstage session token via IdentityApi
 * 3. If valid, backend returns an auth-gated preview URL with a short-lived
 *    session token appended to the sandboxd preview URL
 * 4. Frontend navigates to the auth-gated URL, which redirects to sandboxd's
 *    preview URL after validation
 */
import { Config } from '@backstage/config';
import { BackstageIdentityResponse } from '@backstage/core-plugin-api';
import express from 'express';
import { SandboxdAuthApi } from './auth';
/**
 * A sandboxd preview URL with Backstage session auth.
 */
export interface AuthGatedPreviewUrl {
    /** The sandboxd preview URL with a session token appended */
    url: string;
    /** How long the session token is valid (seconds) */
    ttl: number;
}
/**
 * A validated Backstage session for preview access.
 */
export interface ValidatedSession {
    /** The Backstage identity response */
    identity: BackstageIdentityResponse;
    /** The tenant ID for multi-tenant routing */
    tenantId: string | undefined;
    /** The sandboxd API token for the tenant */
    apiKey: string | undefined;
}
/**
 * Creates a handler that validates the user's Backstage session and
 * returns an auth-gated preview URL.
 *
 * The handler:
 * 1. Validates the user's Backstage identity via the IdentityApi
 * 2. Resolves the user's sandboxd tenant ID and API token
 * 3. Constructs a sandboxd preview URL with a short-lived session token
 * 4. Returns the auth-gated URL to the frontend
 */
export declare function createPreviewUrlHandler(baseUrl: string, token: string | undefined, authApi: SandboxdAuthApi, config: Config): express.RequestHandler;
/**
 * Creates a middleware that validates Backstage session tokens in
 * the URL query parameters of preview requests.
 *
 * This middleware is mounted on the sandboxd control-plane proxy
 * so that preview requests are validated before being proxied to
 * sandboxd.
 *
 * When sandboxd is deployed with the preview auth gate enabled,
 * it will reject requests without a valid Backstage session token.
 */
export declare function createPreviewSessionValidator(): express.RequestHandler;
