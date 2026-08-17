# Annotations

The Sandboxd plugin uses Backstage entity annotations to configure sandbox behavior per-entity. All annotations use the prefix `sandboxd.backstage.io/`.

## Available Annotations

| Annotation | Key | Type | Default | Description |
|------------|-----|------|---------|-------------|
| **Sandboxd Enabled** | `sandboxd.backstage.io/sandboxd-enabled` | `string` | — | Set to `"true"` to enable sandboxd for this entity (required) |
| **Runtime** | `sandboxd.backstage.io/runtime` | `string` | — | Runtime identifier (e.g., `node`, `python`) |
| **Memory Limit** | `sandboxd.backstage.io/memory-limit-mb` | `string` (number) | `512` | Memory limit for the sandbox in megabytes |
| **Sleep Timeout** | `sandboxd.backstage.io/sleep-timeout` | `string` (number) | `600` | Idle timeout in seconds before the sandbox goes to sleep |
| **Auto-Provision** | `sandboxd.backstage.io/auto-provision` | `string` | — | Set to `"true"` to automatically provision a sandbox |
| **Agent Model** | `sandboxd.backstage.io/agent-model` | `string` | — | AI agent model (e.g., `gpt-4o`, `claude-3.5`) |
| **App ID** | `sandboxd.backstage.io/app-id` | `string` | — | Sandboxd app identifier (set by entity sync provider) |
| **Preview URL** | `sandboxd.backstage.io/preview-url` | `string` | — | App preview URL (set by entity sync provider) |
| **Status** | `sandboxd.backstage.io/status` | `string` | — | Current app status (set by entity sync provider) |
| **Preset ID** | `sandboxd.backstage.io/preset-id` | `string` | — | Preset that created this app (set by entity sync provider) |

## Example Entity Configuration

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-web-app
  annotations:
    # Required — enables sandboxd integration
    sandboxd.backstage.io/sandboxd-enabled: 'true'

    # Runtime configuration
    sandboxd.backstage.io/runtime: 'node'
    sandboxd.backstage.io/memory-limit-mb: '1024'
    sandboxd.backstage.io/sleep-timeout: '900'

    # AI agent configuration
    sandboxd.backstage.io/agent-model: 'gpt-4o'

    # Auto-provisioning
    sandboxd.backstage.io/auto-provision: 'true'

    # Set by entity sync provider (read-only)
    sandboxd.backstage.io/app-id: 'my-web-app-abc123'
    sandboxd.backstage.io/preview-url: 'https://my-web-app.sandboxd.local'
    sandboxd.backstage.io/status: 'running'
    sandboxd.backstage.io/preset-id: 'react-vite'
spec:
  type: service
  lifecycle: experimental
  owner: my-team
```

## Parsing Annotations

The plugin provides utilities for working with annotations:

```ts
import {
  SANDBOXD_ANNOTATIONS,
  parseSandboxdAnnotations,
  isSandboxdAvailable,
  isSandboxdManagedEntity,
} from '@internal/backstage-plugin-sandboxd-frontend';

// Parse all annotations into a typed config object
const config = parseSandboxdAnnotations(entity.metadata.annotations);
// Returns: SandboxdEntityConfig

// Check if sandboxd is enabled for this entity
const enabled = isSandboxdAvailable(entity.metadata.annotations);

// Check if this entity was auto-provisioned by the entity sync provider
const managed = isSandboxdManagedEntity(entity.metadata.annotations);
```

## Annotation Types

```ts
interface SandboxdEntityConfig {
  enabled: boolean;
  runtime?: string;
  memoryLimitMb?: number;
  sleepTimeout?: number;
  autoProvision?: boolean;
  agentModel?: string;
  appId?: string;
  previewUrl?: string;
  status?: string;
  presetId?: string;
}
```

## Read-Only Annotations

The following annotations are set automatically by the entity sync provider and should not be set manually:

- `sandboxd.backstage.io/app-id` — Set when a sandboxd app is deployed
- `sandboxd.backstage.io/preview-url` — Set during entity reconciliation
- `sandboxd.backstage.io/status` — Updated during entity reconciliation
- `sandboxd.backstage.io/preset-id` — Set when deploying from a preset
