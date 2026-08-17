# Preview URL Authentication

Sandboxd preview URLs are public by design — anyone with the URL can access the app. This module adds a Backstage session-based auth gate so that only authenticated Backstage users can access sandboxd previews.

## Overview

The preview URL auth gate provides:

1. **Auth-gated preview URLs** — Preview URLs include a Backstage session token
2. **Session validation** — The backend validates the user's Backstage identity before returning the URL
3. **Short-lived sessions** — Session tokens have a TTL (default: 1 hour)

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Frontend   │────▶│  Backend Proxy   │────▶│ sandboxd     │
│             │     │                  │     │ Preview Server│
│  Click      │     │  1. Validate     │     │              │
│  "Open      │     │     Identity     │     │              │
│  Preview"   │     │  2. Return       │     │              │
│  button     │     │     gated URL    │     │              │
└─────────────┘     └──────────────────┘     └──────────────┘
```

## API Endpoint

### Get Auth-Gated Preview URL

```
POST /api/sandboxd/v1/apps/:appId/preview-url
```

**Request body:** None

**Response:**

```json
{
  "url": "https://sandboxd.example.com/preview/app-123?_bs_session=eyJhbGciOiJ...",
  "ttl": 3600
}
```

The response includes:
- `url` — The sandboxd preview URL with the Backstage session token appended as `_bs_session`
- `ttl` — How long the session token is valid (in seconds, default: 3600)

## Frontend Hook

```typescript
import { useSandboxdPreviewUrl } from '../ApiKeyManagement/PreviewUrlApi';

const { value: gatedPreviewUrl, loading } = useSandboxdPreviewUrl(appId);
```

The hook returns:
- `value` — The `AuthGatedPreviewUrl` object (or `null` if loading/error)
- `loading` — Whether the URL is being fetched

## Usage in Components

The `AppStoreCard` component automatically uses the auth-gated preview URL:

```tsx
const { value: gatedPreviewUrl, loading: previewLoading } = useSandboxdPreviewUrl(
  config.appId || '',
);

const effectivePreviewUrl = gatedPreviewUrl?.url || app?.previewUrl || config.previewUrl;

// Use effectivePreviewUrl instead of the raw preview URL
<Button component="a" href={effectivePreviewUrl} target="_blank">
  Open Preview
</Button>
```

## Configuration

| Config Key | Default | Description |
|------------|---------|-------------|
| `sandboxd.previewUrl.ttl` | `3600` | How long the preview session token is valid (seconds) |

## Security Considerations

- **Session tokens are short-lived** — The default TTL is 1 hour, configurable via `sandboxd.previewUrl.ttl`
- **Tokens are only shown once** — The session token is included in the URL only when the backend returns it; it cannot be retrieved again
- **Preview URLs are HTTPS-only** — Always use HTTPS for sandboxd preview URLs to protect the session token in transit
- **Session validation** — The sandboxd preview server should validate the `_bs_session` query parameter before serving content

## Preview Iframe

The plugin also includes a `PreviewIframe` component that embeds the sandboxd preview directly in the entity page as an iframe. This is the recommended way to view previews — it provides a wake-state indicator, copy-to-clipboard, and fullscreen mode.

See [Preview Iframe](frontend-preview-iframe.md) for details.

For sandboxd to validate the Backstage session token, the preview server should:

1. Extract the `_bs_session` query parameter from the request
2. Validate the token by calling Backstage's auth API (e.g., token validation endpoint)
3. Reject requests without a valid token with a 401 response
4. Serve content only for valid, non-expired tokens
