# Health Check

The `SandboxdHealthCheck` service periodically checks if the sandboxd control plane is reachable and caches the result for the `/health` endpoint.

## Behavior

- On router startup, performs an immediate health check
- Subsequent checks occur at the interval specified by `sandboxd.healthCheckInterval` (default: 30 seconds)
- Results are cached and served from the `/health` endpoint
- If the control plane is unreachable, the health endpoint returns `503` with `"status": "degraded"`

## Health Endpoint

```
GET /health
```

### Response (healthy)

```json
{
  "status": "ok",
  "baseUrl": "http://localhost:9090",
  "sandboxd": {
    "healthy": true,
    "lastCheck": 1712345678000,
    "responseTimeMs": 12,
    "error": null
  },
  "provisioning": {
    "enabled": true,
    "provisionedCount": 3,
    "provisioned": [...]
  }
}
```

### Response (degraded)

```json
{
  "status": "degraded",
  "baseUrl": "http://localhost:9090",
  "sandboxd": {
    "healthy": false,
    "lastCheck": 1712345678000,
    "responseTimeMs": null,
    "error": "Connection refused"
  },
  "provisioning": {
    "enabled": true,
    "provisionedCount": 0,
    "provisioned": []
  }
}
```

## Health Status Object

```ts
interface HealthStatus {
  healthy: boolean;          // Overall sandboxd reachability
  lastCheck: number | null;  // Timestamp of last check (ms)
  responseTimeMs: number | null;  // Response time of last check
  error: string | null;      // Error message if unhealthy
}
```

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `sandboxd.healthCheckInterval` | `number` | `30000` | Interval between health checks (ms) |
