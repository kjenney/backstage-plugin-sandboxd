# Preview URL Auth Gate

The sandboxd Backstage plugin adds a Backstage session-based authentication gate for sandboxd preview URLs. sandboxd preview URLs are public by design — anyone with the URL can access the app. This module prevents unauthorized access by requiring a valid Backstage session token.

## Overview

The preview URL auth gate provides two capabilities:

1. **Auth-gated preview URLs** — Returns preview URLs with a short-lived session token appended, validated by the backend
2. **Preview URL session validation middleware** — Validates session tokens on the proxy before forwarding requests to sandboxd

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Frontend   │────▶│  Backstage Auth │────▶│  Proxy Router   │
│             │     │  (IdentityApi)  │     │                 │
│             │     │                 │     │  ┌────────────┐ │
│             │     │                 │     │  │ Session    │ │
│             │     │                 │     │  │ Validator  │ │
│             │     │                 │     │  └─────┬──────┘ │
│             │     │                 │     │        │        │
│             │     │                 │     │        ▼        │
│             │     │                 │     │  ┌────────────┐ │
│             │     │                 │     │  │  sandboxd  │ │
│             │     │                 │     │  │  Preview   │ │
│             │     │                 │     │  │  Server    │ │
│             │     │                 │     │  └────────────┘ │
└─────────────┘     └─────────────────┘     └─────────────────┘
```

## Auth-Gated Preview URLs

When the frontend requests a preview URL via `POST /api/sandboxd/v1/apps/:appId/preview-url`, the backend:

1. Validates the user's Backstage identity via the IdentityApi
2. Resolves the user's sandboxd tenant ID and API token
3. Fetches the app from sandboxd to get the preview URL
4. Constructs an auth-gated URL with a short-lived session token appended

### Request

```http
POST /api/sandboxd/v1/apps/:appId/preview-url
```

### Response

```json
{
  "url": "https://sandboxd.example.com/app/my-app?_bs_session=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "ttl": 3600,
  "tenantId": "company.com"
}
```

### Query Parameters

| Parameter | Description |
|-----------|-------------|
| `_bs_session` | The Backstage identity token (JWT) — used to validate the session |
| `_bs_ttl` | How long the session token is valid (seconds) — default: 3600 (1 hour) |
| `_bs_issued_at` | Unix timestamp when the token was issued — used for TTL validation |

## Preview URL Session Validation Middleware

The `createPreviewSessionValidator` middleware validates session tokens on the proxy before forwarding requests to sandboxd.

### How It Works

1. When a request hits `/preview`, the middleware checks for `_bs_session` and `_bs_ttl` query parameters
2. If no session token is provided, the request is rejected with `401`
3. The TTL is checked — if the token has expired, the request is rejected with `401`
4. If the session is valid, the request is forwarded to sandboxd

### Request Flow

```
Request: GET /preview?_bs_session=JWT_TOKEN&_bs_ttl=3600
         ↓
    [Session Validator Middleware]
         ↓
    Validated: session exists and hasn't expired
         ↓
    Forward to: GET https://sandboxd.example.com/preview
```

### Configuration

The preview URL TTL is configurable:

```yaml
sandboxd:
  previewUrl:
    ttl: 3600  # default: 3600 seconds (1 hour)
```

## Security Considerations

- **Session tokens are short-lived** — default TTL is 1 hour, configurable
- **Tokens are never exposed to the frontend** — the backend returns the full auth-gated URL
- **Preview URLs require a valid Backstage session** — no unauthenticated access
- **The session validator is middleware on the proxy** — requests to sandboxd are validated before forwarding

## Backend Router Configuration

The preview URL handler and session validator are registered in the router:

```typescript
// Create the auth-gated preview URL handler
const previewUrlHandler = createPreviewUrlHandler(
  baseUrl,
  token,
  authApi,
  options.config,
);

router.post(
  '/v1/apps/:appId/preview-url',
  previewUrlHandler,
);

// Register the session validator middleware
router.use('/v1/preview', createPreviewSessionValidator(authApi));
```

## API Reference

### Preview Iframe

The plugin also includes a `PreviewIframe` component that embeds the sandboxd preview directly in the entity page as an iframe. This component uses the same auth-gated preview URL API but adds:

- Wake-state indicator with pulse animation for sleeping sandboxes
- Copy-to-clipboard button for the preview URL
- Fullscreen toggle
- Sleep/Wake controls in the toolbar

See [Preview Iframe](frontend-preview-iframe.md) for frontend details.


Returns an auth-gated preview URL for a sandboxd app.

**Response:**

```json
{
  "url": "https://sandboxd.example.com/app/my-app?_bs_session=eyJhbGciOiJSUzI1NiIs...",
  "ttl": 3600,
  "tenantId": "company.com"
}
```

**Error responses:**

```json
{
  "error": "Authentication required",
  "message": "No valid Backstage session found for this request"
}
```

```json
{
  "error": "No preview URL available for this app"
}
```

```json
{
  "error": "Failed to fetch app from sandboxd",
  "detail": "404 Not Found"
}
```

### GET /preview

Preview URL session validation middleware — validates session tokens before forwarding to sandboxd.

**Query parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `_bs_session` | Yes | Backstage identity token |
| `_bs_ttl` | No | TTL in seconds (default: 3600) |
| `_bs_issued_at` | No | Unix timestamp when the token was issued |

**Error responses:**

```json
{
  "error": "Preview access denied",
  "message": "No Backstage session token provided"
}
```

```json
{
  "error": "Preview access denied",
  "message": "Session token has expired"
}
```
