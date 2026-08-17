# Architecture

## High-Level Design

The Sandboxd plugin follows the standard Backstage plugin architecture with a frontend React package and a backend Express plugin. All API traffic flows through the backend proxy — the frontend never communicates directly with sandboxd.

```
┌─────────────────────────────────────────────────┐
│                 Backstage Frontend               │
│  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ AppCard  │ │ CodeEdit │ │  Agent Tasks   │  │
│  │ Terminal │ │ AppStore │ │  Credentials   │  │
│  └──────────┘ └──────────┘ └────────────────┘  │
│         │              │              │          │
│         └──────────────┼──────────────┘          │
│                    /api/sandboxd/v1/*             │
└────────────────────────┬──────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────┐
│              Backstage Backend                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Router & │ │  SSE     │ │  Entity Sync &   │  │
│  │ Proxy    │ │  Proxy   │ │  Auto-Provision  │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
│         │              │              │           │
│         └──────────────┼──────────────┘           │
│                    /v1/* (proxy)                   │
└────────────────────────┬───────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────┐
│              sandboxd Control Plane                 │
│  (Go service, default port 9090)                    │
└─────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Rebuild vs. Fork

The sandboxd console is a React SPA with its own routing, theming, and state management. Rather than fork it, the plugin was rebuilt from scratch as Backstage-native components. See [ADR-001](adr/adr-001-fork-vs-rebuild.md) for the full rationale.

Key benefits of the rebuild approach:

- **Entity context** — Components use `useEntity()` to access Backstage entity metadata natively
- **Theming** — Full integration with Backstage's Material UI theme system
- **Plugin lifecycle** — Proper registration, router setup, and route discovery
- **Bundle size** — No dead code from the standalone SPA (auth screens, splash pages)
- **Maintenance** — No fork drift or cherry-pick burden

### Backend Proxy Pattern

All API calls flow through the backend plugin at `/api/sandboxd/v1/*`. This means:

- The frontend never handles sandboxd credentials
- Authentication tokens are injected server-side
- CORS is not an issue (same-origin requests)
- The backend can add middleware for logging, rate limiting, or authorization

### Route Priority

The backend router uses Express route priority to ensure specific handlers match before the wildcard:

1. `/health` — Local health + sandboxd control-plane status
2. `/v1/tasks/:taskId/stream` — SSE proxy (must be before wildcard)
3. `/v1/entities/:entityName/...` — Entity-specific lifecycle endpoints
4. `/v1/agent/credentials/*` — Agent credential management
5. `/v1/apps/:appId/...` — App Store endpoints
6. `/v1/*` — General API proxy (catch-all)

## Component Overview

### Frontend Components

| Component | Purpose |
|-----------|---------|
| `AppCard` | Entity card showing sandbox status with lifecycle action buttons |
| `AppStoreCard` | Lightweight entity card for auto-provisioned apps |
| `SandboxdContent` | Tabbed interface on entity pages (Apps, Tasks, Editor, Terminal, etc.) |
| `SandboxdAppStore` | Standalone App Store page with browse/deploy/manifest tabs |
| `PreviewIframe` | Inline preview iframe with wake-state indicator, copy-to-clipboard, and fullscreen |
| `CodeEditor` | CodeMirror editor with file tree sidebar |
| `Terminal` | xterm.js terminal connected to sandboxd |
| `AgentTaskPanel` | AI agent task management with SSE progress streaming |
| `AgentCredentialsPanel` | Agent credential provider management |
| `RuntimeManifestEditor` | Custom sandbox.yaml manifest editor |

### Backend Services

| Service | Purpose |
|---------|---------|
| `createRouter` | Express router with proxy, SSE, and entity sync |
| `SandboxdHealthCheck` | Periodic health checks against sandboxd control plane |
| `SandboxdProvisioningManager` | Auto-provisioning for annotated entities |
| `SandboxdEntityProvider` | Reconciliation loop for Backstage catalog entities |
| `createSseProxyHandler` | SSE proxy for agent task streaming |

## Data Flow

### Frontend Request Flow

1. User interacts with a frontend component (e.g., clicks "Deploy" in App Store)
2. Component calls a React hook (e.g., `useSandboxdDeployApp()`)
3. Hook makes a fetch request to the backend proxy at `/api/sandboxd/v1/apps`
4. Backend proxy forwards the request to sandboxd with the authentication token injected
5. Response flows back through the proxy to the frontend component
6. Component updates its state (e.g., shows success toast, updates app list)

### Entity Sync Flow

1. `SandboxdEntityProvider` periodically queries sandboxd's app list
2. For each app, it generates a Backstage entity with sandboxd annotations
3. Entities are provided to Backstage's CatalogBuilder
4. The catalog pipeline processes them (ownership, relationships, etc.)
5. The entity sync also monitors for external sandbox destruction and removes stale entities

### Auto-Provisioning Flow

1. An entity is added to the Backstage catalog with `sandboxd.backstage.io/sandboxd-enabled: 'true'`
2. `SandboxdProvisioningManager` detects the new entity on its periodic sweep
3. It calls sandboxd's `/v1/apps` endpoint to create a sandbox for the app
4. The entity sync picks up the newly created sandbox and syncs it back to the catalog

## Security Model

### Authentication

The plugin supports two authentication modes:

**Single-Tenant Mode** (default): All requests use the shared `sandboxd.token` configured in `app-config.yaml`. The token is injected as `Authorization: Bearer ${token}` on all backend proxy requests.

**Multi-Tenant Mode**: When `sandboxd.multiTenant.enabled: true`, each request is authenticated using the Backstage user's identity token. The backend resolves the user's sandboxd API token and tenant ID via the `SandboxdAuthApi` class.

### Authorization

The plugin provides fine-grained authorization through:

1. **Preview URL Auth Gate** — Sandboxd preview URLs are public by design; the plugin adds a Backstage session-based authentication gate that requires a valid Backstage session to access previews. Session tokens are short-lived (default: 1 hour).

2. **Identity Resolution** — The `/v1/identity/resolve` endpoint maps Backstage user identity to sandboxd API tokens and tenant IDs.

3. **API Key Management** — The `/v1/identity/api-key` endpoint returns just the sandboxd API token for the current user, and the `/v1/identity/tenant-id` endpoint returns the tenant ID.

### Token Security

- Session tokens are short-lived (default: 1 hour, configurable via `sandboxd.previewUrl.ttl`)
- Tokens are never exposed to the frontend — the backend returns the full auth-gated URL
- Preview URLs require a valid Backstage session — no unauthenticated access
- The session validator is middleware on the proxy — requests to sandboxd are validated before forwarding

## Scaffolder Integration

The `sandboxd:deploy` scaffolder action enables one-click deployment from Backstage templates:

1. A developer creates a Backstage Software Template using `sandboxd:deploy`
2. The action calls the backend proxy to create the app in sandboxd
3. The action creates a Backstage entity with the correct sandboxd annotations
4. The entity sync picks up the new entity and provides it to the catalog
5. The developer can immediately see their app in the Backstage catalog and access it via the sandboxd tab

## Entity Annotations

The plugin uses Backstage annotations for configuration and integration:

| Annotation | Purpose |
|------------|---------|
| `sandboxd.backstage.io/sandboxd-enabled` | Enable sandboxd integration for an entity |
| `sandboxd.backstage.io/runtime` | Specify the runtime preset |
| `sandboxd.backstage.io/memory-limit-mb` | Memory limit for the sandbox |
| `sandboxd.backstage.io/sleep-timeout` | Sandbox auto-sleep timeout |
| `sandboxd.backstage.io/auto-provision` | Enable auto-provisioning for the entity |
| `sandboxd.backstage.io/agent-model` | AI agent model for the entity |

See [Frontend Annotations](docs/frontend-annotations.md) for full annotation details.

## Architecture Decision Records

- [ADR-001: Fork vs Rebuild](docs/adr/ADR-001-fork-vs-rebuild.md) — UI integration strategy
