# Getting Started

## Prerequisites

- A running Backstage instance
- A running [sandboxd](https://github.com/sandboxd-io/sandboxd) control-plane service (default: `localhost:9090`)
- Node.js 18+ and yarn

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
```

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

For a standalone App Store page, add a route in your app:

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

## Next Steps

- Learn about the [annotation system](frontend-annotations.md) for advanced configuration
- Deploy an app from the [App Store](frontend-app-store.md)
- Use [scaffolder templates](templates.md) to provision apps automatically
- Explore [AI Agent Tasks](frontend-agent-tasks.md) for AI-assisted coding
- Already using the standalone sandboxd console? See the [Migration Guide](migration-guide.md) for steps to move to the Backstage plugin.
