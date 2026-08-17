# Router & Proxy

The backend router is the core of the sandboxd integration. It proxies all API calls from the Backstage frontend to the sandboxd control plane, injecting authentication headers so the frontend never handles sandboxd credentials directly.

## Proxy Handler

The catch-all route `ALL /v1/*` forwards requests to sandboxd with the following behavior:

1. **Path rewriting** — The wildcard path is appended to `sandboxd.baseUrl`
2. **Auth injection** — If `sandboxd.token` is configured, the `Authorization: Bearer <token>` header is added
3. **Content-Type** — For requests with a JSON body, `Content-Type: application/json` is set
4. **Hop-by-hop removal** — `Host`, `Connection`, and `Transfer-Encoding` headers are stripped
5. **Response forwarding** — The upstream response status and body are returned to the frontend

### Proxied API Groups

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

## Entity Lifecycle Endpoints

These explicit endpoints handle lifecycle operations via POST with the entity name in the path:

| Method | Path | Action |
|--------|------|--------|
| `POST` | `/v1/entities/:entityName/sandbox/destroy` | Destroy sandbox |
| `POST` | `/v1/entities/:entityName/sandbox/sleep` | Sleep sandbox |
| `POST` | `/v1/entities/:entityName/sandbox/wake` | Wake sandbox |

## Agent Task Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/v1/entities/:entityName/tasks` | List tasks |
| `POST` | `/v1/entities/:entityName/tasks` | Create task |
| `GET` | `/v1/entities/:entityName/tasks/:taskId` | Get task |
| `POST` | `/v1/entities/:entityName/tasks/:taskId/cancel` | Cancel task |
| `POST` | `/v1/entities/:entityName/tasks/:taskId/undo` | Undo task |

## Agent Credential Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/v1/agent/credentials` | List providers |
| `PUT` | `/v1/agent/credentials` | Update config |
| `POST` | `/v1/agent/credentials` | Add provider |
| `DELETE` | `/v1/agent/credentials/:provider` | Remove provider |

## App Store Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/v1/apps` | Create app from preset |
| `POST` | `/v1/apps` | Deploy custom app |
| `GET` | `/v1/apps` | List all apps |
| `GET` | `/v1/apps/:appId` | Get app details |
| `DELETE` | `/v1/apps/:appId` | Delete app |
| `POST` | `/v1/apps/:appId/sandbox` | Create sandbox |
| `GET` | `/v1/apps/:appId/snapshots` | List snapshots |
| `POST` | `/v1/apps/:appId/snapshots/:snapshotId/restore` | Restore snapshot |
| `POST` | `/v1/apps/:appId/snapshots/:snapshotId/fork` | Fork snapshot |
| `GET` | `/v1/apps/:appId/activity` | Activity timeline |
| `POST` | `/v1/manifest/validate` | Validate manifest |
| `GET` | `/v1/apps/:appId/manifest` | Get app manifest |
| `GET` | `/v1/apps/:appId/detect` | Runtime detection |
| `POST` | `/v1/apps/:appId/entity` | Create/update Backstage entity |
