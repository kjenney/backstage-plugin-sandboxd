# Agent Credentials

The Agent Credentials panel manages API credentials for AI agent providers. Credentials are stored securely in sandboxd's credential-injecting proxy — they never leave the infrastructure.

## Features

- **List providers** — View all configured agent credential providers
- **Add provider** — Add a new credential provider (OpenAI, Anthropic, or custom endpoint)
- **Update provider** — Update an existing provider's API key
- **Remove provider** — Delete a credential provider

## Provider Types

| Provider | Description |
|----------|-------------|
| `openai` | OpenAI API (GPT-4, etc.) |
| `anthropic` | Anthropic API (Claude, etc.) |
| `custom` | Custom endpoint with a custom URL |

## Usage

```tsx
import { AgentCredentialsPanel } from '@internal/backstage-plugin-sandboxd-frontend';

// Standalone usage
<Entity.layout.Content title="Agent Credentials">
  <AgentCredentialsPanel />
</Entity.layout.Content>
```

## API Hooks

| Hook | Purpose |
|------|---------|
| `useAgentCredentials()` | Fetch the current credential configuration |
| `useUpdateAgentCredentials()` | Update an existing credential provider |
| `useAddAgentCredentials()` | Add a new credential provider |
| `useRemoveAgentCredentials()` | Remove a credential provider |

## Data Types

```ts
// Credential configuration (read)
interface AgentCredentialConfig {
  provider: string;           // 'openai' | 'anthropic' | 'custom'
  apiKeySet: boolean;         // Whether the API key is configured
  models: string[];           // Available models for this provider
  endpoint?: string;          // Custom endpoint if provider is 'custom'
}

// Credential update (write)
interface AgentCredentialUpdate {
  provider?: string;
  apiKey?: string;
  endpoint?: string;
}
```

## Backend Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/v1/agent/credentials` | List credential providers |
| `PUT` | `/v1/agent/credentials` | Update credential config |
| `POST` | `/v1/agent/credentials` | Add new provider |
| `DELETE` | `/v1/agent/credentials/:provider` | Remove provider |

## Security Notes

- API keys are stored server-side in sandboxd's credential-injecting proxy
- Keys are never exposed to the frontend — only `apiKeySet: true/false` is returned
- The backend injects the `Authorization` header when proxying requests to sandboxd
