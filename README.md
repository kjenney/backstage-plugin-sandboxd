# Backstage Plugin: Sandboxd

A Backstage plugin that integrates with sandboxd — a Go control-plane service for managing sandbox containers.

## Packages

- **`@internal/backstage-plugin-sandboxd-frontend`** — React frontend plugin with entity integration
- **`@internal/backstage-plugin-sandboxd-backend`** — Backend proxy plugin for secure API calls

## Architecture

See [ADR-001](docs/adr/ADR-001-fork-vs-rebuild.md) for the architecture decision on UI approach.

## Quick Start

```bash
# Install dependencies
yarn install

# Run the frontend plugin in dev mode
yarn start

# Run the backend plugin in dev mode
yarn start-backend
```

## Configuration

Add the following to your Backstage `app-config.yaml`:

```yaml
sandboxd:
  baseUrl: 'http://localhost:9090'
  token: '${SANDBOXD_API_TOKEN}'
```

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
