# Identity Resolution

The sandboxd Backstage plugin provides identity resolution endpoints that map Backstage user identity to sandboxd authentication tokens and tenant IDs. These endpoints are called by the frontend hooks to resolve the current user's sandboxd identity.

## Overview

When a Backstage user interacts with the plugin, the backend resolves their identity through the following flow:

1. The frontend calls an identity resolution endpoint (e.g., `GET /api/sandboxd/v1/identity/resolve`)
2. The backend uses the `SandboxdAuthApi` to obtain the user's Backstage identity via `IdentityApi.getIdentity()`
3. The backend maps the Backstage identity to a sandboxd API token and tenant ID based on the configured mode

## Identity Resolution Endpoint

### GET /api/sandboxd/v1/identity/resolve

Returns the full identity — user entity reference, ownership entity refs, Backstage token, derived tenant ID, and sandboxd API token.

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

## API Key Endpoint

### GET /api/sandboxd/v1/identity/api-key

Returns just the sandboxd API token for the current user. In single-tenant mode, returns the shared token. In multi-tenant mode, returns the user's tenant-scoped token.

**Response:**

```json
{
  "apiKey": "sk_****"
}
```

## Tenant ID Endpoint

### GET /api/sandboxd/v1/identity/tenant-id

Returns just the sandboxd tenant ID for the current user. In single-tenant mode, returns `null`. In multi-tenant mode, returns the tenant derived from the user's Backstage identity (e.g., email domain).

**Response:**

```json
{
  "tenantId": "example.com"
}
```

## Backend Implementation

The identity resolution is implemented in three handler functions in `router.ts`:

```typescript
function createIdentityResolveHandler(
  authApi: SandboxdAuthApi,
  logger: Console,
): express.RequestHandler {
  return async (_req, res) => {
    const identity = await authApi.resolveIdentity();
    if (!identity) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    res.json(identity);
  };
}

function createApiKeyResolveHandler(
  authApi: SandboxdAuthApi,
  logger: Console,
): express.RequestHandler {
  return async (_req, res) => {
    const apiKey = await authApi.getApiKey();
    res.json({ apiKey });
  };
}

function createTenantIdResolveHandler(
  authApi: SandboxdAuthApi,
  logger: Console,
): express.RequestHandler {
  return async (_req, res) => {
    const tenantId = await authApi.getTenantId();
    res.json({ tenantId });
  };
}
```

## Frontend Usage

The frontend hooks use these endpoints to resolve identity:

```typescript
// Resolve full identity
const { value: identity } = useSandboxdAuth();
// Returns: ResolvedSandboxdIdentity { userEntityRef, token, tenantId, apiKey }

// Get just the API token
const { value: apiKey } = useSandboxdApiKey();
// Returns: string | undefined

// Get just the tenant ID
const { value: tenantId } = useSandboxdTenantId();
// Returns: string | undefined
```

## Configuration

The identity resolution behavior is controlled by the `sandboxd.multiTenant` configuration:

```yaml
sandboxd:
  # Single-tenant: shared token for all users
  token: '${SANDBOXD_API_TOKEN}'
  multiTenant:
    enabled: false

# Multi-tenant: per-user tokens from Backstage identity
sandboxd:
  token: '${SANDBOXD_API_TOKEN}'  # fallback for unauthenticated requests
  multiTenant:
    enabled: true
    identityClaim: 'email'  # tenant = email domain
```

In single-tenant mode, all users share the same `sandboxd.token` and no tenant ID is resolved. In multi-tenant mode, the `identityClaim` determines how the tenant is derived from the Backstage user identity.
