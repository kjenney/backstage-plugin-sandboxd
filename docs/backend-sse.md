# SSE Proxy

The **SSE Proxy** forwards Server-Sent Events from sandboxd to the Backstage frontend, enabling real-time agent task progress streaming.

## How It Works

sandboxd streams agent task progress via Server-Sent Events (SSE). The SSE Proxy handler establishes a connection to sandboxd and pipes events through to the Backstage frontend in real-time.

```
┌─────────────┐     SSE events      ┌──────────────┐     SSE events     ┌──────────┐
│ sandboxd    │ ──────────────────▶ │ SSE Proxy    │ ──────────────────▶ │ Frontend │
│ Control     │                     │ (Backend)    │                     │          │
│ Plane       │                     │              │                     │          │
└─────────────┘                     └──────────────┘                     └──────────┘
```

## Route

```
GET /v1/tasks/:taskId/stream
```

This route is mounted **before** the wildcard `/v1/*` proxy so Express matches this specific route first.

## SSE Events

The SSE proxy streams the following event types from sandboxd:

| Event | Description |
|-------|-------------|
| `progress` | Streaming agent output (token-by-token) |
| `completed` | Task finished successfully |
| `error` | Task failed with an error |
| `checkpoint` | Checkpoint created (enables undo) |
| `closed` | Connection closed by sandboxd |

## Implementation

The handler sets the following SSE headers:

```ts
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
res.flushHeaders();
```

It connects to sandboxd using Node.js `http.Agent` with keep-alive enabled (30-second timeout):

```ts
const client = new http.Agent({
  keepAlive: true,
  timeout: 30000,
});

const proxyReq = http.get(
  {
    hostname: new URL(baseUrl).hostname,
    port: new URL(baseUrl).port,
    path: `/v1/tasks/${taskId}/stream`,
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'text/event-stream',
    },
    agent: client,
  },
  (proxyRes) => { /* ... */ },
);
```

## Client Disconnection

When the frontend client disconnects, the proxy closes the upstream connection:

```ts
req.on('close', () => {
  logger.info('SSE proxy: client disconnected');
  proxyReq.destroy();
});
```

## Error Handling

- **sandboxd returns non-200**: The proxy writes an error event and closes the connection
- **Upstream error**: Writes an error event and closes the connection
- **Connection error before headers sent**: Returns a 502 JSON response with the error details

## Usage

The SSE connection is established automatically when viewing the Agent Tasks tab in the frontend:

```tsx
import { useSseAgentTaskProgress } from '@internal/backstage-plugin-sandboxd-frontend';

const { progress, status, error } = useSseAgentTaskProgress(entityName, taskId);
```
