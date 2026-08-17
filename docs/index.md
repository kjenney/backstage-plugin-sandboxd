# Backstage Plugin: Sandboxd

A Backstage plugin that integrates with [sandboxd](https://github.com/sandboxd-io/sandboxd) — a Go control-plane service for managing sandbox containers.

## What It Does

The Sandboxd plugin bridges Backstage's Software Catalog with sandboxd's container orchestration, giving developers a full sandbox lifecycle management experience directly inside Backstage:

- **Sandbox lifecycle** — Start, stop, restart, sleep, wake, and destroy sandboxed apps from entity pages.
- **App Store** — Browse and deploy curated app presets (React, Next.js, FastAPI, and more) with one click.
- **AI Agent Tasks** — Create, monitor, cancel, and undo AI-assisted coding tasks via sandboxd's agent system.
- **Code Editor** — Edit files inside sandboxes with a CodeMirror-powered editor and file tree.
- **Terminal** — Access a live xterm.js terminal connected to running sandboxes.
- **Auto-Provisioning** — Automatically provision sandboxes for entities with the right annotations.
- **Entity Sync** — Keeps Backstage catalog entities in sync with sandboxd-deployed apps.

## Packages

The plugin is split into two packages:

| Package | Description |
|---------|-------------|
| `@internal/backstage-plugin-sandboxd-frontend` | React frontend plugin with entity integration |
| `@internal/backstage-plugin-sandboxd-backend` | Backend proxy plugin for secure API calls |

## Quick Start

```bash
# Install dependencies
yarn install

# Run the frontend plugin in dev mode
yarn start

# Run the backend plugin in dev mode
yarn start-backend
```

## Architecture

The plugin follows the standard Backstage plugin pattern:

1. **Frontend** — React components that render on entity pages, the App Store, and standalone routes.
2. **Backend** — An Express router that proxies all `/api/sandboxd/v1/*` requests to the sandboxd control plane, injecting authentication headers so the frontend never handles sandboxd credentials directly.
3. **SSE Proxy** — A dedicated handler that pipes Server-Sent Events from sandboxd to the frontend for real-time agent task progress.
4. **Entity Sync** — A periodic reconciliation loop that creates/updates Backstage entities for sandboxd-deployed apps.
5. **Auto-Provisioning** — A background manager that automatically provisions sandboxes for entities with the `sandboxd.backstage.io/auto-provision: "true"` annotation.

See [Architecture](architecture.md) for the full design rationale, including the decision to rebuild rather than fork the sandboxd console UI.

## Migrating from the Standalone Console

If you're currently using sandboxd's standalone console, the [Migration Guide](migration-guide.md) walks through the steps to move to the Backstage plugin integration.
