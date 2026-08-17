# API Key Management

The sandboxd Backstage plugin provides a UI for managing sandboxd API keys — creating, rotating, and revoking keys from within Backstage.

## Accessing the Panel

The API Key Management panel is available in the **Security** tab on the entity page. Navigate to any entity with sandboxd enabled and click the "Security" tab to access it.

## API Key Management Panel

The API Key Management panel displays:

### Current Identity

The panel shows the current user's sandboxd identity at the top:

- **User** — The Backstage user entity reference (e.g., `User:default/john`)
- **Tenant** — The derived sandboxd tenant ID (only shown in multi-tenant mode, e.g., `company.com`)
- **API Key** — The current user's sandboxd API token status (masked by default, toggleable for visibility)

The identity information is read directly from the Backstage configuration (`app-config.yaml`) — the `sandboxd.token` value is used as the API token, and multi-tenant mode is detected from `sandboxd.multiTenant.enabled`.

### API Key Table

The panel displays a table of existing API keys with the following actions:

- **Create** — Create a new API key with a name, optional description, and optional expiry date
- **Rotate** — Revoke the current key and create a replacement with the same name (new key value shown once)
- **Revoke** — Permanently revoke a key (cannot be restored)
- **Toggle visibility** — Show/hide the full key value (only the key prefix is shown by default)

## API Endpoints

The frontend communicates with the backend proxy for key management:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sandboxd/v1/keys` | List all API keys |
| `POST` | `/api/sandboxd/v1/keys` | Create a new API key |
| `POST` | `/api/sandboxd/v1/keys/:keyId/rotate` | Rotate an API key |
| `DELETE` | `/api/sandboxd/v1/keys/:keyId` | Revoke an API key |

## API Key Lifecycle

Each sandboxd API key has a lifecycle with three possible states:

| State | Description |
|-------|-------------|
| **active** | The key is valid and can be used for authentication |
| **expired** | The key has passed its expiry date and is no longer valid |
| **revoked** | The key was manually revoked and is no longer valid |

When a key is rotated, the old key is automatically revoked and a new key with the same name is created.

## API Key Data

Each API key resource includes:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique key identifier |
| `name` | `string` | Human-readable key name |
| `description` | `string \| undefined` | Optional description |
| `createdAt` | `string` | ISO 8601 creation timestamp |
| `expiresAt` | `string \| null` | ISO 8601 expiry timestamp (null if never) |
| `state` | `'active' \| 'expired' \| 'revoked'` | Current key state |
| `keyPrefix` | `string` | Last 4 characters of the key for display |

## Security Considerations

- API keys are **only** shown in full once at creation time — the full key value cannot be retrieved again
- The key prefix (last 4 characters) is always visible for key identification
- Revoked keys cannot be restored — a new key must be created
- Rotated keys are automatically revoked — the old key value is no longer valid
- In multi-tenant mode, API keys are scoped to the user's tenant — users can only manage keys within their tenant
- The API key status in the Current Identity section shows whether the user has a valid sandboxd API token
