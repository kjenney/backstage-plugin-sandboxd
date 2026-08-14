import { Entity } from '@backstage/catalog-model';

const SANDBOXD_ANNOTATION = 'sandboxd.backstage.io/sandboxd-enabled';

/**
 * Check if a Backstage entity has the sandboxd annotation.
 *
 * The annotation `sandboxd.backstage.io/sandboxd-enabled` must be set to `true`
 * on the entity metadata for sandboxd features to be available.
 */
export function isSandboxdAvailable(entity: Entity): boolean {
  return (
    !!entity.metadata.annotations?.[SANDBOXD_ANNOTATION] &&
    entity.metadata.annotations[SANDBOXD_ANNOTATION] === 'true'
  );
}
