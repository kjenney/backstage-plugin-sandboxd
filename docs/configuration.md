# Configuration

The sandboxd plugin is configured through `app-config.yaml`. All configuration is under the `sandboxd` key.

## Configuration Reference

### Backend Configuration

| Key | Type | Required | Default | Description |
|-----|------|----------|---------|-------------|
| `sandboxd.baseUrl` | `string` | **Yes** | — | sandboxd control-plane URL (e.g., `http://localhost:9090`) |
| `sandboxd.token` | `string` | No | — | API token for sandboxd authentication. Use environment variable `SANDBOXD_API_TOKEN` to avoid hardcoding. |
| `sandboxd.catalogBaseUrl` | `string` | No | `backend.baseUrl` | Backstage catalog API URL for entity creation |
| `sandboxd.healthCheckInterval` | `number` | No | `30000` | How often (ms) to check sandboxd control-plane health |
| `sandboxd.entitySync.intervalMs` | `number` | No | `300000` | How often (ms) to sync sandboxd apps with the Backstage catalog |
| `sandboxd.entitySync.owner` | `string` | No | `user:sandboxd-service` | Default owner for auto-generated entities |
| `sandboxd.autoProvision.enabled` | `boolean` | No | `true` | Enable/disable auto-provisioning |
| `sandboxd.autoProvision.intervalMs` | `number` | No | `120000` | How often (ms) to check for new entities needing provisioning |
| `sandboxd.multiTenant.enabled` | `boolean` | No | `false` | Enable multi-tenant mode — routes requests per user via Backstage identity |
| `sandboxd.multiTenant.identityClaim` | `string` | No | `email` | Identity claim used to derive the sandboxd tenant (e.g., `email` extracts domain from user@company.com → company) |
| `sandboxd.previewUrl.ttl` | `number` | No | `3600` | How long preview session tokens are valid (seconds) |

### Example Configuration

```yaml
sandboxd:
  # The base URL of the sandboxd control-plane API (default: localhost:9090)
  baseUrl: 'http://localhost:9090'

  # API token for authenticating with sandboxd. If unset, requests are
  # forwarded without an Authorization header.
  # Use environment variable SANDBOXD_API_TOKEN to avoid hardcoding.
  token: '${SANDBOXD_API_TOKEN}'

  # How often (ms) to check sandboxd control-plane health. Default: 30000.
  healthCheckInterval: 30000

  # Automatic sandbox provisioning for entities with sandboxd annotations.
  autoProvision:
    # Enable/disable auto-provisioning. Default: true.
    enabled: true
    # How often (ms) to check for new entities needing provisioning. Default: 120000 (2 min).
    intervalMs: 120000

  # Entity sync configuration.
  entitySync:
    # How often (ms) to sync sandboxd apps with the Backstage catalog. Default: 300000 (5 min).
    intervalMs: 300000
    # Default owner for auto-generated entities. Default: user:sandboxd-service.
    owner: user:sandboxd-service

  # Multi-tenant mode — when enabled, sandboxd routes requests per user
  # using Backstage identity tokens instead of the shared sandboxd token.
  multiTenant:
    # Enable/disable multi-tenant mode. Default: false.
    enabled: false
    # Backstage user identity claim used to derive the sandboxd tenant.
    # Default: 'email' — extracts the domain from the user's email.
    identityClaim: 'email'

  # Preview URL TTL — how long auth-gated preview URLs are valid (seconds).
  # Default: 3600 (1 hour).
  previewUrl:
    ttl: 3600
```

### Example Multi-Tenant Configuration

```yaml
sandboxd:
  baseUrl: 'http://localhost:9090'
  token: '${SANDBOXD_API_TOKEN}'  # fallback for unauthenticated requests
  multiTenant:
    enabled: true
    identityClaim: 'email'  # tenant = email domain
  previewUrl:
    ttl: 7200  # 2 hours
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SANDBOXD_API_TOKEN` | sandboxd API token — recommended over `sandboxd.token` in `app-config.yaml` |

## Entity Annotations

In addition to backend configuration, individual entities are configured via annotations. See [Annotations](frontend-annotations.md) for the full reference.

## CORS Configuration

If you need to allow direct frontend-to-sandboxd communication (bypassing the backend proxy), configure CORS in the backend:

```yaml
backend:
  cors:
    origin: http://localhost:3000
    methods: [GET, HEAD, PATCH, POST, PUT, DELETE]
    credentials: true
```

## Health Check Endpoint

The backend exposes a health check endpoint at `GET /health` that reports the status of all backend services:

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

If sandboxd is unreachable, the endpoint returns `503` with `"status": "degraded"`.
