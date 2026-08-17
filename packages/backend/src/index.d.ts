/**
 * Backend proxy plugin for sandboxd integration.
 *
 * @packageDocumentation
 */
export { sandboxdPlugin as default } from './service/router';
export { sandboxdDeployAction } from './actions/sandboxdDeploy';
export { SandboxdEntityProvider, SandboxdEntitySync, registerCatalogEntity, } from './service/entitySync';
export { SandboxdAuthApi, createSandboxdAuthApi, sandboxdAuthApiRef, sandboxdAuthBackendModule, type ResolvedIdentity, type IdentityClaim, } from './service/auth';
