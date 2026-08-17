# Backend Authentication

The sandboxd Backstage plugin integrates Backstage's authentication system with sandboxd's API token authentication, providing per-user identity resolution and multi-tenant routing.

## Overview

The authentication integration provides four main capabilities:

1. **Backstage Identity Resolution** — Maps Backstage user identity to sandboxd API tokens
2. **Multi-Tenant Routing** — Routes requests through per-user tenant-scoped API keys
3. **API Key Management** — CRUD operations for sandboxd API keys from Backstage
4. **Preview URL Auth Gate** — Backstage session-based authentication for sandboxd preview URLs

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌───────────────┐
│  Frontend   │────▶│  Backstage Auth │────▶│  Proxy Router │
│             │     │  (IdentityApi)  │     │               │
│             │     │                 │     │  ┌─────────┐  │
│             │     │                 │     │  │ Tenant  │  │
│             │     │                 │     │  │ Middle- │  │
│             │     │                 │     │  │ ware    │  │
│             │     │                 │     │  └────┬────┘  │
│             │     │                 │     │       │       │
│             │     │                 │     │       ▼       │
│             │     │                 │     │  ┌─────────┐  │
│             │     │                 │     │  │ Session │  │
│             │     │                 │     │  │ Validator│  │
│             │     │                 │     │  └────┬────┘  │
│             │     │                 │     │       │       │
│             │     │                 │     │       ▼       │
│             │     │                 │     │  ┌─────────┐  │
│             │     │                 │     │  │ sandboxd│  │
│             │     │                 │     │  │Control  │  │
│             │     │                 │     │  │ Plane   │  │
│             │     │                 │     │  └─────────┘  │
└─────────────┘     └─────────────────┘     └───────────────┘
```

## Backstage Identity Resolution

The `SandboxdAuthApi` class wraps Backstage's `IdentityApi` to resolve the current user's identity and obtain a sandboxd API token. It is registered as a Backstage API (`sandboxdAuthApiRef`) so the frontend can consume it directly.

```typescript
import { sandboxdAuthApiRef, type ResolvedIdentity } from '@internal/backstage-plugin-sandboxd-backend';

const authApi = useApi(sandboxdAuthApiRef);

// Resolve the full identity — token, tenant, and claims
const identity = await authApi.resolveIdentity();
// Returns: ResolvedIdentity { userEntityRef, token, tenantId, apiKey }

// Get just the sandboxd API token
const apiKey = await authApi.getApiKey();
// Returns: string | undefined

// Get the tenant ID (multi-tenant mode only)
const tenantId = await authApi.getTenantId();
// Returns: string | undefined
```

### Single-Tenant Mode

In single-tenant mode (the default), the shared `sandboxd.token` from `app-config.yaml` is used for all requests:

```yaml
sandboxd:
  token: '${SANDBOXD_API_TOKEN}'
  multiTenant:
    enabled: false  # default
```

### Multi-Tenant Mode

In multi-tenant mode, the `SandboxdAuthApi` resolves a per-user sandboxd API token from Backstage's identity token. This works when sandboxd supports Backstage auth token passthrough.

```yaml
sandboxd:
  token: '${SANDBOXD_API_TOKEN}'  # fallback for unauthenticated requests
  multiTenant:
    enabled: true
    identityClaim: 'email'  # default
```

## Multi-Tenant Routing

When multi-tenant mode is enabled, a `tenantMiddleware` is applied to the proxy router. This middleware:

1. Resolves the current user's Backstage identity via `IdentityApi.getIdentity()`
2. Extracts the sandboxd API token from the identity response
3. Derives the tenant identifier from the configured `identityClaim` (default: email domain)
4. Injects the tenant-scoped token and tenant ID into the request context

```typescript
// The tenant middleware is applied automatically when multi-tenant is enabled
if (authApi.isMultiTenant()) {
  const tenantMiddleware = createTenantMiddleware(
    authApi,
    options.config,
  );

  router.all('/v1/*', tenantMiddleware, async (req, res) => {
    // (req as any).sandboxdUserIdentity — user identity
    // (req as any).sandboxdAuthHeader — Bearer token
    // (req as any).sandboxdTenantId — derived tenant ID
  });
}
```

### Identity Claims

The `identityClaim` configuration determines how the tenant identifier is derived from the user's Backstage identity:

- **`email`** (default) — extracts the domain part of the user's email (e.g., `user@company.com` → `company`)
- **Other values** — uses the `userEntityRef` directly (e.g., `User:default/sandra`)

## API Key Management

The plugin provides REST endpoints for managing sandboxd API keys:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sandboxd/v1/keys` | List all API keys |
| `POST` | `/api/sandboxd/v1/keys` | Create a new API key |
| `POST` | `/api/sandboxd/v1/keys/:keyId/rotate` | Rotate an API key |
| `DELETE` | `/api/sandboxd/v1/keys/:keyId` | Revoke an API key |

### Create API Key

```bash
curl -X POST http://localhost:7007/api/sandboxd/v1/keys \
  -H "Content-Type: application/json" \
  -d '{"name": "my-key", "description": "My API key"}'
```

### Rotate API Key

Rotation revokes the existing key and creates a replacement with the same name:

```bash
curl -X POST http://localhost:7007/api/sandboxd/v1/keys/key-abc123/rotate
```

### Revoke API Key

```bash
curl -X DELETE http://localhost:7007/api/sandboxd/v1/keys/key-abc123
```

## Preview URL Auth Gate

The plugin provides a Backstage session-based authentication gate for sandboxd preview URLs. sandboxd preview URLs are public by design — anyone with the URL can access the app. This module adds a gate so that only authenticated Backstage users can access sandboxd previews.

### Auth-Gated Preview URLs

When the frontend requests a preview URL via `POST /api/sandboxd/v1/apps/:appId/preview-url`, the backend validates the user's Backstage session and returns an auth-gated URL with a short-lived session token:

```bash
curl -X POST http://localhost:7007/api/sandboxd/v1/apps/app-123/preview-url
```

```json
{
  "url": "https://sandboxd.example.com/app/my-app?_bs_session=eyJhbGciOiJSUzI1NiIs...",
  "ttl": 3600,
  "tenantId": "company.com"
}
```

### Preview URL Session Validation

The `createPreviewSessionValidator` middleware validates session tokens on the proxy before forwarding requests to sandboxd. This is mounted on `/v1/preview` in the router.

## Backend Router Configuration

The `createRouter` function accepts an `IdentityApi` parameter:

```typescript
export async function createRouter(
  options: { config: Config; identityApi: IdentityApi },
): Promise<express.Router>
```

This is the standard Backstage backend plugin pattern — the `IdentityApi` is provided by Backstage's `createBackendApp` when the plugin is registered.

## Identity Resolution Endpoints

The backend exposes three identity resolution endpoints that the frontend hooks use to resolve the current user's sandboxd identity:

### GET /api/sandboxd/v1/identity/resolve

Returns the full identity — user entity reference, ownership entity refs, Backstage token, derived tenant ID, and sandboxd API token. This is the primary endpoint the `useSandboxdAuth` hook calls.

### GET /api/sandboxd/v1/identity/api-key

Returns just the sandboxd API token for the current user. This is what the `useSandboxdApiKey` hook calls.

### GET /api/sandboxd/v1/identity/tenant-id

Returns just the sandboxd tenant ID for the current user. This is what the `useSandboxdTenantId` hook calls.

## Configuration Reference

| Config Key | Default | Description |
|------------|---------|-------------|
| `sandboxd.token` | — | Shared API token for sandboxd (single-tenant mode) |
| `sandboxd.multiTenant.enabled` | `false` | Enable multi-tenant mode |
| `sandboxd.multiTenant.identityClaim` | `'email'` | Identity claim used to derive tenant ID |
| `sandboxd.previewUrl.ttl` | `3600` | How long preview session tokens are valid (seconds) |
