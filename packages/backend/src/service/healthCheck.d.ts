import { Config } from '@backstage/config';
/**
 * Health check manager for the sandboxd control-plane.
 *
 * Periodically checks if sandboxd is reachable and caches the result.
 */
export declare class SandboxdHealthCheck {
    private logger;
    private baseUrl;
    private intervalMs;
    private timer;
    private healthy;
    private lastCheck;
    private lastResponseTime;
    private error;
    constructor(config: Config);
    /**
     * Start periodic health checks.
     */
    start(): void;
    /**
     * Stop health checks.
     */
    stop(): void;
    /**
     * Get current health status.
     */
    getStatus(): {
        healthy: boolean;
        lastCheck: number | null;
        responseTimeMs: number | null;
        error: string | null;
    };
    /**
     * Perform a single health check against sandboxd.
     */
    private checkHealth;
}
