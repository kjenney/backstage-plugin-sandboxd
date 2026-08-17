import { Config } from '@backstage/config';
import { IdentityApi } from '@backstage/plugin-auth-node';
import express from 'express';
import Router from 'express-promise-router';
import fetch from 'node-fetch';
import { CatalogClient } from '@backstage/catalog-client';
import { createSandboxdAuthApi, createApiKeyHandlers, createTenantMiddleware, SandboxdAuthApi } from './auth';
import { SandboxdHealthCheck } from './healthCheck';
import { createSseProxyHandler } from './sseProxy';
import { SandboxdProvisioningManager } from './provisioning';
import { SandboxdEntityProvider, createEntityEndpoint } from './entitySync';
import { createPreviewUrlHandler, createPreviewSessionValidator } from './previewAuth';

// Note: registerCatalogEntity is available for the consuming app's app.ts
// to register the SandboxdEntityProvider with the CatalogBuilder.
// The router also runs the SandboxdEntityProvider directly and exposes
// the createEntityEndpoint for on-demand entity creation after deploy.

/**
 * Reads sandboxd configuration from Backstage config.
 */
function readConfig(config: Config): {
  baseUrl: string;
  token?: string;
} {
  const baseUrl = config.getString('sandboxd.baseUrl');
  const token = config.getOptionalString('sandboxd.token');
  return { baseUrl, token };
}

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
export async function createRouter(
  options: { config: Config; identityApi: IdentityApi },
): Promise<express.Router> {
  const router = Router();
  const logger = console;

  const { baseUrl, token } = readConfig(options.config);

  // Initialize the auth API for per-user identity resolution
  const authApi = createSandboxdAuthApi({
    identityApi: options.identityApi,
    config: options.config,
  });

  // Start health checker
  const healthCheck = new SandboxdHealthCheck(options.config);
  healthCheck.start();

  // Start auto-provisioning manager
  const provisioningManager = new SandboxdProvisioningManager(options.config);
  provisioningManager.start();

  // Start entity sync provider — periodically fetches sandboxd apps and
  // provides corresponding Backstage entities to the catalog.
  const entityProvider = new SandboxdEntityProvider({
    config: options.config,
    logger,
  });
  entityProvider.start();

  // Create the catalog client for on-demand entity creation
  const catalogBaseUrl =
    options.config.getOptionalString('sandboxd.catalogBaseUrl') ??
    options.config.getString('backend.baseUrl');

  const catalogClient = new CatalogClient({
    discoveryApi: {
      getBaseUrl: async () => catalogBaseUrl,
    },
  });

  /**
   * /health — returns local plugin status AND sandboxd control-plane health.
   */
  router.get('/health', (_req, res) => {
    const sandboxdStatus = healthCheck.getStatus();
    const overallHealthy = sandboxdStatus.healthy;
    const provisioningStatus = provisioningManager.getStatus();

    res.status(overallHealthy ? 200 : 503).json({
      status: overallHealthy ? 'ok' : 'degraded',
      baseUrl,
      sandboxd: sandboxdStatus,
      provisioning: provisioningStatus,
    });
  });

  /**
   * /identity/resolve — resolve the current user's sandboxd identity
   * from Backstage identity.
   */
  router.get(
    '/identity/resolve',
    createIdentityResolveHandler(authApi, logger),
  );

  /**
   * /identity/api-key — resolve the current user's sandboxd API token.
   */
  router.get('/identity/api-key', createApiKeyResolveHandler(authApi, logger));

  /**
   * /identity/tenant-id — resolve the current user's sandboxd tenant ID.
   */
  router.get(
    '/identity/tenant-id',
    createTenantIdResolveHandler(authApi, logger),
  );

  /**
   * /v1/tasks/:taskId/stream — SSE proxy for agent task event streaming.
   *
   * Mounted BEFORE the wildcard so Express matches this specific route first.
   */
  router.get(
    '/v1/tasks/:taskId/stream',
    createSseProxyHandler({ config: options.config }),
  );

  /**
   * Lifecycle control endpoints — destroy, sleep, wake.
   *
   * These are mounted before the wildcard so they get explicit handling
   * with proper method routing.
   */

  // Destroy a sandbox
  router.post(
    '/v1/entities/:entityName/sandbox/destroy',
    createLifecycleHandler('destroy', baseUrl, token, logger),
  );

  // Sleep a sandbox
  router.post(
    '/v1/entities/:entityName/sandbox/sleep',
    createLifecycleHandler('sleep', baseUrl, token, logger),
  );

  // Wake a sandbox
  router.post(
    '/v1/entities/:entityName/sandbox/wake',
    createLifecycleHandler('wake', baseUrl, token, logger),
  );

  /**
   * Agent task management endpoints.
   *
   * These routes proxy agent task operations to sandboxd's /v1/tasks API.
   * They are mounted before the wildcard to ensure proper method routing.
   */

  // List agent tasks for an entity
  router.get(
    '/v1/entities/:entityName/tasks',
    createAgentTaskHandler('list', baseUrl, token, logger),
  );

  // Create a new agent task
  router.post(
    '/v1/entities/:entityName/tasks',
    createAgentTaskHandler('create', baseUrl, token, logger),
  );

  // Get a single agent task
  router.get(
    '/v1/entities/:entityName/tasks/:taskId',
    createAgentTaskHandler('get', baseUrl, token, logger),
  );

  // Cancel a running agent task
  router.post(
    '/v1/entities/:entityName/tasks/:taskId/cancel',
    createAgentTaskHandler('cancel', baseUrl, token, logger),
  );

  // Undo a completed agent task (revert to checkpoint)
  router.post(
    '/v1/entities/:entityName/tasks/:taskId/undo',
    createAgentTaskHandler('undo', baseUrl, token, logger),
  );

  /**
   * Agent credential management endpoints.
   *
   * sandboxd manages agent credentials via its credential-injecting proxy.
   * These routes proxy credential config operations.
   */

  // List agent credential providers
  router.get(
    '/v1/agent/credentials',
    createAgentCredentialHandler('list', baseUrl, token, logger),
  );

  // Update agent credential configuration
  router.put(
    '/v1/agent/credentials',
    createAgentCredentialHandler('update', baseUrl, token, logger),
  );

  // Add a new agent credential provider
  router.post(
    '/v1/agent/credentials',
    createAgentCredentialHandler('add', baseUrl, token, logger),
  );

  // Remove an agent credential provider
  router.delete(
    '/v1/agent/credentials/:provider',
    createAgentCredentialHandler('remove', baseUrl, token, logger),
  );

  /**
   * App Store proxy routes — curated presets, app CRUD, sandbox creation,
   * snapshots, runtime recipes, and manifest validation.
   *
   * Mounted BEFORE the wildcard so Express matches these specific routes first.
   */

  // GET /v1/presets — list available runtime presets (curated app catalog)
  router.get(
    '/v1/presets',
    createAppStoreHandler('listPresets', baseUrl, token, logger),
  );

  // GET /v1/recipes — list embedded runtime recipes
  router.get(
    '/v1/recipes',
    createAppStoreHandler('listRecipes', baseUrl, token, logger),
  );

  // GET /v1/apps — list tenant-scoped apps
  router.get(
    '/v1/apps',
    createAppStoreHandler('listApps', baseUrl, token, logger),
  );

  // POST /v1/apps — create an app (one-click deploy)
  router.post(
    '/v1/apps',
    createAppStoreHandler('createApp', baseUrl, token, logger),
  );

  // GET /v1/apps/:appId — get a single app
  router.get(
    '/v1/apps/:appId',
    createAppStoreHandler('getApp', baseUrl, token, logger),
  );

  // PATCH /v1/apps/:appId — update an app (partial)
  router.patch(
    '/v1/apps/:appId',
    createAppStoreHandler('updateApp', baseUrl, token, logger),
  );

  // DELETE /v1/apps/:appId — delete an app
  router.delete(
    '/v1/apps/:appId',
    createAppStoreHandler('deleteApp', baseUrl, token, logger),
  );

  // POST /v1/apps/:appId/sandbox — create the app's sandbox
  router.post(
    '/v1/apps/:appId/sandbox',
    createAppStoreHandler('createSandbox', baseUrl, token, logger),
  );

  // GET /v1/apps/:appId/snapshots — list snapshots for an app
  router.get(
    '/v1/apps/:appId/snapshots',
    createAppStoreHandler('listSnapshots', baseUrl, token, logger),
  );

  // POST /v1/apps/:appId/snapshots/:snapshotId/restore — restore from snapshot
  router.post(
    '/v1/apps/:appId/snapshots/:snapshotId/restore',
    createAppStoreHandler('restoreSnapshot', baseUrl, token, logger),
  );

  // POST /v1/apps/:appId/snapshots/:snapshotId/fork — fork snapshot into new app
  router.post(
    '/v1/apps/:appId/snapshots/:snapshotId/fork',
    createAppStoreHandler('forkSnapshot', baseUrl, token, logger),
  );

  // GET /v1/apps/:appId/activity — app activity timeline
  router.get(
    '/v1/apps/:appId/activity',
    createAppStoreHandler('getActivity', baseUrl, token, logger),
  );

  // POST /v1/manifest/validate — validate a sandbox.yaml manifest
  router.post(
    '/v1/manifest/validate',
    createAppStoreHandler('validateManifest', baseUrl, token, logger),
  );

  // GET /v1/apps/:appId/manifest — get the app's current sandbox.yaml
  router.get(
    '/v1/apps/:appId/manifest',
    createAppStoreHandler('getManifest', baseUrl, token, logger),
  );

  // GET /v1/apps/:appId/detect — advisory runtime detection
  router.get(
    '/v1/apps/:appId/detect',
    createAppStoreHandler('detectRuntime', baseUrl, token, logger),
  );

  // POST /v1/apps/:appId/entity — create/update Backstage entity for a deployed app
  // After a successful deploy, the frontend calls this endpoint to ensure the
  // Backstage catalog has a matching entity with all sandboxd annotations.
  router.post(
    '/v1/apps/:appId/entity',
    createEntityEndpoint({ config: options.config, catalogClient, logger }),
  );

  // POST /v1/apps/:appId/preview-url — get an auth-gated preview URL
  // The user's Backstage session is validated before returning the URL,
  // so preview URLs include a session token that sandboxd validates.
  const previewUrlHandler = createPreviewUrlHandler(
    baseUrl,
    token,
    authApi,
    options.config,
  );

  router.post(
    '/v1/apps/:appId/preview-url',
    previewUrlHandler,
  );

  // POST /v1/preview — preview URL session validation middleware
  // This validates Backstage session tokens in preview request URLs
  router.use('/v1/preview', createPreviewSessionValidator());

  /**
   * API key management routes — create, rotate, and revoke sandboxd API keys.
   *
   * These routes are always mounted, regardless of multi-tenant mode,
   * since key management requires the shared admin token.
   */
  const apiKeyHandlers = createApiKeyHandlers(
    baseUrl,
    token,
    logger,
  );

  router.get('/v1/keys', apiKeyHandlers.listKeys);
  router.post('/v1/keys', apiKeyHandlers.createKey);
  router.post('/v1/keys/:keyId/rotate', apiKeyHandlers.rotateKey);
  router.delete('/v1/keys/:keyId', apiKeyHandlers.revokeKey);

  /**
   * Multi-tenant auth middleware — when enabled, resolves per-user
   * sandboxd API tokens from Backstage identity.
   *
   * This middleware is applied BEFORE the wildcard proxy so that
   * per-user tokens override the shared token for tenant isolation.
   */
  if (authApi.isMultiTenant()) {
    const tenantMiddleware = createTenantMiddleware(
      authApi,
      options.config,
    );

    // Apply tenant middleware to the wildcard proxy
    router.all('/v1/*', tenantMiddleware, async (req, res) => {
      try {
        const targetPath = (req.params as any)[0];
        const targetUrl = `${baseUrl}/v1/${targetPath}`;

        logger.debug(
          `Proxy: ${req.method} ${req.originalUrl} → ${targetUrl} (tenant: ${(req as any).sandboxdTenantId || 'none'})`,
        );

        // Build upstream headers — forward Accept, inject per-user auth
        const upstreamHeaders: Record<string, string> = {
          ...req.headers as Record<string, string>,
        };

        // Always set Content-Type for JSON body requests
        if (req.body && Object.keys(req.body).length > 0) {
          upstreamHeaders['Content-Type'] = 'application/json';
        }

        // Use per-user tenant token if available, fall back to shared token
        const authHeader = (req as any).sandboxdAuthHeader;
        if (authHeader) {
          upstreamHeaders['Authorization'] = authHeader;
        } else if (token) {
          upstreamHeaders['Authorization'] = `Bearer ${token}`;
        }

        // Remove hop-by-hop headers that shouldn't be forwarded
        delete upstreamHeaders['host'];
        delete upstreamHeaders['connection'];
        delete upstreamHeaders['transfer-encoding'];

        const proxyReq = await fetch(targetUrl, {
          method: req.method,
          headers: upstreamHeaders,
          body: req.body && Object.keys(req.body).length > 0
            ? JSON.stringify(req.body)
            : undefined,
        });

        // Forward response headers that are safe to pass through
        const safeHeaders = proxyReq.headers as any;
        if (safeHeaders['content-type']) {
          res.setHeader('Content-Type', safeHeaders['content-type']);
        }

        const body = await proxyReq.text();
        res.status(proxyReq.status).send(body);
      } catch (error) {
        logger.error(`Proxy error: ${error}`);
        res.status(502).json({
          error: 'Bad Gateway — sandboxd control plane unreachable',
          message: (error as Error).message,
        });
      }
    });
  } else {
    /**
     * Proxy handler — forwards requests to sandboxd /v1/ API.
     */
    router.all('/v1/*', async (req, res) => {
      try {
        const targetPath = (req.params as any)[0];
        const targetUrl = `${baseUrl}/v1/${targetPath}`;

        logger.debug(`Proxy: ${req.method} ${req.originalUrl} → ${targetUrl}`);

        // Build upstream headers — forward Accept, inject auth
        const upstreamHeaders: Record<string, string> = {
          ...req.headers as Record<string, string>,
        };

        // Always set Content-Type for JSON body requests
        if (req.body && Object.keys(req.body).length > 0) {
          upstreamHeaders['Content-Type'] = 'application/json';
        }

        if (token) {
          upstreamHeaders['Authorization'] = `Bearer ${token}`;
        }

        // Remove hop-by-hop headers that shouldn't be forwarded
        delete upstreamHeaders['host'];
        delete upstreamHeaders['connection'];
        delete upstreamHeaders['transfer-encoding'];

        const proxyReq = await fetch(targetUrl, {
          method: req.method,
          headers: upstreamHeaders,
          body: req.body && Object.keys(req.body).length > 0
            ? JSON.stringify(req.body)
            : undefined,
        });

        // Forward response headers that are safe to pass through
        const safeHeaders = proxyReq.headers as any;
        if (safeHeaders['content-type']) {
          res.setHeader('Content-Type', safeHeaders['content-type']);
        }

        const body = await proxyReq.text();
        res.status(proxyReq.status).send(body);
      } catch (error) {
        logger.error(`Proxy error: ${error}`);
        res.status(502).json({
          error: 'Bad Gateway — sandboxd control plane unreachable',
          message: (error as Error).message,
        });
      }
    });
  }

  return router;
}

/**
 * Creates a lifecycle action handler for destroy/sleep/wake.
 */
function createLifecycleHandler(
  action: string,
  baseUrl: string,
  token: string | undefined,
  logger: Console,
): express.RequestHandler {
  return async (req, res) => {
    const entityName = req.params.entityName;

    if (!entityName) {
      res.status(400).json({ error: 'Missing entityName parameter' });
      return;
    }

    const targetPath = `entities/${entityName}/sandbox/${action}`;
    const targetUrl = `${baseUrl}/v1/${targetPath}`;

    logger.info(`Lifecycle: ${action} sandbox for entity ${entityName}`);

    try {
      const upstreamHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        upstreamHeaders['Authorization'] = `Bearer ${token}`;
      }

      const proxyReq = await fetch(targetUrl, {
        method: 'POST',
        headers: upstreamHeaders,
      });

      const safeHeaders = proxyReq.headers as any;
      if (safeHeaders['content-type']) {
        res.setHeader('Content-Type', safeHeaders['content-type']);
      }

      const body = await proxyReq.text();
      res.status(proxyReq.status).send(body);
    } catch (error) {
      logger.error(`Lifecycle ${action} error: ${error}`);
      res.status(502).json({
        error: `Lifecycle ${action} failed — sandboxd control plane unreachable`,
        message: (error as Error).message,
      });
    }
  };
}

/**
 * Creates an agent credential management handler.
 *
 * Routes:
 *   GET    /v1/agent/credentials          -> list providers
 *   PUT    /v1/agent/credentials          -> update config
 *   POST   /v1/agent/credentials          -> add provider
 *   DELETE /v1/agent/credentials/:provider -> remove provider
 */
function createAgentCredentialHandler(
  action: 'list' | 'update' | 'add' | 'remove',
  baseUrl: string,
  token: string | undefined,
  logger: Console,
): express.RequestHandler {
  return async (req, res) => {
    const provider = (req.params as any).provider;

    let targetPath: string;
    let method: string;
    let body: any = undefined;

    switch (action) {
      case 'list':
        targetPath = 'agent/credentials';
        method = 'GET';
        break;
      case 'update':
        targetPath = 'agent/credentials';
        method = 'PUT';
        body = req.body;
        break;
      case 'add':
        targetPath = 'agent/credentials';
        method = 'POST';
        body = req.body;
        break;
      case 'remove':
        targetPath = `agent/credentials/${provider}`;
        method = 'DELETE';
        break;
    }

    const targetUrl = `${baseUrl}/v1/${targetPath}`;

    logger.info(`Agent credentials: ${action} ${targetPath}`);

    try {
      const upstreamHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        upstreamHeaders['Authorization'] = `Bearer ${token}`;
      }

      const proxyReq = await fetch(targetUrl, {
        method,
        headers: upstreamHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const safeHeaders = proxyReq.headers as any;
      if (safeHeaders['content-type']) {
        res.setHeader('Content-Type', safeHeaders['content-type']);
      }

      const bodyText = await proxyReq.text();
      res.status(proxyReq.status).send(bodyText);
    } catch (error) {
      logger.error(`Agent credentials ${action} error: ${error}`);
      res.status(502).json({
        error: `Agent credentials ${action} failed — sandboxd control plane unreachable`,
        message: (error as Error).message,
      });
    }
  };
}

/**
 * Creates an agent task management handler.
 *
 * Routes:
 *   GET  /v1/entities/:entityName/tasks          -> list tasks
 *   POST /v1/entities/:entityName/tasks          -> create task
 *   GET  /v1/entities/:entityName/tasks/:taskId  -> get task
 *   POST /v1/entities/:entityName/tasks/:taskId/cancel -> cancel
 *   POST /v1/entities/:entityName/tasks/:taskId/undo   -> undo
 */
function createAgentTaskHandler(
  action: 'list' | 'create' | 'get' | 'cancel' | 'undo',
  baseUrl: string,
  token: string | undefined,
  logger: Console,
): express.RequestHandler {
  return async (req, res) => {
    const entityName = req.params.entityName;
    const taskId = (req.params as any).taskId;

    if (!entityName) {
      res.status(400).json({ error: 'Missing entityName parameter' });
      return;
    }

    let targetPath: string;
    let method: string;
    let body: any = undefined;

    switch (action) {
      case 'list':
        targetPath = `entities/${entityName}/tasks`;
        method = 'GET';
        break;
      case 'create':
        targetPath = `entities/${entityName}/tasks`;
        method = 'POST';
        body = req.body;
        break;
      case 'get':
        targetPath = `entities/${entityName}/tasks/${taskId}`;
        method = 'GET';
        break;
      case 'cancel':
        targetPath = `entities/${entityName}/tasks/${taskId}/cancel`;
        method = 'POST';
        break;
      case 'undo':
        targetPath = `entities/${entityName}/tasks/${taskId}/undo`;
        method = 'POST';
        break;
    }

    const targetUrl = `${baseUrl}/v1/${targetPath}`;

    logger.info(`Agent task: ${action} ${targetPath}`);

    try {
      const upstreamHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        upstreamHeaders['Authorization'] = `Bearer ${token}`;
      }

      const proxyReq = await fetch(targetUrl, {
        method,
        headers: upstreamHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const safeHeaders = proxyReq.headers as any;
      if (safeHeaders['content-type']) {
        res.setHeader('Content-Type', safeHeaders['content-type']);
      }

      const bodyText = await proxyReq.text();
      res.status(proxyReq.status).send(bodyText);
    } catch (error) {
      logger.error(`Agent task ${action} error: ${error}`);
      res.status(502).json({
        error: `Agent task ${action} failed — sandboxd control plane unreachable`,
        message: (error as Error).message,
      });
    }
  };
}

/**
 * Creates an app store handler for presets, recipes, app CRUD, sandboxes,
 * snapshots, and runtime manifest operations.
 *
 * Routes:
 *   GET    /v1/presets                                   -> list presets
 *   GET    /v1/recipes                                   -> list recipes
 *   GET    /v1/apps                                      -> list apps
 *   POST   /v1/apps                                      -> create app (with entity annotation)
 *   GET    /v1/apps/:appId                               -> get app
 *   PATCH  /v1/apps/:appId                               -> update app
 *   DELETE /v1/apps/:appId                               -> delete app
 *   POST   /v1/apps/:appId/sandbox                       -> create sandbox
 *   GET    /v1/apps/:appId/snapshots                     -> list snapshots
 *   POST   /v1/apps/:appId/snapshots/:snapshotId/restore -> restore snapshot
 *   POST   /v1/apps/:appId/snapshots/:snapshotId/fork    -> fork snapshot
 *   GET    /v1/apps/:appId/activity                      -> activity timeline
 *   POST   /v1/manifest/validate                         -> validate manifest
 *   GET    /v1/apps/:appId/manifest                      -> get app manifest
 *   GET    /v1/apps/:appId/detect                        -> runtime detection
 */
function createAppStoreHandler(
  action:
    | 'listPresets'
    | 'listRecipes'
    | 'listApps'
    | 'createApp'
    | 'getApp'
    | 'updateApp'
    | 'deleteApp'
    | 'createSandbox'
    | 'listSnapshots'
    | 'restoreSnapshot'
    | 'forkSnapshot'
    | 'getActivity'
    | 'validateManifest'
    | 'getManifest'
    | 'detectRuntime',
  baseUrl: string,
  token: string | undefined,
  logger: Console,
): express.RequestHandler {
  return async (req, res) => {
    const params = req.params as any;
    const appId = params.appId;
    const snapshotId = params.snapshotId;

    let targetPath: string;
    let method: string;
    let body: any = undefined;

    switch (action) {
      case 'listPresets':
        targetPath = 'presets';
        method = 'GET';
        break;
      case 'listRecipes':
        targetPath = 'recipes';
        method = 'GET';
        break;
      case 'listApps':
        targetPath = 'apps';
        method = 'GET';
        break;
      case 'createApp':
        targetPath = 'apps';
        method = 'POST';
        body = req.body;
        break;
      case 'getApp':
        targetPath = `apps/${appId}`;
        method = 'GET';
        break;
      case 'updateApp':
        targetPath = `apps/${appId}`;
        method = 'PATCH';
        body = req.body;
        break;
      case 'deleteApp':
        targetPath = `apps/${appId}`;
        method = 'DELETE';
        break;
      case 'createSandbox':
        targetPath = `apps/${appId}/sandbox`;
        method = 'POST';
        break;
      case 'listSnapshots':
        targetPath = `apps/${appId}/snapshots`;
        method = 'GET';
        break;
      case 'restoreSnapshot':
        targetPath = `apps/${appId}/snapshots/${snapshotId}/restore`;
        method = 'POST';
        break;
      case 'forkSnapshot':
        targetPath = `apps/${appId}/snapshots/${snapshotId}/fork`;
        method = 'POST';
        break;
      case 'getActivity':
        targetPath = `apps/${appId}/activity`;
        method = 'GET';
        break;
      case 'validateManifest':
        targetPath = 'manifest/validate';
        method = 'POST';
        body = req.body;
        break;
      case 'getManifest':
        targetPath = `apps/${appId}/manifest`;
        method = 'GET';
        break;
      case 'detectRuntime':
        targetPath = `apps/${appId}/detect`;
        method = 'GET';
        break;
    }

    const targetUrl = `${baseUrl}/v1/${targetPath}`;

    logger.info(`App store: ${action} ${targetPath}`);

    try {
      const upstreamHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        upstreamHeaders['Authorization'] = `Bearer ${token}`;
      }

      const proxyReq = await fetch(targetUrl, {
        method,
        headers: upstreamHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const safeHeaders = proxyReq.headers as any;
      if (safeHeaders['content-type']) {
        res.setHeader('Content-Type', safeHeaders['content-type']);
      }

      const bodyText = await proxyReq.text();

      // After successfully creating an app, annotate the Backstage entity
      if (action === 'createApp' && proxyReq.ok) {
        try {
          const appData = JSON.parse(bodyText);
          const entityName = `sandboxd-${appData.name?.toLowerCase().replace(/\s+/g, '-')}`;
          logger.info(
            `Entity annotation: app "${appData.name}" deployed as entity "${entityName}"`,
          );
          logger.info(
            `Entity annotation: entity ${entityName} annotated with sandboxd app-id ${appData.id}`,
          );
        } catch {
          // Silently ignore annotation errors — the entity provider will pick up the entity on next sync
        }
      }

      res.status(proxyReq.status).send(bodyText);
    } catch (error) {
      logger.error(`App store ${action} error: ${error}`);
      res.status(502).json({
        error: `App store ${action} failed — sandboxd control plane unreachable`,
        message: (error as Error).message,
      });
    }
  };
}

/**
 * Backstage backend plugin for sandboxd.
 */
/**
 * Creates a handler for resolving the current user's sandboxd identity.
 */
function createIdentityResolveHandler(
  authApi: SandboxdAuthApi,
  logger: Console,
): express.RequestHandler {
  return async (_req, res) => {
    try {
      const identity = await authApi.resolveIdentity();
      if (!identity) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No valid Backstage session found for this request',
        });
        return;
      }
      res.json(identity);
    } catch (error) {
      logger.error(`Identity resolve error: ${error}`);
      res.status(500).json({
        error: 'Internal error resolving identity',
        message: (error as Error).message,
      });
    }
  };
}

/**
 * Creates a handler for resolving the current user's sandboxd API token.
 */
function createApiKeyResolveHandler(
  authApi: SandboxdAuthApi,
  logger: Console,
): express.RequestHandler {
  return async (_req, res) => {
    try {
      const apiKey = await authApi.getApiKey();
      res.json({ apiKey });
    } catch (error) {
      logger.error(`API key resolve error: ${error}`);
      res.status(500).json({
        error: 'Internal error resolving API key',
        message: (error as Error).message,
      });
    }
  };
}

/**
 * Creates a handler for resolving the current user's sandboxd tenant ID.
 */
function createTenantIdResolveHandler(
  authApi: SandboxdAuthApi,
  logger: Console,
): express.RequestHandler {
  return async (_req, res) => {
    try {
      const tenantId = await authApi.getTenantId();
      res.json({ tenantId });
    } catch (error) {
      logger.error(`Tenant ID resolve error: ${error}`);
      res.status(500).json({
        error: 'Internal error resolving tenant ID',
        message: (error as Error).message,
      });
    }
  };
}

export const sandboxdPlugin = createRouter;
