# API Reference

This reference documents all the API endpoints exposed by the sandboxd backend plugin. The frontend communicates with sandboxd through the backend proxy at `/api/sandboxd/v1/*`.

## Proxy Handler

All other API calls are proxied to the sandboxd control plane via the catch-all route `ALL /v1/*`. The proxy:

1. Rewrites the path by appending it to `sandboxd.baseUrl`
2. Injects the `Authorization: Bearer *** header if a token is configured
3. Sets `Content-Type: application/json` for requests with a JSON body
4. Strips hop-by-hop headers (`Host`, `Connection`, `Transfer-Encoding`)
5. Forwards the upstream response status and body to the frontend

## Health Check

### GET /health

Returns the status of the backend plugin and sandboxd control-plane health.

**Response:**

```json
{
  "status": "ok",
  "baseUrl": "http://localhost:9090",
  "sandboxd": {
    "healthy": true,
    "lastCheck": 1712345678000,
    "responseTimeMs": 45,
    "error": null
  },
  "provisioning": {
    "enabled": true,
    "provisionedCount": 3,
    "provisioned": [
      {
        "entityName": "my-web-app",
        "lastProvisionedAt": 1712345678000
      }
    ]
  },
  "entitySync": {
    "active": true,
    "intervalMs": 300000
  }
}
```

If sandboxd is unreachable, returns `503` with `"status": "degraded"`.

## SSE Proxy

### GET /v1/tasks/:taskId/stream

Forwards Server-Sent Events from sandboxd to the frontend for real-time agent task progress streaming.

**Response:** Event stream with `text/event-stream` content type.

| Event | Description |
|-------|-------------|
| `progress` | Streaming agent output |
| `completed` | Task finished successfully |
| `error` | Task failed |
| `checkpoint` | Checkpoint created |
| `closed` | Connection closed |

## Entity Lifecycle

### POST /v1/entities/:entityName/sandbox/destroy

Destroy a sandbox permanently.

### POST /v1/entities/:entityName/sandbox/sleep

Put a sandbox to sleep (frees memory, wakes on next request).

### POST /v1/entities/:entityName/sandbox/wake

Wake a sleeping sandbox.

## Agent Tasks

### GET /v1/entities/:entityName/tasks

List tasks for an entity.

### POST /v1/entities/:entityName/tasks

Create a new agent task.

```json
{
  "agent": "opencode",
  "prompt": "Build a REST API...",
  "model": "gpt-4o"
}
```

### GET /v1/entities/:entityName/tasks/:taskId

Get a single agent task.

### POST /v1/entities/:entityName/tasks/:taskId/cancel

Cancel a running agent task.

### POST /v1/entities/:entityName/tasks/:taskId/undo

Undo a completed agent task (revert to checkpoint).

## Agent Credentials

### GET /v1/agent/credentials

List credential providers.

### PUT /v1/agent/credentials

Update credential configuration.

```json
{
  "providers": [
    {
      "name": "github",
      "apiKeySet": true
    }
  ]
}
```

### POST /v1/agent/credentials

Add a new credential provider.

### DELETE /v1/agent/credentials/:provider

Remove a credential provider.

## App Store

### GET /v1/presets

List available runtime presets (curated app catalog).

### GET /v1/recipes

List embedded runtime recipes.

### GET /v1/apps

List tenant-scoped apps.

### POST /v1/apps

Create an app (one-click deploy).

```json
{
  "name": "my-app",
  "presetId": "react-vite",
  "manifest": {
    "runtime": "node",
    "memoryLimitMb": 512
  }
}
```

### GET /v1/apps/:appId

Get a single app.

### PATCH /v1/apps/:appId

Update an app (partial update).

### DELETE /v1/apps/:appId

Delete an app.

### POST /v1/apps/:appId/sandbox

Create the app's sandbox.

### GET /v1/apps/:appId/snapshots

List snapshots for an app.

### POST /v1/apps/:appId/snapshots/:snapshotId/restore

Restore from snapshot.

### POST /v1/apps/:appId/snapshots/:snapshotId/fork

Fork snapshot into new app.

### GET /v1/apps/:appId/activity

Get app activity timeline.

### POST /v1/manifest/validate

Validate a sandbox.yaml manifest.

```json
{
  "runtime": "node",
  "memoryLimitMb": 512,
  "sleepTimeout": 600
}
```

### GET /v1/apps/:appId/manifest

Get the app's current sandbox.yaml manifest.

### GET /v1/apps/:appId/detect

Advisory runtime detection.

### POST /v1/apps/:appId/entity

Create/update Backstage entity for a deployed app.

### POST /v1/apps/:appId/preview-url

Get an auth-gated preview URL for a sandboxd app.

**Response:**

```json
{
  "url": "https://sandboxd.example.com/app/my-app?_bs_session=eyJhbGciOiJSUzI1NiIs...",
  "ttl": 3600,
  "tenantId": "company.com"
}
```

## API Key Management

### GET /v1/keys

List all sandboxd API keys.

**Response:**

```json
[
  {
    "id": "key-abc123",
    "name": "my-key",
    "description": "My API key",
    "createdAt": "2024-01-01T00:00:00Z",
    "expiresAt": null,
    "state": "active",
    "keyPrefix": "sk_1234"
  }
]
```

### POST /v1/keys

Create a new sandboxd API key.

```json
{
  "name": "my-key",
  "description": "My API key",
  "expiresAt": "2025-01-01T00:00:00Z"
}
```

### POST /v1/keys/:keyId/rotate

Rotate an API key (revoke old, create replacement).

### DELETE /v1/keys/:keyId

Revoke an API key.

## Preview URL Session Validation

### GET /v1/preview

Validates Backstage session tokens in preview request URLs before forwarding to sandboxd.

**Query parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `_bs_session` | Yes | Backstage identity token |
| `_bs_ttl` | No | TTL in seconds (default: 3600) |
| `_bs_issued_at` | No | Unix timestamp when the token was issued |

## Proxied API Groups

The catch-all proxy forwards requests to sandboxd for the following API groups:

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

## Authentication & Identity

### GET /identity/resolve

Resolve the current user's sandboxd identity from Backstage identity. Returns the user entity reference, ownership entity refs, Backstage token, derived tenant ID, and sandboxd API token.

**Response:**

```json
{
  "userEntityRef": "user:someone@example.com",
  "ownershipEntityRefs": ["user:someone@example.com"],
  "token": "eyJhbG...",
  "tenantId": "example.com",
  "apiKey": "sk_****"
}
```

**401 Response** (unauthenticated):

```json
{
  "error": "Authentication required",
  "message": "No valid Backstage session found for this request"
}
```

### GET /identity/api-key

Resolve the current user's sandboxd API token. In single-tenant mode, returns the shared token. In multi-tenant mode, returns the user's tenant-scoped token.

**Response:**

```json
{
  "apiKey": "sk_****"
}
```

### GET /identity/tenant-id

Resolve the current user's sandboxd tenant ID. In single-tenant mode, returns `null`. In multi-tenant mode, returns the tenant derived from the user's Backstage identity (e.g., email domain).

**Response:**

```json
{
  "tenantId": "example.com"
}
```

## Error Responses

All error responses follow a consistent format:

```json
{
  "error": "Error description",
  "message": "Additional details"
}
```

Common status codes:

| Code | Meaning |
|------|---------|
| 400 | Bad request (missing parameters) |
| 401 | Unauthorized (missing or invalid session token) |
| 404 | Not found |
| 502 | Bad Gateway — sandboxd control plane unreachable |
| 503 | Service degraded (sandboxd unreachable) |
