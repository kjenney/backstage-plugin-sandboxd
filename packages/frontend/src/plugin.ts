import {
  createPlugin,
  createRoutableExtension,
  createRouteRef,
} from '@backstage/core-plugin-api';

/**
 * The sandboxd plugin instance.
 *
 * @public
 */
export const sandboxdPlugin = createPlugin({
  id: 'sandboxd',
  apis: [],
});

/**
 * Route ref for the sandboxd root page.
 *
 * @public
 */
export const rootRouteRef = createRouteRef({
  id: 'sandboxd-root',
});

/**
 * Route ref for the sandboxd entity content page.
 *
 * @public
 */
export const entityContentRouteRef = createRouteRef({
  id: 'sandboxd-entity-content',
});

/**
 * Route ref for the sandboxd App Store page.
 *
 * @public
 */
export const appStoreRouteRef = createRouteRef({
  id: 'sandboxd-app-store',
});

/**
 * Root component for the sandboxd plugin.
 *
 * @public
 */
export const SandboxdRoot = sandboxdPlugin.provide(
  createRoutableExtension({
    name: 'SandboxdRoot',
    component: () =>
      import('./components/SandboxdRoot').then(m => m.SandboxdRoot),
    mountPoint: rootRouteRef,
  }),
);

/**
 * Content component for entity pages.
 *
 * @public
 */
export const SandboxdContent = sandboxdPlugin.provide(
  createRoutableExtension({
    name: 'SandboxdContent',
    component: () =>
      import('./components/SandboxdContent').then(m => m.SandboxdContent),
    mountPoint: entityContentRouteRef,
  }),
);

/**
 * App Store root component — standalone route for browsing and deploying apps.
 *
 * @public
 */
export const SandboxdAppStore = sandboxdPlugin.provide(
  createRoutableExtension({
    name: 'SandboxdAppStore',
    component: () =>
      import('./components/SandboxdAppStore').then(m => m.SandboxdAppStore),
    mountPoint: appStoreRouteRef,
  }),
);
