# Scaffolder Templates

The sandboxd plugin includes Backstage Software Templates for scaffolding new applications with sandboxd integration.

## Available Templates

| Template | Title | Description |
|----------|-------|-------------|
| `sandboxd-react-vite` | React + Vite App (sandboxd) | Scaffold a React + Vite application with sandboxd runtime annotations |
| `sandboxd-nextjs` | Next.js App (sandboxd) | Scaffold a Next.js application with sandboxd runtime annotations |
| `sandboxd-fastapi` | FastAPI App (sandboxd) | Scaffold a FastAPI application with sandboxd runtime annotations |
| `sandboxd-ai-app` | AI-Driven App with Sandboxd | Create a new application using sandboxd's AI coding agents |

## Standard Templates

The standard templates (`sandboxd-react-vite`, `sandboxd-nextjs`, `sandboxd-fastapi`) follow a common pattern:

1. **Fetch a base skeleton** — The template fetches a skeleton from `./skeleton` with parameters filled in
2. **Publish** — Publishes the generated files to the repository
3. **Register** — Registers the entity in the Backstage catalog

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | Application name |
| `owner` | `string` | Yes | Owner of the component (e.g., `team:sandboxd`) |
| `preset` | `string` | No | sandboxd runtime preset (`react-vite`, `react-cra`, `nextjs`, `fastapi`, `custom`). Defaults to the template's preset. |
| `repoUrl` | `string` | Yes | Repository location (using `RepoPicker` UI field) |

### Output Links

After completion, the template provides two output links:

| Link | Icon | Description |
|------|------|-------------|
| Open in Catalog | `catalog` | Links to the entity in the Backstage catalog |
| Open in sandboxd | `sandboxd` | Links to the entity's sandboxd page |

### Template Example

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: sandboxd-react-vite
  title: React + Vite App (sandboxd)
  description: >-
    Scaffold a React + Vite application with sandboxd runtime annotations.
    The app is automatically registered in the Backstage catalog and
    provisioned into a sandboxd sandbox for preview and development.
spec:
  owner: sandboxd-team
  type: service

  parameters:
    - title: Provide application details
      required:
        - name
        - owner
      properties:
        name:
          title: Application Name
          type: string
          description: Unique name for the application
          ui:autofocus: true
        owner:
          title: Owner
          type: string
          description: Owner of the component (e.g., team:sandboxd)
        preset:
          title: sandboxd Preset
          type: string
          description: The sandboxd runtime preset to use for this application.
          enum:
            - react-vite
            - react-cra
            - nextjs
            - fastapi
            - custom
          default: react-vite

    - title: Choose a repository
      required:
        - repoUrl
      properties:
        repoUrl:
          title: Repository Location
          type: string
          ui:field: RepoPicker

  steps:
    - id: fetch-base
      name: Fetch Base
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
          owner: ${{ parameters.owner }}
          preset: ${{ parameters.preset }}

    - id: publish
      name: Publish
      action: publish:backstage

    - id: register
      name: Register
      action: catalog:register
      input:
        catalogInfoUrl: ./app-config.yaml

  output:
    links:
      - title: Open in Catalog
        icon: catalog
        entityRef: ${{ steps.register.output.entityRef }}
      - title: Open in sandboxd
        icon: sandboxd
        url: ${{ steps.register.output.entityRef }}
```

## AI App Template

The `sandboxd-ai-app` template is a specialized template that leverages sandboxd's AI coding agents to scaffold applications from natural language prompts.

### Parameters

#### Application Details

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | A unique name for your application |
| `description` | `string` | Yes | A brief description of the application |
| `prompt` | `string` | Yes | Describe what you want the AI agent to build. Be specific about the technology stack, features, and requirements. |

#### Agent Configuration

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `agent` | `string` | Yes | — | Choose the AI agent: `opencode` or `claude-code` |
| `model` | `string` | No | — | Optional: Override the default model for this agent |
| `memoryLimitMb` | `number` | No | `512` | Maximum memory allocation for the sandbox |
| `runtime` | `string` | No | `node` | Runtime environment: `node`, `python`, or `java` |

### Template Steps

1. **Register Entity** — Registers the entity in the Backstage catalog with sandboxd annotations:
   ```yaml
   - id: register-entity
     name: Register Entity
     action: catalog:register
     input:
       entityYaml:
         apiVersion: backstage.io/v1alpha1
         kind: Component
         metadata:
           name: ${{ parameters.name }}
           description: ${{ parameters.description }}
           annotations:
             sandboxd.backstage.io/sandboxd-enabled: 'true'
             sandboxd.backstage.io/runtime: ${{ parameters.runtime }}
             sandboxd.backstage.io/memory-limit-mb: ${{ parameters.memoryLimitMb }}
             sandboxd.backstage.io/auto-provision: 'true'
             sandboxd.backstage.io/agent-model: ${{ parameters.model }}
         spec:
           type: service
           lifecycle: experimental
           owner: ${{ user.entity.metadata.name || 'default' }}
   ```

2. **Provision Sandbox** — Provisions the sandbox via the sandboxd backend proxy:
   ```yaml
   - id: provision-sandbox
     name: Provision Sandbox
     action: http:backstage:request
     input:
       method: POST
       path: /api/sandboxd/v1/entities/${{ parameters.name }}/apps
       headers:
         Content-Type: application/json
       body:
         runtime: ${{ parameters.runtime }}
         memoryLimitMb: ${{ parameters.memoryLimitMb }}
   ```

3. **Create Agent Task** — Creates the AI agent task via the sandboxd backend proxy:
   ```yaml
   - id: create-agent-task
     name: Create Agent Task
     action: http:backstage:request
     input:
       method: POST
       path: /api/sandboxd/v1/entities/${{ parameters.name }}/tasks
       headers:
         Content-Type: application/json
       body:
         agent: ${{ parameters.agent }}
         prompt: ${{ parameters.prompt }}
         model: ${{ parameters.model }}
   ```

### Output Links

| Link | Icon | Description |
|------|------|-------------|
| View Entity | `catalog` | Links to the entity in the Backstage catalog |
| Open Sandboxd | `code` | Links to the entity's sandboxd page |

## Registering Templates

To register these templates in your Backstage instance, add them to the scaffolder configuration:

```yaml
scaffolder:
  actions:
    - action: sandboxd:deploy
      name: Deploy to sandboxd
```

The templates are included in the `templates/` directory and can be referenced from any Backstage instance that has the `@backstage/plugin-scaffolder-backend` installed.
