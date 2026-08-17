# Backstage Plugin: Sandboxd

A Backstage plugin that integrates with [sandboxd](https://github.com/sandboxd-io/sandboxd) — a Go control-plane service for managing sandbox containers — enabling developers to provision, manage, and preview sandboxed applications directly from the Backstage catalog.

## Packages

- **`@internal/backstage-plugin-sandboxd-frontend`** — React frontend plugin with entity integration, App Store, code editor, terminal, agent tasks, and more
- **`@internal/backstage-plugin-sandboxd-backend`** — Backend proxy plugin for secure API calls, entity sync, auto-provisioning, SSE streaming, and scaffolder integration

## Architecture

The plugin follows the standard Backstage plugin architecture:

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

**Key design decisions:**

- **All API calls flow through the backend proxy** — the frontend never handles sandboxd credentials or communicates directly with sandboxd
- **Rebuild vs. Fork** — The sandboxd console UI was rebuilt from scratch as Backstage-native components (not forked). See [ADR-001](docs/adr/ADR-001-fork-vs-rebuild.md) for the full rationale
- **Entity context** — Components use `useEntity()` to access Backstage entity metadata natively
- **Theming** — Full integration with Backstage's Material UI theme system
- **Security model** — Authentication tokens are injected server-side; the frontend never sees sandboxd API keys

See the [architecture documentation](docs/architecture.md) for the full design details.

## Quick Start

```bash
# Install dependencies
yarn install

# Run the frontend plugin in dev mode
yarn start

# Run the backend plugin in dev mode
yarn start-backend
```

## Installation

### 1. Add the packages to your Backstage app

```bash
# Frontend plugin
yarn workspace app add @internal/backstage-plugin-sandboxd-frontend

# Backend plugin
yarn workspace backend add @internal/backstage-plugin-sandboxd-backend
```

### 2. Configure the backend

Add the sandboxd configuration to your Backstage `app-config.yaml`:

```yaml
sandboxd:
  # The base URL of the sandboxd control-plane API
  baseUrl: 'http://localhost:9090'

  # API token for authenticating with sandboxd.
  # Use an environment variable to avoid hardcoding.
  token: '${SANDBOXD_API_TOKEN}'

  # How often (ms) to check sandboxd health. Default: 30000.
  healthCheckInterval: 30000

  # Automatic sandbox provisioning
  autoProvision:
    enabled: true
    intervalMs: 120000

  # Multi-tenant mode — when enabled, sandboxd routes requests per user
  # using Backstage identity tokens instead of the shared sandboxd token.
  multiTenant:
    enabled: false
    identityClaim: 'email'

  # Preview URL TTL — how long auth-gated preview URLs are valid (seconds).
  previewUrl:
    ttl: 3600

  # Entity sync configuration.
  entitySync:
    intervalMs: 300000
    owner: 'user:sandboxd-service'
```

See [Configuration Reference](docs/configuration.md) for all available options.

### 3. Register the frontend plugin

In your Backstage `packages/app/src/components/catalog/EntityPage.tsx`:

```tsx
import { SandboxdContent } from '@internal/backstage-plugin-sandboxd-frontend';

// Add the sandboxd tab to entity pages
<Entity.layout.Route path="/sandboxd" title="Sandboxd">
  <SandboxdContent />
</Entity.layout.Route>
```

### 4. Register the backend plugin

In `packages/backend/src/index.ts`:

```ts
import sandboxdPlugin from '@internal/backstage-plugin-sandboxd-backend';

// Add the router to the backend
api.addRouter(sandboxdPlugin);
```

### 5. (Optional) Add the App Store route

For a standalone App Store page:

```tsx
import { SandboxdAppStore } from '@internal/backstage-plugin-sandboxd-frontend';

<Route path="/sandboxd-app-store" element={<SandboxdAppStore />} />
```

## Annotate Your First Entity

To enable sandboxd integration for a Backstage entity, add the required annotation:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-sandboxed-app
  annotations:
    sandboxd.backstage.io/sandboxd-enabled: 'true'
spec:
  type: service
  lifecycle: experimental
  owner: my-team
```

Visit the entity page and you'll see the **Sandboxd** tab with app status and lifecycle controls.

## Features

### Frontend

| Feature | Description |
|---------|-------------|
| **AppCard** | Entity card showing sandbox status with lifecycle action buttons (start, stop, destroy) |
| **App Store** | Browse and deploy from 80+ curated app presets |
| **Code Editor** | CodeMirror editor with file tree sidebar |
| **Terminal** | xterm.js terminal connected to sandboxd |
| **Agent Tasks** | AI agent task management with SSE progress streaming |
| **Agent Credentials** | Agent credential provider management |
| **Runtime Manifest Editor** | Custom sandbox.yaml manifest editor |
| **Preview Iframe** | Inline preview with wake-state indicator, copy-to-clipboard, and fullscreen |
| **API Key Management** | Create, rotate, and revoke sandboxd API keys |
| **Preview URL Auth** | Backstage session-based authentication for sandboxd preview URLs |

See the [frontend documentation](docs/frontend.md) for full details.

### Backend

| Feature | Description |
|---------|-------------|
| **Router & Proxy** | Express router with proxy, SSE, and entity sync |
| **SSE Proxy** | SSE proxy for agent task streaming |
| **Entity Sync** | Reconciliation loop for Backstage catalog entities |
| **Auto-Provisioning** | Auto-provisioning for annotated entities |
| **Scaffolder Action** | `sandboxd:deploy` — deploy apps from presets and create entities in one step |
| **Authentication** | Backstage identity resolution, multi-tenant routing, API key management |
| **Preview URL Auth Gate** | Backstage session-based authentication for sandboxd preview URLs |

See the [backend documentation](docs/backend.md) for full details.

## API Endpoints Proxied

The backend plugin proxies the following sandboxd API groups:

| Group | Endpoints |
|-------|-----------|
| Apps | `/v1/apps` |
| Sandboxes | `/v1/sandboxes` |
| Tasks | `/v1/tasks` |
| Snapshots | `/v1/snapshots` |
| Settings | `/v1/settings` |
| Agents | `/v1/agents` |
| Presets | `/v1/presets` |
| Git Credentials | `/v1/git-credentials` |
| Auth | `/v1/auth` |

## Scaffolder Templates

The plugin includes Backstage Software Templates for scaffolding new applications:

| Template | Title | Description |
|----------|-------|-------------|
| `sandboxd-react-vite` | React + Vite App (sandboxd) | Scaffold a React + Vite application with sandboxd runtime annotations |
| `sandboxd-nextjs` | Next.js App (sandboxd) | Scaffold a Next.js application with sandboxd runtime annotations |
| `sandboxd-fastapi` | FastAPI App (sandboxd) | Scaffold a FastAPI application with sandboxd runtime annotations |
| `sandboxd-ai-app` | AI-Driven App with Sandboxd | Create a new application using sandboxd's AI coding agents |

See [Scaffolder Templates](docs/templates.md) for usage details.

## Security Model

The plugin follows a zero-trust security model for sandboxd credentials:

1. **Backend-only credential injection** — The frontend never handles sandboxd API tokens. All authentication tokens are injected server-side by the backend proxy
2. **Multi-tenant isolation** — When multi-tenant mode is enabled, each request is authenticated using the Backstage user's identity token and routed through the user's tenant-scoped API key
3. **Preview URL auth gate** — Sandboxd preview URLs are public by design; the plugin adds a Backstage session-based authentication gate that requires a valid Backstage session to access previews
4. **Session token TTL** — Preview session tokens are short-lived (default: 1 hour) and validated by the backend before forwarding requests to sandboxd
5. **Hop-by-hop header removal** — The proxy strips `Host`, `Connection`, and `Transfer-Encoding` headers before forwarding to sandboxd to prevent request smuggling

See [Backend Authentication](docs/backend-auth.md) and [Preview URL Auth Gate](docs/backend-preview-auth.md) for security details.

## Documentation

- [Overview](docs/index.md) — Home page
- [Getting Started](docs/getting-started.md) — Installation and setup guide
- [Architecture](docs/architecture.md) — High-level design and key decisions
- [Configuration](docs/configuration.md) — All configuration options
- [Frontend Plugin](docs/frontend.md) — Frontend components and features
- [Backend Plugin](docs/backend.md) — Backend services and routes
- [API Reference](docs/api-reference.md) — Complete API endpoint reference
- [Testing](docs/testing.md) — Test coverage and patterns
- [CI Pipeline](docs/ci-pipeline.md) — GitHub Actions CI/CD pipeline
- [Scaffolder Templates](docs/templates.md) — Software template usage

## Development

### Build

```bash
npx backstage-cli package build --all
```

### Test

```bash
# Frontend tests
cd packages/frontend && npx backstage-cli package test --watchAll=false

# Backend tests
cd packages/backend && npx backstage-cli package test --watchAll=false
```

### Lint

```bash
npx backstage-cli package lint --all
```

## License

Apache-2.0
