# App Store

The App Store is a curated catalog of deployable app presets — one-click deployments for common frameworks and stacks. It's accessible both as a tab on entity pages and as a standalone page via `SandboxdAppStore`.

## Standalone App Store Page

The `SandboxdAppStore` component provides a standalone route with three tabs:

| Tab | Description |
|-----|-------------|
| **App Store** | Browse curated presets and deploy |
| **Deployed** | View and manage deployed apps |
| **Manifest Editor** | Write and deploy custom `sandbox.yaml` manifests |

## Browsing Presets

Each preset card shows:

- **Preset name** — e.g., "React + Vite", "Next.js", "FastAPI"
- **Description** — Brief overview of the preset
- **Category** — Color-coded category chip (Web, Data Science, Backend, DevOps, Database, AI, CMS, Other)
- **Framework** — The underlying framework tag
- **Capabilities** — Runtime capabilities supported by the preset

## Deploy Dialog

The deploy wizard guides you through the deployment process:

1. **Preset selection** — Choose from curated presets
2. **Configuration** — Set app name, memory limit, and other parameters
3. **Deployment** — Deploy via the sandboxd control plane
4. **Confirmation** — Success/error feedback with retry option

## Deployed Apps View

The Deployed Apps view shows all apps deployed across the organization, with:

- App name and status
- Preview URL links
- Delete action with confirmation dialog
- Filtering and search capabilities

## Runtime Manifest Editor

For custom deployments, the manifest editor allows you to:

1. Write a `sandbox.yaml` manifest in a CodeMirror editor
2. Validate the manifest against sandboxd's schema via `/v1/manifest/validate`
3. Deploy the validated manifest to create a new app

## Category Colors

| Category | Color |
|----------|-------|
| Web | Blue (`#1976d2`) |
| Data Science | Purple (`#9c27b0`) |
| Backend | Green (`#388e3c`) |
| DevOps | Orange (`#ff9800`) |
| Database | Brown (`#795548`) |
| AI | Red (`#f44336`) |
| CMS | Teal (`#009688`) |
| Other | Gray (`#607d8b`) |

## App Store API Hooks

| Hook | Purpose |
|------|---------|
| `useSandboxdPresets()` | Fetch the list of available presets |
| `useSandboxdRecipes()` | Fetch framework-specific recipes |
| `useDeployPreset()` | Deploy an app from a preset |
| `useDeployManifest()` | Deploy an app from a custom manifest |
| `useValidateManifest()` | Validate a manifest against the schema |
| `useSandboxdApps(entityName)` | Fetch apps for a specific entity |

## Preset Type

```ts
interface SandboxdPreset {
  id: string;
  name: string;
  description?: string;
  framework?: string;          // Framework tag (e.g., "react", "python")
  category?: string;           // Category (e.g., "Web", "AI")
  capabilities?: Record<string, boolean>;  // Runtime capabilities
  icon?: string;               // Optional icon/logo URL
}
```
