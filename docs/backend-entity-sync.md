# Entity Sync

The **Entity Sync** service bridges sandboxd deployed apps with the Backstage Software Catalog. When a sandboxd app is deployed (or already exists), this service ensures a corresponding Backstage entity exists with proper annotations for full sandboxd integration — lifecycle control, preview URLs, and agent tasks.

The sync runs periodically (configurable interval) and reconciles the state of sandboxd apps with the Backstage catalog via an EntityProvider.

## Architecture

Entity Sync operates in two modes:

1. **SandboxdEntityProvider** — The proper Backstage EntityProvider pattern. Register with a `CatalogBuilder` so entities flow through the catalog pipeline automatically. This is the recommended approach.
2. **SandboxdEntitySync** — A standalone periodic reconciler that uses the `CatalogClient` to query and update entities directly via the catalog API. This is a fallback for environments where `CatalogBuilder` access is unavailable.

Additionally, the `createEntityEndpoint` handler can be mounted on the backend router to create/update entities on demand when an app is deployed from the App Store.

```
┌─────────────────────────────────────────────────┐
│              Entity Sync                          │
│                                                   │
│  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ SandboxdEntity       │  │ SandboxdEntity   │  │
│  │ Provider             │  │ Sync (fallback)  │  │
│  │                      │  │                  │  │
│  │ getProviderName()    │  │ start()          │  │
│  │ provide() → Entity[] │  │ sync()           │  │
│  │ start() / stop()     │  │ stop()           │  │
│  └──────────────────────┘  └──────────────────┘  │
│         │                        │                │
│         ▼                        ▼                │
│  ┌──────────────────────────────────────┐         │
│  │  Backstage Catalog API               │         │
│  │  POST /api/catalog/entities          │         │
│  │  (upsert based on entity UID)        │         │
│  └──────────────────────────────────────┘         │
└─────────────────────────────────────────────────┘
```

## Entity Naming Convention

Each sandboxd app is mapped to a Backstage entity with the naming pattern:

```
sandboxd-<appName>
```

Where `appName` is lowercased and spaces are replaced with hyphens. For example, a sandboxd app named `"My Web App"` maps to the entity `sandboxd-my-web-app`.

## Entity Annotations

The entity includes annotations for sandboxd integration:

| Annotation | Description |
|------------|-------------|
| `sandboxd.backstage.io/app-id` | The sandboxd app identifier |
| `sandboxd.backstage.io/preview-url` | The app's preview URL |
| `sandboxd.backstage.io/status` | Current app status (`running`, `sleeping`, `stopped`) |
| `sandboxd.backstage.io/preset-id` | The preset that created this app (if any) |

These annotations enable the sandboxd frontend plugin to recognize and interact with auto-provisioned entities.

## Entity Structure

The auto-generated entity follows this structure:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: sandboxd-my-web-app
  description: Auto-generated Backstage entity for sandboxd app "My Web App" (preset: react-vite)
  annotations:
    sandboxd.backstage.io/app-id: abc123
    sandboxd.backstage.io/preview-url: https://my-web-app.sandboxd.local
    sandboxd.backstage.io/status: running
    sandboxd.backstage.io/preset-id: react-vite
  labels:
    sandboxd-backstage: "true"
spec:
  type: service
  owner: user:sandboxd-service
  lifecycle: production
```

The `lifecycle` field is set to `production` when the sandbox is running, and `experimental` otherwise.

## SandboxdEntityProvider (Recommended)

The `SandboxdEntityProvider` implements the standard Backstage `EntityProvider` interface and is started automatically by the backend router. It periodically fetches apps from sandboxd and provides corresponding entities to the catalog.

### Automatic Start (Default)

When the backend plugin is loaded, the router automatically starts the `SandboxdEntityProvider`:

```ts
// Inside the router (packages/backend/src/service/router.ts)
const entityProvider = new SandboxdEntityProvider({
  config: options.config,
  logger,
});
entityProvider.start();
```

The provider will:
1. Fetch all apps from sandboxd on startup
2. Provide entities to the catalog on each periodic sync
3. Continue syncing at the configured interval

### Manual Start via CatalogBuilder (Alternative)

If you need to register the provider with the catalog builder in your app's `app.ts` instead of the router:

```ts
import { SandboxdEntityProvider, registerCatalogEntity } from '@internal/backstage-plugin-sandboxd-backend';

const provider = new SandboxdEntityProvider({
  config,
  logger,
});

// Register with the catalog builder (from @backstage/backend-common)
builder.addEntityProvider(provider);

// For additional periodic syncs, you can also call start()/stop()
provider.start();
```

### Interface

```ts
interface EntityProviderInterface {
  /** Returns a unique provider name for catalog tracking */
  getProviderName(): string;
  /** Returns the array of entities to be synced into the catalog */
  provide(): Promise<Entity[]>;
}
```

### Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `getProviderName()` | `string` | Returns the unique provider identifier (`SandboxdEntityProvider`) |
| `provide()` | `Promise<Entity[]>` | Fetches apps from sandboxd, writes entities to the catalog, and returns them |
| `start()` | `void` | Starts the periodic sync loop |
| `stop()` | `void` | Stops the sync loop |
| `getStatus()` | `object` | Returns status: `{ active: boolean, intervalMs: number }` |

## SandboxdEntitySync (Fallback)

The `SandboxdEntitySync` is a standalone periodic reconciler for environments where `CatalogBuilder` access is unavailable:

```ts
import { SandboxdEntitySync } from '@internal/backstage-plugin-sandboxd-backend';
import { CatalogClient } from '@backstage/catalog-client';

const sync = new SandboxdEntitySync({
  config,
  catalogClient: new CatalogClient({
    discoveryApi: {
      getBaseUrl: async () => catalogBaseUrl,
    },
  }),
  logger,
});

sync.start();
```

### Methods

| Method | Description |
|--------|-------------|
| `start()` | Starts the periodic sync loop |
| `stop()` | Stops the sync loop |
| `getStatus()` | Returns status: `{ active: boolean, intervalMs: number, lastSync?: string, lastError?: string }` |

## createEntityEndpoint Handler

The `createEntityEndpoint` handler is mounted on the backend router at `POST /v1/apps/:appId/entity`. After a successful deploy, the frontend calls this endpoint to ensure the Backstage catalog has a matching entity with all sandboxd annotations.

### Flow

1. Fetches the app from sandboxd via `/v1/apps/:appId`
2. Builds a Backstage entity with sandboxd annotations
3. Upserts it via the Backstage catalog API (`POST /api/catalog/entities`)

### Usage

```ts
import { createEntityEndpoint } from '@internal/backstage-plugin-sandboxd-backend';

// Mounted as POST /v1/apps/:appId/entity
router.post(
  '/v1/apps/:appId/entity',
  createEntityEndpoint({ config, catalogClient, logger }),
);
```

### Frontend Integration

The frontend `DeployWizard` calls this endpoint after a successful deploy:

```ts
const createEntity = useSandboxdCreateEntity();
const app = await createApp(payload);

try {
  await createEntity(app.id);
} catch (entityErr) {
  // Entity creation failure is non-fatal — the entity sync provider
  // will pick up the entity on the next periodic sync
  console.warn('Failed to create Backstage entity for deployed app (will sync later):', entityErr);
}
```

### Scaffolder Action Integration

The `sandboxdDeployAction` scaffolder action also calls this endpoint:

```yaml
- id: deploy
  name: Deploy to sandboxd
  action: sandboxd:deploy
  input:
    name: my-app
    presetId: react-vite
```

The action automatically creates the Backstage entity after deploying the app.

## Configuration

Entity Sync reads the following configuration from `app-config.yaml`:

| Key | Type | Required | Default | Description |
|-----|------|----------|---------|-------------|
| `sandboxd.baseUrl` | `string` | Yes | — | sandboxd control-plane URL |
| `sandboxd.token` | `string` | No | — | API token for sandboxd auth |
| `sandboxd.catalogBaseUrl` | `string` | No | `backend.baseUrl` | Backstage catalog API URL |
| `sandboxd.entitySync.intervalMs` | `number` | No | `300000` | Entity sync interval in ms |
| `sandboxd.entitySync.owner` | `string` | No | `user:sandboxd-service` | Default owner for auto-generated entities |
