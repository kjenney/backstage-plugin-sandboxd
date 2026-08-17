# Frontend Plugin

The frontend package (`@internal/backstage-plugin-sandboxd-frontend`) provides React components for integrating sandboxd into Backstage entity pages and standalone routes.

## Plugin Registration

The plugin exports three routable extensions:

| Export | Route | Description |
|--------|-------|-------------|
| `sandboxdPlugin` | — | The plugin instance |
| `SandboxdRoot` | `rootRouteRef` | Root page for the sandboxd plugin |
| `SandboxdContent` | `entityContentRouteRef` | Content for entity pages |
| `SandboxdAppStore` | `appStoreRouteRef` | Standalone App Store page |

## Public Exports

```ts
// Plugin and routes
import { sandboxdPlugin, SandboxdRoot, SandboxdAppStore } from '@internal/backstage-plugin-sandboxd-frontend';

// Entity page content
import { SandboxdContent } from '@internal/backstage-plugin-sandboxd-frontend';

// Entity card components
import { AppCard, isSandboxdAvailable } from '@internal/backstage-plugin-sandboxd-frontend';

// Standalone views
import { AppListView } from '@internal/backstage-plugin-sandboxd-frontend';
import { CodeEditor } from '@internal/backstage-plugin-sandboxd-frontend';
import { Terminal } from '@internal/backstage-plugin-sandboxd-frontend';
import { SettingsPanel } from '@internal/backstage-plugin-sandboxd-frontend';

// Annotations
import {
  SANDBOXD_ANNOTATIONS,
  SANDBOXD_ANNOTATION_PREFIX,
  parseSandboxdAnnotations,
  isSandboxdManagedEntity,
  type SandboxdEntityConfig,
  type SandboxdAnnotationKey,
} from '@internal/backstage-plugin-sandboxd-frontend';

// Status widget
import { SandboxStatusWidget } from '@internal/backstage-plugin-sandboxd-frontend';

// Agent tasks
import { AgentTaskPanel } from '@internal/backstage-plugin-sandboxd-frontend';
```

## App Store Route

The `SandboxdAppStore` component provides a standalone page with three tabs:

- **App Store** — Browse curated presets and deploy with one click
- **Deployed** — View and manage all deployed apps across the organization
- **Manifest Editor** — Write and deploy custom `sandbox.yaml` manifests

To register it in your Backstage app:

```tsx
import { SandboxdAppStore } from '@internal/backstage-plugin-sandboxd-frontend';

// Add to your app's routes
<Route path="/sandboxd-app-store" element={<SandboxdAppStore />} />
```

## Entity Page Integration

Add the Sandboxd tab to entity pages:

```tsx
import { SandboxdContent } from '@internal/backstage-plugin-sandboxd-frontend';

<Entity.layout.Route path="/sandboxd" title="Sandboxd">
  <SandboxdContent />
</Entity.layout.Route>
```

The `SandboxdContent` component renders a tabbed interface with the following tabs (see [SandboxdContent tabs](frontend-content.md) for details):

- **Apps** — Sandbox app list with status and preview URLs
- **Agent Tasks** — AI coding agent task management
- **Code Editor** — In-sandbox file editor
- **Terminal** — Live terminal connection
- **Settings** — Runtime lifecycle and agent configuration
- **Credentials** — Agent credential provider management
- **App Store** — Browse and deploy curated apps
- **Deployed** — View and manage deployed apps
- **Manifest** — Custom runtime manifest editor
