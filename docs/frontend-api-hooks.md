# API Hooks

The frontend plugin provides custom React hooks for communicating with the sandboxd backend proxy. All API calls route through `/api/sandboxd/v1/` — never directly to sandboxd.

## Core Types

```ts
type SandboxStatus = 'running' | 'sleeping' | 'stopped';

interface SandboxApp {
  name: string;
  status: SandboxStatus;
  previewUrl?: string;
  agentActive?: boolean;
  agentModel?: string;
}

interface SandboxFileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: SandboxFileNode[];
}

interface SandboxdSettings {
  sleepTimeout?: number;
  memoryLimitMb?: number;
  agentModel?: string;
  maxConcurrentApps?: number;
}

interface ResolvedSandboxdIdentity {
  userEntityRef: string;
  ownershipEntityRefs: string[];
  token?: string;
  tenantId: string | undefined;
  apiKey: string | undefined;
}
```

## Authentication Hooks

The authentication hooks read the sandboxd configuration from `app-config.yaml` and provide identity information for the current user.

|| Hook | Purpose |
|------|---------|
| `useSandboxdAuth()` | Resolve the current user's sandboxd identity — maps Backstage identity to sandboxd auth (tenant ID and API token) |
| `useSandboxdApiKey()` | Get the current user's sandboxd API token |
| `useSandboxdTenantId()` | Get the current user's sandboxd tenant ID |
| `useSandboxdIsMultiTenant()` | Check if multi-tenant mode is enabled |

### Example: Resolving Sandboxd Identity

```tsx
import { useSandboxdAuth, useSandboxdTenantId } from '@internal/backstage-plugin-sandboxd-frontend';

function TenantInfo() {
  const { value: identity } = useSandboxdAuth();
  const { value: tenantId } = useSandboxdTenantId();

  return (
    <Box>
      <Typography>User: {identity?.userEntityRef}</Typography>
      <Typography>Tenant: {tenantId || 'N/A'}</Typography>
    </Box>
  );
}
```

**Note:** The `useSandboxdAuth` hook reads the sandboxd configuration from `app-config.yaml` and resolves the identity based on multi-tenant mode settings. In single-tenant mode, the shared `sandboxd.token` is used. In multi-tenant mode, per-user tokens would need to be resolved from the backend (currently not implemented).

## App Lifecycle Hooks

|| Hook | Purpose |
|------|---------|
| `useSandboxdApps(entityName)` | Fetch the list of apps for an entity |
| `useSandboxdStartApp()` | Start a stopped/sleeping app |
| `useSandboxdStopApp()` | Stop a running app |
| `useSandboxdRestartApp()` | Restart a running app |
| `useSandboxdDestroyApp()` | Permanently delete an app |
| `useSandboxdSleepApp()` | Put an app to sleep |
| `useSandboxdWakeApp()` | Wake a sleeping app |

### Example: Starting an App

```tsx
import { useSandboxdStartApp } from '@internal/backstage-plugin-sandboxd-frontend';

function StartButton({ entityName, appName }) {
  const startApp = useSandboxdStartApp();

  return (
    <Button onClick={() => startApp(entityName, appName)}>
      Start App
    </Button>
  );
}
```

## File API Hooks

|| Hook | Purpose |
|------|---------|
| `useSandboxdFileTree(entityName)` | Fetch the file tree for the entity's sandbox |
| `useSandboxdReadFile()` | Read file content from the sandbox |
| `useSandboxdWriteFile()` | Write file content back to the sandbox |

### Example: Reading a File

```tsx
import { useSandboxdReadFile } from '@internal/backstage-plugin-sandboxd-frontend';

function FileReader({ entityName, filePath }) {
  const readFile = useSandboxdReadFile();

  const handleRead = async () => {
    const content = await readFile(entityName, filePath);
    console.log(content);
  };

  return <Button onClick={handleRead}>Read File</Button>;
}
```

## Agent Task Hooks

|| Hook | Purpose |
|------|---------|
| `useAgentTaskList(entityName)` | List all agent tasks for the entity |
| `useCreateAgentTask()` | Create a new agent task |
| `useCancelAgentTask()` | Cancel a running task |
| `useUndoAgentTask()` | Undo a completed task via checkpoint |
| `useSseAgentTaskProgress(entityName, taskId)` | Stream task progress via SSE |

## Settings Hooks

|| Hook | Purpose |
|------|---------|
| `useSandboxdSettings()` | Fetch current sandboxd settings |
| `useUpdateSandboxdSettings()` | Update sandboxd settings |

## App Store Hooks

|| Hook | Purpose |
|------|---------|
| `useSandboxdPresets()` | Fetch available presets |
| `useSandboxdRecipes()` | Fetch framework-specific recipes |
| `useDeployPreset()` | Deploy from a preset |
| `useDeployManifest()` | Deploy from a custom manifest |
| `useValidateManifest()` | Validate a manifest |

## Agent Credentials Hooks

|| Hook | Purpose |
|------|---------|
| `useAgentCredentials()` | Fetch credential providers |
| `useUpdateAgentCredentials()` | Update a credential provider |
| `useAddAgentCredentials()` | Add a new credential provider |
| `useRemoveAgentCredentials()` | Remove a credential provider |

## API Key Management Hooks

|| Hook | Purpose |
|------|---------|
| `useSandboxdApiKeys(revalidateKey?)` | Fetch the list of sandboxd API keys |
| `useSandboxdCreateApiKey()` | Create a new sandboxd API key |
| `useSandboxdRotateApiKey()` | Rotate an existing sandboxd API key |
| `useSandboxdRevokeApiKey()` | Revoke an existing sandboxd API key |

### Example: Managing API Keys

```tsx
import {
  useSandboxdApiKeys,
  useSandboxdCreateApiKey,
} from '@internal/backstage-plugin-sandboxd-frontend';

function KeyList() {
  const { value: keys, loading, error } = useSandboxdApiKeys();
  const createKey = useSandboxdCreateApiKey();

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error.message}</Typography>;

  return (
    <List>
      {keys?.map((key) => (
        <ListItem key={key.id}>
          <ListItemText primary={key.name} secondary={key.state} />
        </ListItem>
      ))}
    </List>
  );
}
```

## Preview URL Hooks

|| Hook | Purpose |
|------|---------|
| `useSandboxdPreviewUrl(appId)` | Get an auth-gated preview URL for a sandboxd app |

### Example: Getting a Preview URL

```tsx
import { useSandboxdPreviewUrl } from '@internal/backstage-plugin-sandboxd-frontend';

function PreviewButton({ appId }) {
  const { value: previewUrl } = useSandboxdPreviewUrl(appId);

  return (
    <Button href={previewUrl?.url} target="_blank">
      Preview
    </Button>
  );
}
```
