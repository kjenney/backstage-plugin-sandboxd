import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import fetch from 'node-fetch';
import { SandboxdHealthCheck } from './healthCheck';
import { createSseProxyHandler } from './sseProxy';
import { SandboxdProvisioningManager } from './provisioning';

/**
 * Reads sandboxd configuration from Backstage config.
 */
function readConfig(config: Config): { baseUrl: string; token?: string } {
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
  options: { config: Config },
): Promise<express.Router> {
  const router = Router();
  const logger = console;

  const { baseUrl, token } = readConfig(options.config);

  // Start health checker
  const healthCheck = new SandboxdHealthCheck(options.config);
  healthCheck.start();

  // Start auto-provisioning manager
  const provisioningManager = new SandboxdProvisioningManager(options.config);
  provisioningManager.start();

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
 * Backstage backend plugin for sandboxd.
 */
export const sandboxdPlugin = createRouter;
