# Migration Guide: Standalone sandboxd Console → Backstage Plugin

This guide walks through migrating from sandboxd's standalone React console to the Backstage plugin integration.

## Overview

The sandboxd standalone console provides the same core functionality — app management, code editing, terminal access, agent tasks, and the App Store — but as a standalone SPA. The Backstage plugin provides the same capabilities as native Backstage components, integrated into the entity page and catalog.

## Migration Path

### 1. Install the Backstage Plugin

Follow the [Getting Started](getting-started.md) guide to install the frontend and backend packages.

### 2. Migrate Your Entities

If you're using sandboxd with standalone entities, you'll need to add the sandboxd annotation to your Backstage catalog entities:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-app
  annotations:
    sandboxd.backstage.io/sandboxd-enabled: 'true'
spec:
  type: service
  owner: my-team
```

### 3. Migrate Your Configuration

The Backstage plugin configuration goes in your `app-config.yaml` instead of a standalone sandboxd configuration file:

```yaml
sandboxd:
  baseUrl: 'http://localhost:9090'
  token: '${SANDBOXD_API_TOKEN}'
```

See [Configuration](configuration.md) for all available options.

### 4. Migrate Your Templates

If you have standalone sandboxd templates, replace them with the Backstage Software Templates:

- `sandboxd-react-vite` — React + Vite App
- `sandboxd-nextjs` — Next.js App
- `sandboxd-fastapi` — FastAPI App
- `sandboxd-ai-app` — AI-Driven App

Register the templates in your `app-config.yaml`:

```yaml
scaffolder:
  actions:
    - action: sandboxd:deploy
      name: Deploy to sandboxd
```

### 5. Migrate Your Scaffolder Actions

If you were using the `http:backstage:request` action to call sandboxd endpoints directly, replace them with the `sandboxd:deploy` action:

```yaml
# Before (using http:backstage:request)
- id: deploy
  name: Deploy to sandboxd
  action: http:backstage:request
  input:
    method: POST
    path: /api/sandboxd/v1/apps
    headers:
      Content-Type: application/json
    body:
      name: my-app
      preset: react-vite

# After (using sandboxd:deploy)
- id: deploy
  name: Deploy to sandboxd
  action: sandboxd:deploy
  input:
    name: my-app
    presetId: react-vite
```

## Feature Comparison

| Feature | Standalone Console | Backstage Plugin |
|---------|-------------------|------------------|
| App listing | Full App Store page | AppCard on entity pages, standalone App Store page |
| App deployment | Deploy modal | `sandboxd:deploy` scaffolder action or App Store UI |
| Code editor | CodeMirror in SPA | CodeEditor component with file tree |
| Terminal | xterm.js in SPA | Terminal component with xterm.js |
| Agent tasks | Task panel in SPA | AgentTaskPanel with SSE streaming |
| Agent credentials | Settings panel | AgentCredentialsPanel |
| Preview URL | Public URL | Auth-gated preview URL with Backstage session |
| Entity context | None | `useEntity()` — full Backstage entity metadata |
| Theming | sandboxd theme | Backstage Material UI theme |
| Auto-provisioning | None | `SandboxdProvisioningManager` |
| Entity sync | None | `SandboxdEntityProvider` |

## Migration Checklist

- [ ] Install frontend and backend packages
- [ ] Add `sandboxd` annotation to entities
- [ ] Configure `app-config.yaml`
- [ ] Register frontend plugin in `EntityPage.tsx`
- [ ] Register backend plugin in `index.ts`
- [ ] Migrate scaffolder templates to `sandboxd:deploy` action
- [ ] Update any custom scaffolder actions that call sandboxd directly
- [ ] Verify entity sync is working
- [ ] Test preview URL auth gate
- [ ] Update documentation to point to the Backstage plugin instead of the standalone console
