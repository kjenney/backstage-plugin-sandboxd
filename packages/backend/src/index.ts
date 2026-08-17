/**
 * Backend proxy plugin for sandboxd integration.
 *
 * @packageDocumentation
 */

export { sandboxdPlugin as default } from './service/router';

// Phase 6: Scaffolder action — deploy sandboxd apps from Backstage templates
export { sandboxdDeployAction } from './actions/sandboxdDeploy';

// Phase 3: Entity Sync — register the SandboxdEntityProvider with Backstage Catalog
export {
  SandboxdEntityProvider,
  SandboxdEntitySync,
  registerCatalogEntity,
} from './service/entitySync';

// Phase 7: Authentication API — register the SandboxdAuthApi as a Backstage API
export {
  SandboxdAuthApi,
  createSandboxdAuthApi,
  sandboxdAuthApiRef,
  sandboxdAuthBackendModule,
  type ResolvedIdentity,
  type IdentityClaim,
} from './service/auth';
