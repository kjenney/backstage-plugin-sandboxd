# Testing

The sandboxd Backstage plugin includes unit tests and integration tests for both the frontend and backend packages.

## Test Framework

- **Frontend**: React Testing Library (via `@testing-library/react`) + Jest
- **Backend**: Jest + Node.js native `http` module mocking

## Running Tests

```bash
# Run all tests
npx backstage-cli package test

# Run frontend tests only
cd packages/frontend && npx backstage-cli package test

# Run backend tests only
cd packages/backend && npx backstage-cli package test
```

## Frontend Tests

### AppCardStatus

Tests the colored status indicator component for sandbox app states:

```tsx
import { AppCardStatus } from '@internal/backstage-plugin-sandboxd-frontend';

// Tests:
// - running → green "Running" chip
// - sleeping → amber "Sleeping" chip
// - stopped → red "Stopped" chip
```

### SandboxdApi

Tests the core API types and hooks:

```tsx
import { SandboxStatus, useSandboxdApps, SandboxApp } from '@internal/backstage-plugin-sandboxd-frontend';

// Tests:
// - SandboxStatus type has expected values ('running' | 'sleeping' | 'stopped')
// - SandboxApp interface structure
// - API hook type signatures
```

### AppStoreApi

Tests the App Store API wrapper:

```tsx
import { API_BASE, sandboxdFetch } from '@internal/backstage-plugin-sandboxd-frontend';

// Tests:
// - API_BASE constant is correct
// - Fetch wrapper includes proper headers
```

## Backend Tests

### HealthCheck

Tests the health check logic:

```tsx
import { SandboxdHealthCheck } from '@internal/backstage-plugin-sandboxd-backend';

// Tests:
// - getStatus() returns correct initial state
// - 200 response → healthy=true
// - Non-200 response → healthy=false
// - Network error → healthy=false, error set
// - Timeout → healthy=false, error='Health check timeout'
// - start()/stop() lifecycle
```

### SSE Proxy

Tests the Server-Sent Events proxy handler:

```tsx
import { createSseProxyHandler } from '@internal/backstage-plugin-sandboxd-backend';

// Tests:
// - Missing taskId → 400
// - SSE headers set correctly
// - Non-200 upstream → error event written
// - Upstream close → "closed" event written
// - Upstream error → error event written
// - Client disconnect → upstream connection closed
// - Proxy connection failure → 502 JSON
```

### Preview Auth

Tests the preview URL authentication gate:

```tsx
import {
  createPreviewUrlHandler,
  createPreviewSessionValidator,
} from '@internal/backstage-plugin-sandboxd-backend';

// Tests:
// - Missing appId → 400
// - No Backstage identity → 401
// - Unresolvable identity → 401
// - No preview URL → 404
// - Auth-gated URL construction with session token and TTL
// - Session validator rejects missing tokens → 401
// - Session validator rejects expired tokens → 401
// - Session validator accepts valid tokens → calls next()
// - Non-preview requests pass through
```

### Router

Tests the router structure and handler factories:

```tsx
// Tests:
// - /health endpoint returns correct status structure
// - Route priority: SSE proxy before wildcard
// - All lifecycle endpoints exist (destroy, sleep, wake)
// - All agent task endpoints exist (list, create, get, cancel, undo)
// - All app store endpoints exist (17 endpoints total)
// - Identity endpoints (resolve, api-key, tenant-id)
// - API key management endpoints (list, create, rotate, revoke)
// - Agent credential endpoints (list, update, add, remove)
// - Wildcard proxy removes hop-by-hop headers
// - Handler factory target path construction for all actions
// - Authorization header injection when token present
// - 502 error responses when upstream unreachable
```

## CI Pipeline

The GitHub Actions CI pipeline runs automatically on push to `main` and on pull requests:

```yaml
# .github/workflows/ci.yml
# - Build: Node.js 20.x and 22.x matrix
# - Test: Frontend + Backend
# - Lint: Full lint check
# - Publish: npm publish on main branch push
```

The publish step requires `NPM_TOKEN` to be set in repository secrets.
