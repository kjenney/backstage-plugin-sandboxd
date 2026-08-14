/**
 * Automatic sandbox provisioning service.
 *
 * Watches for Backstage entities with sandboxd annotations and provisions
 * sandboxes accordingly. When a new entity with auto-provision enabled is
 * detected, a sandbox is created via the sandboxd control-plane API.
 */

import fetch from 'node-fetch';
import { Config } from '@backstage/config';

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

function readConfig(config: Config): {
  baseUrl: string;
  token?: string;
  autoProvisionEnabled: boolean;
  provisionIntervalMs: number;
} {
  const baseUrl = config.getString('sandboxd.baseUrl');
  const token = config.getOptionalString('sandboxd.token');
  const autoProvisionEnabled =
    config.getOptionalBoolean('sandboxd.autoProvision.enabled') ?? true;
  const provisionIntervalMs =
    config.getOptionalNumber('sandboxd.autoProvision.intervalMs') ?? 120000;
  return { baseUrl, token, autoProvisionEnabled, provisionIntervalMs };
}

/* ------------------------------------------------------------------ */
/*  Entity annotation types (mirrors the frontend annotation constants) */
/* ------------------------------------------------------------------ */

const ANNOTATION_PREFIX = 'sandboxd.backstage.io';

const ANNOTATIONS = {
  sandboxdEnabled: `${ANNOTATION_PREFIX}/sandboxd-enabled`,
  runtime: `${ANNOTATION_PREFIX}/runtime`,
  memoryLimitMb: `${ANNOTATION_PREFIX}/memory-limit-mb`,
  sleepTimeout: `${ANNOTATION_PREFIX}/sleep-timeout`,
  autoProvision: `${ANNOTATION_PREFIX}/auto-provision`,
  agentModel: `${ANNOTATION_PREFIX}/agent-model`,
};

interface EntitySandboxConfig {
  enabled: boolean;
  autoProvision: boolean;
  runtime: string | undefined;
  memoryLimitMb: number | undefined;
  sleepTimeout: number | undefined;
  agentModel: string | undefined;
}

function parseEntityAnnotations(
  annotations?: Record<string, string>,
): EntitySandboxConfig {
  if (!annotations) {
    return {
      enabled: false,
      autoProvision: false,
      runtime: undefined,
      memoryLimitMb: undefined,
      sleepTimeout: undefined,
      agentModel: undefined,
    };
  }
  return {
    enabled: annotations[ANNOTATIONS.sandboxdEnabled] === 'true',
    autoProvision: annotations[ANNOTATIONS.autoProvision] === 'true',
    runtime: annotations[ANNOTATIONS.runtime],
    memoryLimitMb:
      annotations[ANNOTATIONS.memoryLimitMb]
        ? Number(annotations[ANNOTATIONS.memoryLimitMb])
        : undefined,
    sleepTimeout:
      annotations[ANNOTATIONS.sleepTimeout]
        ? Number(annotations[ANNOTATIONS.sleepTimeout])
        : undefined,
    agentModel: annotations[ANNOTATIONS.agentModel],
  };
}

/* ------------------------------------------------------------------ */
/*  Sandboxd API client                                                */
/* ------------------------------------------------------------------ */

async function sandboxdApi<T>(
  baseUrl: string,
  token: string | undefined,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${baseUrl}/v1/${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `sandboxd API ${method} ${path} returned ${res.status}: ${text}`,
    );
  }

  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Provisioning manager                                               */
/* ------------------------------------------------------------------ */

interface ProvisionedEntity {
  entityName: string;
  lastProvisionedAt: number;
}

/**
 * Manages automatic sandbox provisioning for entities with sandboxd annotations.
 *
 * On startup, performs an initial provisioning sweep. Then periodically
 * re-checks for new entities that need sandboxes.
 */
export class SandboxdProvisioningManager {
  private logger = console;
  private config: ReturnType<typeof readConfig>;
  private timer: NodeJS.Timer | null = null;
  private provisioned: Map<string, ProvisionedEntity> = new Map();

  constructor(config: Config) {
    this.config = readConfig(config);
  }

  /**
   * Start the provisioning manager.
   */
  start(): void {
    if (!this.config.autoProvisionEnabled) {
      this.logger.info(
        'Sandboxd auto-provisioning is disabled in config',
      );
      return;
    }

    this.logger.info(
      `Sandboxd auto-provisioning started (interval: ${this.config.provisionIntervalMs}ms)`,
    );

    // Initial sweep
    this.provisionCheck();

    // Periodic checks
    this.timer = setInterval(
      () => this.provisionCheck(),
      this.config.provisionIntervalMs,
    );
  }

  /**
   * Stop the provisioning manager.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Get provisioning status.
   */
  getStatus(): {
    enabled: boolean;
    provisionedCount: number;
    provisioned: ProvisionedEntity[];
  } {
    return {
      enabled: this.config.autoProvisionEnabled,
      provisionedCount: this.provisioned.size,
      provisioned: Array.from(this.provisioned.values()),
    };
  }

  /**
   * Perform a single provisioning check.
   *
   * Queries sandboxd for the list of entities with sandboxd annotations,
   * and provisions any that are not yet provisioned.
   */
  private async provisionCheck(): Promise<void> {
    try {
      // Query the backend's own /v1/entities endpoint to get sandboxd-enabled entities
      // This endpoint is handled by the router — we call it locally
      const entities = await this.getSandboxdEntities();

      for (const entity of entities) {
        const config = parseEntityAnnotations(entity.annotations);

        if (!config.enabled) continue;

        // Only auto-provision if the annotation is set
        if (!config.autoProvision) continue;

        const entityName = entity.name;

        // Skip if already provisioned and sandbox still exists
        if (this.provisioned.has(entityName)) {
          const existing = await this.checkSandboxExists(entityName);
          if (existing) {
            continue;
          }
          // Sandbox was destroyed externally — re-provision
          this.logger.info(
            `Sandbox for ${entityName} was destroyed externally, re-provisioning`,
          );
        }

        await this.provisionSandbox(entityName, config);
      }
    } catch (err) {
      this.logger.error(`Provisioning check failed: ${(err as Error).message}`);
    }
  }

  /**
   * Get entities with sandboxd annotations from the catalog.
   *
   * In a real Backstage deployment, this would query the catalog API.
   * For now, we query the sandboxd control plane to discover entities.
   */
  private async getSandboxdEntities(): Promise<
    Array<{ name: string; annotations?: Record<string, string> }>
  > {
    try {
      const entities = await sandboxdApi<
        Array<{ name: string; annotations?: Record<string, string> }>
      >(
        this.config.baseUrl,
        this.config.token,
        'GET',
        'entities',
      );
      return entities;
    } catch {
      // If the entities endpoint doesn't exist yet, return empty
      return [];
    }
  }

  /**
   * Check if a sandbox exists for an entity.
   */
  private async checkSandboxExists(entityName: string): Promise<boolean> {
    try {
      await sandboxdApi<object>(
        this.config.baseUrl,
        this.config.token,
        'GET',
        `entities/${entityName}/sandbox`,
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Provision a sandbox for an entity.
   */
  private async provisionSandbox(
    entityName: string,
    config: EntitySandboxConfig,
  ): Promise<void> {
    const body: Record<string, unknown> = {
      runtime: config.runtime ?? 'node',
    };

    if (config.memoryLimitMb) {
      body.memoryLimitMb = config.memoryLimitMb;
    }
    if (config.sleepTimeout) {
      body.sleepTimeout = config.sleepTimeout;
    }
    if (config.agentModel) {
      body.agentModel = config.agentModel;
    }

    try {
      await sandboxdApi<object>(
        this.config.baseUrl,
        this.config.token,
        'POST',
        `entities/${entityName}/sandbox`,
        body,
      );

      this.provisioned.set(entityName, {
        entityName,
        lastProvisionedAt: Date.now(),
      });

      this.logger.info(`Provisioned sandbox for entity: ${entityName}`);
    } catch (err) {
      this.logger.error(
        `Failed to provision sandbox for ${entityName}: ${(err as Error).message}`,
      );
    }
  }
}
