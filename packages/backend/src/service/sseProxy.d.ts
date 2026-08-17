import express from 'express';
import { Config } from '@backstage/config';
/**
 * SSE Proxy handler — forwards Server-Sent Events from sandboxd to Backstage frontend.
 *
 * sandboxd streams agent task progress via SSE. This handler establishes
 * a connection to sandboxd and pipes events through to the Backstage frontend.
 *
 * @param options - Plugin options including Backstage config
 * @returns Express route handler for SSE proxy
 */
export declare function createSseProxyHandler(options: {
    config: Config;
}): express.RequestHandler;
