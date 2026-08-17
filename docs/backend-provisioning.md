# Auto-Provisioning

The `SandboxdProvisioningManager` automatically provisions sandboxes for entities with the `sandboxd.backstage.io/auto-provision: "true"` annotation. It runs as a background service on the backend.

## How It Works

1. **Initial sweep** — On startup, the manager queries all sandboxd-enabled entities and provisions any that need it
2. **Periodic checks** — Every `sandboxd.autoProvision.intervalMs` milliseconds (default: 2 minutes), it re-checks for new entities
3. **Re-provisioning** — If a sandbox was destroyed externally, the manager detects this and re-provisions it

## Provisioning Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Entity has │────▶│  Auto-prov   │────▶│  Sandbox     │
│  annotation │     │  annotation  │     │  exists?     │
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                    ┌────────────┴────────────┐
                                    │                         │
                              Yes ──┤                     No ──┤
                            (skip)   │              (provision)│
                                      │                         │
                                      ▼                         ▼
                                 ┌──────────┐           ┌─────────────┐
                                 │  Done    │           │ Create via  │
                                 │ (next    │           │ sandboxd    │
                                 │ check)   │           │ API         │
                                 └──────────┘           └─────────────┘
```

## Entity Annotation Parsing

The backend mirrors the frontend annotation constants:

```ts
const ANNOTATION_PREFIX = 'sandboxd.backstage.io';

interface ParsedEntityAnnotations {
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

## Status

The provisioning status is exposed via the `/health` endpoint:

```json
{
  "provisioning": {
    "enabled": true,
    "provisionedCount": 3,
    "provisioned": [
      {
        "entityName": "my-web-app",
        "lastProvisionedAt": 1712345678000
      }
    ]
  }
}
```

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `sandboxd.autoProvision.enabled` | `boolean` | `true` | Enable/disable auto-provisioning |
| `sandboxd.autoProvision.intervalMs` | `number` | `120000` | Check interval in milliseconds |

## Disabling Auto-Provisioning

To disable auto-provisioning, set:

```yaml
sandboxd:
  autoProvision:
    enabled: false
```

The provisioning manager will log a message and skip all provisioning checks.
