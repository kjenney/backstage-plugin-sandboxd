import { Config } from '@backstage/config';
import { IdentityApi } from '@backstage/plugin-auth-node';
import express from 'express';
/**
 * Creates the sandboxd backend router.
 *
 * Proxies API calls from Backstage frontend to the sandboxd control plane,
 * injecting authentication headers so the frontend never needs to handle
 * sandboxd credentials directly.
 *
 * Route priority:
 *  1. /health           — local health + sandboxd control-plane status
 *  2. /v1/tasks/:taskId/stream — SSE proxy (must be before wildcard)
 *  3. /v1/*             — general API proxy
 */
export declare function createRouter(options: {
    config: Config;
    identityApi: IdentityApi;
}): Promise<express.Router>;
export declare const sandboxdPlugin: typeof createRouter;
