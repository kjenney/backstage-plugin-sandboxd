import { loggerToWinstonLogger } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import fetch from 'node-fetch';

/**
 * Configuration interface for sandboxd backend plugin.
 */
interface SandboxdConfig {
  baseUrl: string;
  token?: string;
}

/**
 * Creates the sandboxd backend router.
 *
 * Proxies API calls from Backstage frontend to the sandboxd control plane,
 * injecting authentication headers so the frontend never needs to handle
 * sandboxd credentials directly.
 *
 * @param options - Plugin options including Backstage config
 * @returns Express router handling /sandboxd/* routes
 */
export async function createRouter(
  options: { config: Config },
): Promise<express.Router> {
  const router = Router();
  const logger = loggerToWinstonLogger();

  const { baseUrl, token } = readConfig(options.config);

  router.get('/health', (_req, res) => {
    logger.info('PONG!');
    res.json({ status: 'ok', baseUrl });
  });

  /**
   * Proxy handler — forwards requests to sandboxd /v1/ API.
   *
   * The route pattern captures the sandboxd API path after /sandboxd/
   * and forwards it with the appropriate auth headers.
   */
  router.all('/v1/*', async (req, res) => {
    try {
      const targetPath = req.params[0];
      const targetUrl = `${baseUrl}/v1/${targetPath}`;

      const proxyReq = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
      });

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
 * Reads sandboxd configuration from Backstage config.
 */
function readConfig(config: Config): SandboxdConfig {
  const baseUrl = config.getString('sandboxd.baseUrl');
  const token = config.getOptionalString('sandboxd.token');
  return { baseUrl, token };
}

/**
 * Backstage backend plugin for sandboxd.
 */
export const sandboxdPlugin = createRouter;
