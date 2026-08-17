/**
 * Frontend plugin for sandboxd integration in Backstage.
 *
 * @packageDocumentation
 */

export {
  sandboxdPlugin,
  rootRouteRef,
  entityContentRouteRef,
  appStoreRouteRef,
  SandboxdRoot,
  SandboxdContent,
  SandboxdAppStore,
} from './plugin';

// Phase 7: Authentication API hooks — resolve sandboxd identity from Backstage
export {
  useSandboxdAuth,
  useSandboxdApiKey,
  useSandboxdTenantId,
  useSandboxdIsMultiTenant,
} from './components/ApiKeyManagement/ApiKeyApi';
