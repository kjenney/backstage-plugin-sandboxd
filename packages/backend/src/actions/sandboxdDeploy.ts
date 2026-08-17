/**
 * Custom scaffolder action for deploying sandboxd apps from presets.
 *
 * This action can be used in Backstage Software Templates to deploy an app
 * to sandboxd and create the corresponding Backstage entity in one step.
 *
 * Usage in template.yaml:
 *
 *   - id: deploy
 *     name: Deploy to sandboxd
 *     action: sandboxd:deploy
 *     input:
 *       name: my-app
 *       presetId: react-vite
 *       manifest:
 *         runtime: node
 *         memoryLimitMb: 512
 *
 * The action returns the app ID and entity reference as output.
 */

import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { JsonObject } from '@backstage/types';

const API_BASE = '/api/sandboxd/v1';

async function sandboxdFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Sandboxd API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const sandboxdDeployAction = createTemplateAction<
  JsonObject & {
    name: string;
    presetId?: string;
    manifest?: JsonObject;
    createEntity?: boolean;
  },
  JsonObject & {
    appId: string;
    entityRef: string;
    previewUrl: string;
  }
>({
  id: 'sandboxd:deploy',
  description:
    'Deploy an app to sandboxd from a preset and create the corresponding Backstage entity.',
  schema: {
    input: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          description: 'Name of the app to deploy',
        },
        presetId: {
          type: 'string',
          description: 'sandboxd preset ID to deploy from',
        },
        manifest: {
          type: 'object',
          description: 'Optional runtime manifest (sandbox.yaml) overrides',
        },
        createEntity: {
          type: 'boolean',
          description: 'Create a corresponding Backstage entity after deploy',
          default: true,
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        appId: {
          type: 'string',
          description: 'The sandboxd app ID',
        },
        entityRef: {
          type: 'string',
          description: 'The Backstage entity reference (component:default/sandboxd-<name>)',
        },
        previewUrl: {
          type: 'string',
          description: 'The app preview URL',
        },
      },
    },
  },
  handler: async ({ input, output }) => {
    const { name, presetId, manifest, createEntity } = input;

    if (!name) {
      throw new Error('The "name" input is required');
    }

    // Deploy the app to sandboxd
    const app = await sandboxdFetch<{
      id: string;
      name: string;
      status?: string;
      previewUrl?: string;
    }>('/apps', {
      method: 'POST',
      body: JSON.stringify({
        name,
        presetId,
        manifest,
      }),
    });

    output('appId', app.id);

    // Create the corresponding Backstage entity
    if (createEntity !== false) {
      try {
        await sandboxdFetch<{ entity: unknown }>(
          `/apps/${app.id}/entity`,
          {
            method: 'POST',
          },
        );

        const entityName = `sandboxd-${(name as string)
          .toLowerCase()
          .replace(/\s+/g, '-')}`;
        output('entityRef', `component:default/${entityName}`);
      } catch (err) {
        // Entity creation failure is non-fatal — the entity sync provider
        // will pick up the entity on the next periodic sync
        console.warn(
          'Failed to create Backstage entity for deployed app:',
          (err as Error).message,
        );
      }
    }

    if (app.previewUrl) {
      output('previewUrl', app.previewUrl);
    }
  },
});
