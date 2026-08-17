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
import { CatalogClient } from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';
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
export declare class SandboxdEntityProvider implements EntityProviderInterface {
    private static readonly PROVIDER_NAME;
    private config;
    private logger;
    private timer;
    constructor(options: {
        config: Config;
        logger?: Console;
    });
    /**
     * Returns the unique provider name for catalog tracking.
     * This is the standard EntityProvider interface method that
     * CatalogBuilder.addEntityProvider() uses to identify the provider.
     */
    getProviderName(): string;
    /**
     * Fetch entities from sandboxd and return them as Backstage entities.
     *
     * This is the standard EntityProvider interface method. When a CatalogBuilder
     * is registered via registerCatalogEntity(), the builder will call this method
     * and write the entities to the catalog automatically.
     */
    provide(): Promise<Entity[]>;
    /**
     * Start the periodic sync loop.
     *
     * This method starts a periodic refresh that fetches entities from
     * sandboxd and provides them to the catalog. If a CatalogBuilder is
     * registered, the builder will handle writing entities. Otherwise,
     * entities are written directly to the catalog API as a fallback.
     */
    start(): void;
    /**
     * Stop the sync loop.
     */
    stop(): void;
    /**
     * Get the provider status (for health checks).
     */
    getStatus(): {
        active: boolean;
        intervalMs: number;
    };
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
export declare function registerCatalogEntity(provider: SandboxdEntityProvider, builder: {
    addEntityProvider: (p: EntityProviderInterface) => void;
}): void;
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
export declare class SandboxdEntitySync {
    private timer;
    private config;
    private catalogClient;
    private logger;
    constructor(options: {
        config: Config;
        catalogClient: CatalogClient;
        logger?: Console;
    });
    /**
     * Start the periodic sync loop.
     */
    start(): void;
    /**
     * Stop the sync loop.
     */
    stop(): void;
    /**
     * Get the sync status (for health checks).
     */
    getStatus(): {
        active: boolean;
        intervalMs: number;
        lastSync?: string;
        lastError?: string;
    };
    /**
     * Perform a single reconciliation pass.
     *
     * Compares sandboxd apps against existing Backstage entities and logs
     * any discrepancies. In production, wire up SandboxdEntityProvider
     * instead to actually create/update entities.
     */
    private sync;
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
export declare function createEntityEndpoint(options: {
    config: Config;
    catalogClient: CatalogClient;
    logger?: Console;
}): any;
export {};
