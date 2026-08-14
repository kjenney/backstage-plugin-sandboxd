import express from 'express';
import { Config } from '@backstage/config';
import * as http from 'http';
import { createLogger } from '@backstage/backend-plugin-api';

/**
 * SSE Proxy handler — forwards Server-Sent Events from sandboxd to Backstage frontend.
 *
 * sandboxd streams agent task progress via SSE. This handler establishes
 * a WebSocket-compatible connection to sandboxd and pipes events through
 * to the Backstage frontend.
 *
 * @param options - Plugin options including Backstage config
 * @returns Express route handler for SSE proxy
 */
export function createSseProxyHandler(
  options: { config: Config },
): express.RequestHandler {
  const logger = createLogger();
  const { baseUrl, token } = readConfig(options.config);

  return async (req, res) => {
    const taskId = req.params.taskId;
    if (!taskId) {
      res.status(400).json({ error: 'Missing taskId parameter' });
      return;
    }

    const targetUrl = `${baseUrl}/v1/tasks/${taskId}/stream`;

    logger.info(`SSE proxy: connecting to ${targetUrl}`);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Flush headers immediately
    res.flushHeaders();

    const client = new http.Agent({
      keepAlive: true,
      timeout: 30000,
    });

    const proxyReq = http.get(
      {
        hostname: new URL(baseUrl).hostname,
        port: new URL(baseUrl).port,
        path: `/v1/tasks/${taskId}/stream`,
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'text/event-stream',
        },
        agent: client,
      },
      (proxyRes) => {
        logger.info(`SSE proxy: connected to sandboxd (status ${proxyRes.statusCode})`);

        if (proxyRes.statusCode !== 200) {
          res.write(`data: {"error": "sandboxd returned status ${proxyRes.statusCode}"}\n\n`);
          res.end();
          return;
        }

        // Pipe SSE events from sandboxd to Backstage frontend
        proxyRes.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf8');
          res.write(text);
        });

        proxyRes.on('end', () => {
          logger.info('SSE proxy: connection closed by sandboxd');
          res.write(`data: {"event": "closed"}\n\n`);
          res.end();
        });

        proxyRes.on('error', (err: Error) => {
          logger.error(`SSE proxy error from sandboxd: ${err.message}`);
          res.write(`data: {"error": "${err.message}"}\n\n`);
          res.end();
        });
      },
    );

    // Handle client disconnection — close the upstream connection
    req.on('close', () => {
      logger.info('SSE proxy: client disconnected');
      proxyReq.destroy();
    });

    proxyReq.on('error', (err: Error) => {
      logger.error(`SSE proxy connection error: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({
          error: 'SSE proxy connection failed',
          message: err.message,
        });
      } else {
        res.write(`data: {"error": "${err.message}"}\n\n`);
        res.end();
      }
    });

    proxyReq.end();
  };
}

/**
 * Reads sandboxd configuration from Backstage config.
 */
function readConfig(config: Config): { baseUrl: string; token?: string } {
  const baseUrl = config.getString('sandboxd.baseUrl');
  const token = config.getOptionalString('sandboxd.token');
  return { baseUrl, token };
}
