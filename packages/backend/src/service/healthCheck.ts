import { createLogger } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import * as http from 'http';

/**
 * Health check manager for the sandboxd control-plane.
 *
 * Periodically checks if sandboxd is reachable and caches the result.
 */
export class SandboxdHealthCheck {
  private logger = createLogger();
  private baseUrl: string;
  private intervalMs: number;
  private timer: NodeJS.Timer | null = null;
  private healthy = false;
  private lastCheck: number | null = null;
  private lastResponseTime: number | null = null;
  private error: string | null = null;

  constructor(config: Config) {
    this.baseUrl = config.getString('sandboxd.baseUrl');
    this.intervalMs = config.getOptionalNumber('sandboxd.healthCheckInterval') ?? 30000;
  }

  /**
   * Start periodic health checks.
   */
  start(): void {
    this.checkHealth();
    this.timer = setInterval(() => {
      this.checkHealth();
    }, this.intervalMs);

    this.logger.info(
      `Sandboxd health check started (interval: ${this.intervalMs}ms)`,
    );
  }

  /**
   * Stop health checks.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Get current health status.
   */
  getStatus(): {
    healthy: boolean;
    lastCheck: number | null;
    responseTimeMs: number | null;
    error: string | null;
  } {
    return {
      healthy: this.healthy,
      lastCheck: this.lastCheck,
      responseTimeMs: this.lastResponseTime,
      error: this.error,
    };
  }

  /**
   * Perform a single health check against sandboxd.
   */
  private checkHealth = (): void => {
    const startTime = Date.now();

    const req = http.get(
      {
        hostname: new URL(this.baseUrl).hostname,
        port: new URL(this.baseUrl).port,
        path: '/health',
        method: 'GET',
        timeout: 5000,
      },
      (res) => {
        const elapsed = Date.now() - startTime;
        this.healthy = res.statusCode === 200;
        this.lastCheck = Date.now();
        this.lastResponseTime = elapsed;
        this.error = null;

        if (!this.healthy) {
          this.logger.warn(
            `Sandboxd health check failed: status ${res.statusCode} (${elapsed}ms)`,
          );
        }

        // Consume response data to free up memory
        res.resume();
      },
    );

    req.on('error', (err: Error) => {
      const elapsed = Date.now() - startTime;
      this.healthy = false;
      this.lastCheck = Date.now();
      this.lastResponseTime = elapsed;
      this.error = err.message;
      this.logger.error(
        `Sandboxd health check error: ${err.message} (${elapsed}ms)`,
      );
    });

    req.on('timeout', () => {
      const elapsed = Date.now() - startTime;
      this.healthy = false;
      this.lastCheck = Date.now();
      this.lastResponseTime = elapsed;
      this.error = 'Health check timeout';
      this.logger.error(`Sandboxd health check timed out (${elapsed}ms)`);
      req.destroy();
    });
  };
}
