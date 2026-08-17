# Scaffolder Action

The **Sandboxd Deploy Scaffolder Action** (`sandboxd:deploy`) is a custom Backstage Software Template action for deploying sandboxd apps from presets and creating the corresponding Backstage entity in one step.

## Overview

This action can be used in Backstage Software Templates to:

1. **Deploy an app** to sandboxd from a preset
2. **Create a Backstage entity** with the correct sandboxd annotations
3. **Return the app ID**, entity reference, and preview URL as template outputs

## Action ID

```
sandboxd:deploy
```

## Usage in Templates

```yaml
- id: deploy
  name: Deploy to sandboxd
  action: sandboxd:deploy
  input:
    name: my-app
    presetId: react-vite
    manifest:
      runtime: node
      memoryLimitMb: 512
```

## Input Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | `string` | Yes | — | Name of the app to deploy |
| `presetId` | `string` | No | — | sandboxd preset ID to deploy from |
| `manifest` | `object` | No | — | Optional runtime manifest (sandbox.yaml) overrides |
| `createEntity` | `boolean` | No | `true` | Create a corresponding Backstage entity after deploy |

## Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `appId` | `string` | The sandboxd app ID |
| `entityRef` | `string` | The Backstage entity reference (`component:default/sandboxd-<name>`) |
| `previewUrl` | `string` | The app preview URL (only present if the app has a preview URL) |

## Example Template Step

```yaml
- id: deploy-sandboxd
  name: Deploy to sandboxd
  action: sandboxd:deploy
  input:
    name: ${{ parameters.name }}
    presetId: ${{ parameters.presetId }}
    createEntity: true
  timeout: 120000

- id: show-output
  name: Show deployment info
  action: log:info
  input:
    message: |
      App deployed with ID: ${{ steps.deploy-sandboxd.output.appId }}
      Entity reference: ${{ steps.deploy-sandboxd.output.entityRef }}
      Preview URL: ${{ steps.deploy-sandboxd.output.previewUrl }}
```

## Implementation

The action uses the sandboxd backend proxy (`/api/sandboxd/v1/*`) to communicate with sandboxd:

```ts
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { JsonObject } from '@backstage/types';

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
  // ... schema and handler
});
```

## Entity Creation

By default, the action creates a corresponding Backstage entity after deploying the app. The entity follows the naming convention `sandboxd-<name>` and includes all sandboxd annotations (app-id, preview-url, status, preset-id).

If `createEntity: false`, the entity creation step is skipped. This is useful when the entity sync provider will handle entity creation on the next periodic sync.

Entity creation failure is **non-fatal** — if the entity creation fails, a warning is logged but the deployment still succeeds. The entity sync provider will pick up the entity on the next periodic sync.

## Import

The action is re-exported from the frontend package for convenience:

```ts
// Backend package
import { sandboxdDeployAction } from '@internal/backstage-plugin-sandboxd-backend';

// Frontend package (re-export)
import { sandboxdDeployAction } from '@internal/backstage-plugin-sandboxd-frontend';
```
