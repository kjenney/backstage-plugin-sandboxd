# Backend Plugin

The backend package (`@internal/backstage-plugin-sandboxd-backend`) provides the Express router, proxy handlers, health checking, auto-provisioning, entity sync, and SSE streaming for the sandboxd integration.

## Architecture

The backend plugin has four main subsystems:

```
┌─────────────────────────────────────────────────┐
│              Backend Plugin                      │
│                                                 │
│  ┌──────────┐  ┌──────────────┐                 │
│  │ Router & │  │  SSE Proxy   │                 │
│  │ API      │  │              │                 │
│  │ Proxy    │  └──────────────┘                 │
│  └──────────┘  ┌──────────────┐                 │
│                │ Entity Sync  │                 │
│                └──────────────┘                 │
│                ┌──────────────┐                 │
│                │  Provision   │                 │
│                └──────────────┘                 │
│                                                 │
│  ┌──────────┐                                  │
│  │ Health   │                                  │
│  │ Check    │                                  │
│  └──────────┘                                  │
└─────────────────────────────────────────────────┘
```

## Public Exports

```ts
// Main router
import sandboxdPlugin from '@internal/backstage-plugin-sandboxd-backend';

// Scaffolder action
import { sandboxdDeployAction } from '@internal/backstage-plugin-sandboxd-backend';
```

## Initialization

When the router is created, it starts three background services:

1. **HealthCheck** — Periodic health checks against the sandboxd control plane
2. **ProvisioningManager** — Auto-provisioning for annotated entities
3. **EntityProvider** — Reconciliation of sandboxd apps with Backstage catalog

All three are started automatically and stopped when the router is torn down.

## Route Priority

Express route matching is order-dependent. The router is configured with the following priority:

1. **`GET /health`** — Health check endpoint
2. **`GET /v1/tasks/:taskId/stream`** — SSE proxy (must match before wildcard)
3. **Entity lifecycle endpoints** — `POST /v1/entities/:entityName/sandbox/{destroy,sleep,wake}`
4. **Agent task endpoints** — CRUD + cancel/undo
5. **Agent credential endpoints** — List/update/add/remove
6. **App Store endpoints** — Deploy/validate/manifest/detect/entity
7. **`ALL /v1/*`** — General API proxy (catch-all)

## Configuration

The backend reads the following from `app-config.yaml`:

| Key | Type | Required | Default | Description |
|-----|------|----------|---------|-------------|
| `sandboxd.baseUrl` | `string` | Yes | — | sandboxd control-plane URL |
| `sandboxd.token` | `string` | No | — | API token for sandboxd auth |
| `sandboxd.catalogBaseUrl` | `string` | No | `backend.baseUrl` | Backstage catalog API URL |
| `sandboxd.healthCheckInterval` | `number` | No | `30000` | Health check interval in ms |
| `sandboxd.autoProvision.enabled` | `boolean` | No | `true` | Enable auto-provisioning |
| `sandboxd.autoProvision.intervalMs` | `number` | No | `120000` | Provisioning check interval |
