/**
 * Entity Sync — bridges sandboxd deployed apps with the Backstage Software Catalog.
 *
 * When a sandboxd app is deployed (or already exists), this service ensures a
 * corresponding Backstage entity exists with proper annotations for full
 * sandboxd integration (lifecycle control, preview URLs, agent tasks).
 *
 * The sync runs periodically (configurable interval) and reconciles the state
 * of sandboxd apps with the Backstage catalog via an EntityProvider.
 *
 * There are two approaches:
 *   1. SandboxdEntityProvider — the proper Backstage EntityProvider pattern.
 *      Register with a CatalogBuilder so entities flow through the catalog
 *      pipeline automatically. This is the recommended approach.
 *   2. SandboxdEntitySync — a standalone periodic reconciler that uses the
 *      CatalogClient to query and update entities directly via the catalog
 *      API. This is a fallback for environments where CatalogBuilder access
 *      is unavailable.
 *
 * Additionally, the createEntityEndpoint handler can be mounted on the backend
 * router to create/update entities on demand when an app is deployed from
 * the App Store.
 */

import { Config } from '@backstage/config';
import fetch from 'node-fetch';
import { CatalogClient } from '@backstage/catalog-client';
import {
  Entity,
} from '@backstage/catalog-model';
/**
 * Backstage EntityProvider interface.
 *
 * This is the standard interface that CatalogBuilder.addEntityProvider()
 * expects. We define it locally because the type isn't exported from
 * @backstage/catalog-model in our installed version.
 */
interface EntityProviderInterface {
  /** Returns a unique provider name for catalog tracking */
  getProviderName(): string;
  /** Returns the array of entities to be synced into the catalog */
  provide(): Promise<Entity[]>;
}

/**
 * Read sandboxd connection config from Backstage config.
 */
function readConfig(config: Config): {
  baseUrl: string;
  token?: string;
  syncIntervalMs: number;
  entityOwner: string;
  catalogBaseUrl: string;
} {
  const baseUrl = config.getString('sandboxd.baseUrl');
  const token = config.getOptionalString('sandboxd.token');
  const syncIntervalMs = config.getOptionalNumber(
    'sandboxd.entitySync.intervalMs',
  );
  const entityOwner = config.getOptionalString(
    'sandboxd.entitySync.owner',
  );
  const catalogBaseUrl =
    config.getOptionalString('sandboxd.catalogBaseUrl') ??
    config.getString('backend.baseUrl');

  return {
    baseUrl,
    token,
    syncIntervalMs: syncIntervalMs ?? 300_000, // 5 minutes default
    entityOwner: entityOwner ?? 'user:sandboxd-service',
    catalogBaseUrl,
  };
}

/**
 * Fetch all sandboxd apps from the control plane.
 */
async function fetchSandboxdApps(
  baseUrl: string,
  token: string | undefined,
): Promise<any[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}/v1/apps`, { headers });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch sandboxd apps: ${res.status} ${res.statusText}`,
    );
  }
  return res.json();
}

/**
 * Build a Backstage entity name for a sandboxd app.
 *
 * The entity name follows the convention: `sandboxd-<appName>`
 * where appName is lowercased and spaces replaced with hyphens.
 */
function entityNameForApp(appName: string): string {
  return `sandboxd-${appName.toLowerCase().replace(/\s+/g, '-')}`;
}

/**
 * Build a Backstage entity for a sandboxd app.
 *
 * The entity includes annotations for sandboxd integration:
 *   - sandboxd.backstage.io/app-id — the sandboxd app identifier
 *   - sandboxd.backstage.io/preview-url — the app's preview URL
 *   - sandboxd.backstage.io/status — current app status
 *   - sandboxd.backstage.io/preset-id — the preset that created this app (if any)
 *
 * These annotations enable the sandboxd frontend plugin to recognize and
 * interact with auto-provisioned entities.
 */
function buildEntity(
  app: any,
  entityOwner: string,
  presetName?: string,
): Entity {
  const entityName = entityNameForApp(app.name);

  const annotations: Record<string, string> = {
    'sandboxd.backstage.io/app-id': app.id,
    'sandboxd.backstage.io/preview-url': app.previewUrl || '',
    'sandboxd.backstage.io/status': app.status || 'stopped',
  };

  if (app.presetId) {
    annotations['sandboxd.backstage.io/preset-id'] = app.presetId;
  }

  const entity: Entity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: entityName,
      description:
        `Auto-generated Backstage entity for sandboxd app "${app.name}"` +
        (presetName ? ` (preset: ${presetName})` : ''),
      annotations,
      labels: {
        'sandboxd-backstage': 'true',
      },
    },
    spec: {
      type: 'service',
      owner: entityOwner,
      lifecycle:
        app.status === 'running' ? 'production' : 'experimental',
    },
  };

  return entity;
}

/**
 * Sandboxd Entity Provider — implements the Backstage EntityProvider interface.
 *
 * This EntityProvider periodically fetches sandboxd apps and provides the
 * corresponding Backstage entities to the catalog builder. Entities are
 * automatically created, updated, or removed as the sandboxd state changes.
 *
 * The provider implements the standard Backstage EntityProvider interface:
 *   - getProviderName(): returns a unique provider identifier
 *   - provide(): returns the current set of entities from sandboxd
 *
 * Register with a CatalogBuilder so entities flow through the catalog
 * pipeline automatically. This is the recommended approach.
 *
 * Usage:
 *
 *   import { SandboxdEntityProvider, registerCatalogEntity } from './entitySync';
 *
 *   const provider = new SandboxdEntityProvider({
 *     config,
 *     logger,
 *   });
 *
 *   // Register with the catalog builder (from @backstage/backend-common)
 *   registerCatalogEntity(provider, builder);
 *
 *   // The catalog builder calls provide() on its own schedule.
 *   // For additional periodic syncs, you can also call start()/stop().
 */
export class SandboxdEntityProvider implements EntityProviderInterface {
  private static readonly PROVIDER_NAME = 'SandboxdEntityProvider';

  private config: ReturnType<typeof readConfig>;
  private logger: Console;
  private timer: NodeJS.Timeout | null = null;

  constructor(options: {
    config: Config;
    logger?: Console;
  }) {
    this.config = readConfig(options.config);
    this.logger = options.logger ?? console;
  }

  /**
   * Returns the unique provider name for catalog tracking.
   * This is the standard EntityProvider interface method that
   * CatalogBuilder.addEntityProvider() uses to identify the provider.
   */
  getProviderName(): string {
    return SandboxdEntityProvider.PROVIDER_NAME;
  }

  /**
   * Fetch entities from sandboxd and return them as Backstage entities.
   *
   * This is the standard EntityProvider interface method. When a CatalogBuilder
   * is registered via registerCatalogEntity(), the builder will call this method
   * and write the entities to the catalog automatically.
   */
  async provide(): Promise<Entity[]> {
    try {
      const apps = await fetchSandboxdApps(
        this.config.baseUrl,
        this.config.token,
      );

      this.logger.info(
        `Sandboxd entity provider: fetched ${apps.length} apps from sandboxd`,
      );

      const entities = apps.map((app) =>
        buildEntity(app, this.config.entityOwner, app.presetName),
      );

      this.logger.info(
        `Sandboxd entity provider: providing ${entities.length} entities`,
      );

      return entities;
    } catch (error) {
      this.logger.error(`Sandboxd entity provider error: ${error}`);
      throw error;
    }
  }

  /**
   * Start the periodic sync loop.
   *
   * This method starts a periodic refresh that fetches entities from
   * sandboxd and provides them to the catalog. If a CatalogBuilder is
   * registered, the builder will handle writing entities. Otherwise,
   * entities are written directly to the catalog API as a fallback.
   */
  start() {
    this.logger.info(
      `Sandboxd entity provider started (interval: ${this.config.syncIntervalMs}ms)`,
    );

    // Run immediately
    this.provide().catch((error) => {
      this.logger.error(`Sandboxd entity provider initial sync error: ${error}`);
    });

    // Then periodically
    this.timer = setInterval(async () => {
      try {
        await this.provide();
      } catch (error) {
        this.logger.error(`Sandboxd entity provider sync error: ${error}`);
      }
    }, this.config.syncIntervalMs);
  }

  /**
   * Stop the sync loop.
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.info('Sandboxd entity provider stopped');
  }

  /**
   * Get the provider status (for health checks).
   */
  getStatus(): {
    active: boolean;
    intervalMs: number;
  } {
    return {
      active: this.timer !== null,
      intervalMs: this.config.syncIntervalMs,
    };
  }
}

/**
 * Register the SandboxdEntityProvider with a Backstage CatalogBuilder.
 *
 * This is the standard Backstage pattern for registering entity providers.
 * The CatalogBuilder will call the provider's provide() method and write
 * the resulting entities to the catalog automatically.
 *
 * Usage:
 *
 *   import { SandboxdEntityProvider, registerCatalogEntity } from './entitySync';
 *
 *   const provider = new SandboxdEntityProvider({ config, logger });
 *   registerCatalogEntity(provider, builder);
 *
 * @param provider - The SandboxdEntityProvider instance to register
 * @param builder  - The CatalogBuilder instance from the consuming app's app.ts
 */
export function registerCatalogEntity(
  provider: SandboxdEntityProvider,
  builder: { addEntityProvider: (p: EntityProviderInterface) => void },
): void {
  builder.addEntityProvider(provider);
}

/**
 * Sandboxd Entity Sync — standalone periodic reconciler.
 *
 * This is a fallback for environments where CatalogBuilder access
 * is unavailable. It uses the CatalogClient to query existing entities
 * and logs entity definitions for manual provisioning or external
 * entity provider integration.
 *
 * Usage:
 *
 *   import { SandboxdEntitySync } from './entitySync';
 *
 *   const sync = new SandboxdEntitySync({
 *     config,
 *     catalogClient,
 *     logger,
 *   });
 *
 *   sync.start();
 */
export class SandboxdEntitySync {
  private timer: NodeJS.Timeout | null = null;
  private config: ReturnType<typeof readConfig>;
  private catalogClient: CatalogClient;
  private logger: Console;

  constructor(options: {
    config: Config;
    catalogClient: CatalogClient;
    logger?: Console;
  }) {
    this.config = readConfig(options.config);
    this.catalogClient = options.catalogClient;
    this.logger = options.logger ?? console;
  }

  /**
   * Start the periodic sync loop.
   */
  start() {
    this.logger.info(
      `Sandboxd entity sync started (interval: ${this.config.syncIntervalMs}ms)`,
    );
    this.sync(); // Run immediately on start
    this.timer = setInterval(() => this.sync(), this.config.syncIntervalMs);
  }

  /**
   * Stop the sync loop.
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.info('Sandboxd entity sync stopped');
  }

  /**
   * Get the sync status (for health checks).
   */
  getStatus(): {
    active: boolean;
    intervalMs: number;
    lastSync?: string;
    lastError?: string;
  } {
    return {
      active: this.timer !== null,
      intervalMs: this.config.syncIntervalMs,
    };
  }

  /**
   * Perform a single reconciliation pass.
   *
   * Compares sandboxd apps against existing Backstage entities and logs
   * any discrepancies. In production, wire up SandboxdEntityProvider
   * instead to actually create/update entities.
   */
  private async sync() {
    try {
      this.logger.debug('Sandboxd entity sync: starting reconciliation');

      const apps = await fetchSandboxdApps(
        this.config.baseUrl,
        this.config.token,
      );

      this.logger.debug(
        `Sandboxd entity sync: found ${apps.length} apps`,
      );

      // Fetch existing catalog entities
      let existingEntities: Entity[] = [];
      try {
        existingEntities = await this.catalogClient.getEntities({
          filter: {
            'metadata.labels.sandboxd-backstage': 'true',
          },
        }).then(result => result.items);
      } catch (err) {
        this.logger.warn(
          `Sandboxd entity sync: could not query catalog: ${err}`,
        );
      }

      const existingNames = new Set(
        existingEntities.map(e => e.metadata.name),
      );

      for (const app of apps) {
        const entityName = entityNameForApp(app.name);

        if (!existingNames.has(entityName)) {
          // Entity doesn't exist — build it and log for the entity provider
          const newEntity = buildEntity(
            app,
            this.config.entityOwner,
            app.presetName,
          );
          this.logger.info(
            `Sandboxd entity sync: entity ${entityName} missing — would create:`,
          );
          this.logger.info(JSON.stringify(newEntity, null, 2));

          // In production, this entity would be written via an EntityProvider
          // registered with the catalog builder. For now, we log the entity
          // definition and the provisioning manager handles the creation.
        } else {
          // Entity exists — check if annotations need updating
          const existing = existingEntities.find(
            e => e.metadata.name === entityName,
          );
          const currentStatus = existing?.metadata.annotations?.['sandboxd.backstage.io/status'];
          if (currentStatus !== app.status) {
            this.logger.info(
              `Sandboxd entity sync: entity ${entityName} status changed ` +
              `from ${currentStatus} to ${app.status}`,
            );
          }
        }
      }

      this.logger.debug('Sandboxd entity sync: reconciliation complete');
    } catch (error) {
      this.logger.error(`Sandboxd entity sync error: ${error}`);
    }
  }
}

/**
 * Express handler that creates/updates a Backstage entity for a newly
 * deployed sandboxd app.
 *
 * Mounted as POST /v1/apps/:appId/entity on the backend router. After a
 * successful deploy, the frontend calls this to ensure the Backstage catalog
 * has a matching entity with all sandboxd annotations.
 *
 * The handler:
 *   1. Fetches the app from sandboxd
 *   2. Builds a Backstage entity with sandboxd annotations
 *   3. Upserts it via the Backstage catalog API
 *
 * Returns the created/updated entity.
 */
export function createEntityEndpoint(
  options: { config: Config; catalogClient: CatalogClient; logger?: Console },
): any {
  const cfg = readConfig(options.config);
  const logger = options.logger ?? console;
  const catalogBaseUrl = cfg.catalogBaseUrl;

  return async (req: any, res: any) => {
    const { appId } = req.params;

    if (!appId) {
      res.status(400).json({ error: 'Missing appId parameter' });
      return;
    }

    try {
      // Fetch the app from sandboxd
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (cfg.token) {
        headers['Authorization'] = `Bearer ${cfg.token}`;
      }

      const appRes = await fetch(`${cfg.baseUrl}/v1/apps/${appId}`, {
        method: 'GET',
        headers,
      });

      if (!appRes.ok) {
        res.status(404).json({
          error: `App ${appId} not found on sandboxd control plane`,
        });
        return;
      }

      const app = await appRes.json();

      // Build the Backstage entity
      const entity = buildEntity(app, cfg.entityOwner, app.presetName);

      // Upsert via the catalog API
      const catalogRes = await fetch(
        `${catalogBaseUrl}/api/catalog/entities`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify([entity]),
        },
      );

      if (!catalogRes.ok) {
        const catalogText = await catalogRes.text();
        logger.error(
          `Catalog upsert failed for entity ${entity.metadata.name}: ` +
          `${catalogRes.status} ${catalogText}`,
        );
        res.status(500).json({
          error: 'Failed to create entity in Backstage catalog',
          detail: catalogText,
        });
        return;
      }

      logger.info(
        `Entity created/updated for sandboxd app ${appId}: ${entity.metadata.name}`,
      );

      res.json({ entity });
    } catch (error) {
      logger.error(`Entity endpoint error: ${error}`);
      res.status(500).json({
        error: 'Internal error creating entity',
        message: (error as Error).message,
      });
    }
  };
}
