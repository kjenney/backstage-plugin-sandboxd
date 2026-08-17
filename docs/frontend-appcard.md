# AppCard

The `AppCard` is the primary entity card component for sandboxd integration. It appears on Backstage entity pages and shows the current state of sandboxed apps with interactive lifecycle controls.

## Features

- **Status indicators** — Color-coded status badges (running, sleeping, stopped)
- **Preview URLs** — Direct links to running app previews
- **Lifecycle actions** — Start, stop, restart, sleep, wake, and destroy buttons
- **Destroy confirmation** — Permanent destroy action requires dialog confirmation

## Usage

```tsx
import { AppCard } from '@internal/backstage-plugin-sandboxd-frontend';

// The AppCard automatically detects the current entity via useEntity()
<Entity.layout.Content title="Sandboxd">
  <AppCard />
</Entity.layout.Content>
```

## Supported Actions

| Action | Description |
|--------|-------------|
| **Start** | Start a stopped or sleeping sandbox |
| **Stop** | Gracefully stop a running sandbox |
| **Restart** | Restart a running sandbox |
| **Sleep** | Put a running sandbox to sleep (reduces resource usage) |
| **Wake** | Wake a sleeping sandbox |
| **Destroy** | Permanently delete the app and all its sandboxes (requires confirmation) |

## AppStoreCard

A lighter-weight variant designed for auto-provisioned entities. Shows status, preview URL, preset information, and start/stop actions:

```tsx
import { AppStoreCard } from '@internal/backstage-plugin-sandboxd-frontend';
```

The `AppStoreCard` is designed to appear alongside the `AppCard` on entity pages for entities that have the `sandboxd.backstage.io/app-id` annotation set by the entity sync provider.

## Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| `running` | Green | Sandbox is active and accepting traffic |
| `sleeping` | Yellow | Sandbox is idle; resources are reduced |
| `stopped` | Red | Sandbox is not running |
| `starting` | Blue | Sandbox is in the process of starting |
| `error` | Red | Sandbox encountered an error |
