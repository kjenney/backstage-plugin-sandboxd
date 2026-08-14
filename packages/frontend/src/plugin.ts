import {
  createPlugin,
  createRoutableExtension,
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
 * Root component for the sandboxd plugin.
 *
 * @public
 */
export const SandboxdRoot = sandboxdPlugin.provide(
  createRoutableExtension({
    name: 'SandboxdRoot',
    component: () =>
      import('./components/SandboxdRoot').then(m => m.SandboxdRoot),
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
  }),
);
