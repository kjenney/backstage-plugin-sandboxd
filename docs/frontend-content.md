# SandboxdContent (Entity Page Tabs)

The `SandboxdContent` component renders a tabbed interface on Backstage entity pages. It requires the entity to have the `sandboxd.backstage.io/sandboxd-enabled: "true"` annotation.

## Tabs Overview

| Tab | Component | Description |
|-----|-----------|-------------|
| **Apps** | `AppListView` | List of sandboxd apps with status and preview URLs |
| **Agent Tasks** | `AgentTaskPanel` | Create, monitor, cancel, and undo AI coding agent tasks |
| **Code Editor** | `CodeEditor` | CodeMirror-based file editor with file tree |
| **Terminal** | `Terminal` | xterm.js terminal connected to the sandbox |
| **Settings** | `SettingsPanel` | Runtime lifecycle and agent configuration |
| **Credentials** | `AgentCredentialsPanel` | Agent credential provider management |
| **App Store** | `AppStoreView` | Browse curated apps and deploy |
| **Deployed** | `DeployedAppsView` | View and manage deployed apps |
| **Manifest** | `RuntimeManifestEditor` | Custom runtime manifest editor |

## Apps Tab

Shows a list of all sandboxd apps associated with the current entity, including:

- App name and status (running/sleeping/stopped)
- Preview URL links
- Quick-action buttons for lifecycle management

## Agent Tasks Tab

Manages AI coding agent tasks. See [Agent Tasks](frontend-agent-tasks.md) for full details.

## Code Editor Tab

A CodeMirror-powered editor with a file tree sidebar. See [Code Editor](frontend-code-editor.md) for details.

## Terminal Tab

An xterm.js terminal connected to the sandbox via sandboxd's terminal API. See [Terminal](frontend-terminal.md) for details.

## Settings Tab

Configures runtime lifecycle and agent settings via the sandboxd API:

- Sleep timeout (idle time before sandbox goes to sleep)
- Memory limit (in MB)
- Agent model (for AI-assisted coding)
- Maximum concurrent apps

## Credentials Tab

Manages agent credential providers. See [Agent Credentials](frontend-agent-credentials.md) for details.

## App Store Tab

Browse and deploy curated app presets. See [App Store](frontend-app-store.md) for details.

## Deployed Tab

View all apps deployed across the organization, with the ability to manage and delete them.

## Manifest Tab

Write and deploy custom `sandbox.yaml` runtime manifests. The editor includes:

- A CodeMirror editor for YAML editing
- A validate button that checks the manifest against sandboxd's schema
- A deploy button that creates an app from the manifest
