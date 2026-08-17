import { Entity } from '@backstage/catalog-model';
/**
 * Check if a Backstage entity has the sandboxd annotation.
 *
 * The annotation `sandboxd.backstage.io/sandboxd-enabled` must be set to `true`
 * on the entity metadata for sandboxd features to be available.
 */
export declare function isSandboxdAvailable(entity: Entity): boolean;
