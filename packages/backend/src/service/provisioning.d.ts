/**
 * Automatic sandbox provisioning service.
 *
 * Watches for Backstage entities with sandboxd annotations and provisions
 * sandboxes accordingly. When a new entity with auto-provision enabled is
 * detected, a sandbox is created via the sandboxd control-plane API.
 */
import { Config } from '@backstage/config';
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
export declare class SandboxdProvisioningManager {
    private logger;
    private config;
    private timer;
    private provisioned;
    constructor(config: Config);
    /**
     * Start the provisioning manager.
     */
    start(): void;
    /**
     * Stop the provisioning manager.
     */
    stop(): void;
    /**
     * Get provisioning status.
     */
    getStatus(): {
        enabled: boolean;
        provisionedCount: number;
        provisioned: ProvisionedEntity[];
    };
    /**
     * Perform a single provisioning check.
     *
     * Queries sandboxd for the list of entities with sandboxd annotations,
     * and provisions any that are not yet provisioned.
     */
    private provisionCheck;
    /**
     * Get entities with sandboxd annotations from the catalog.
     *
     * In a real Backstage deployment, this would query the catalog API.
     * For now, we query the sandboxd control plane to discover entities.
     */
    private getSandboxdEntities;
    /**
     * Check if a sandbox exists for an entity.
     */
    private checkSandboxExists;
    /**
     * Provision a sandbox for an entity.
     */
    private provisionSandbox;
}
export {};
