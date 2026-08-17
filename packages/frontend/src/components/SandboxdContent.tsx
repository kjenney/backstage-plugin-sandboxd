import {
  Content,
  ContentHeader,
  HeaderLabel,
  TabbedLayout,
} from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import { isSandboxdAvailable } from './AppCard/isSandboxdAvailable';
import { AppListView } from './AppListView/AppListView';
import { CodeEditor } from './CodeEditor/CodeEditor';
import { Terminal as TerminalComponent } from './Terminal/Terminal';
import { SettingsPanel } from './SettingsPanel/SettingsPanel';
import { AgentTaskList } from './AgentTask';
import { AgentCredentialsPanel } from './AgentCredentials';
import { AppStoreView } from './AppStore/AppStoreView';
import { DeployedAppsView } from './AppStore/DeployedAppsView';
import { RuntimeManifestEditor } from './AppStore/RuntimeManifestEditor';
import { ApiKeyManagementPanel } from './ApiKeyManagement/ApiKeyManagementPanel';

/**
 * Main content component for the sandboxd plugin.
 *
 * Renders a tabbed interface with:
 * - Apps: list of sandboxd apps with status and preview URLs
 * - Agent Tasks: manage AI coding agent tasks (create, monitor, cancel, undo)
 * - Code Editor: CodeMirror-based file editor with file tree
 * - Terminal: xterm-based terminal connected to sandboxd
 * - Settings: runtime lifecycle and agent configuration
 * - Credentials: agent credential provider management
 * - App Store: browse curated apps and deploy
 * - Deployed: view and manage deployed apps
 * - Manifest: custom runtime manifest editor
 *
 * Requires the entity to have the sandboxd annotation.
 */
export const SandboxdContent = () => {
  const { entity } = useEntity();
  const entityName = entity.metadata.name;
  const sandboxdAvailable = isSandboxdAvailable(entity);

  if (!sandboxdAvailable) {
    return (
      <Content>
        <ContentHeader
          title={`Sandboxd — ${entityName}`}
        >
          <HeaderLabel
            label="Status"
            value="Not configured"
          />
        </ContentHeader>
      </Content>
    );
  }

  return (
    <Content>
      <ContentHeader
        title={`Sandboxd — ${entityName}`}
      >
        <HeaderLabel label="Status" value="Active" />
      </ContentHeader>
      <TabbedLayout>
        <TabbedLayout.Route path="/apps" title="Apps">
          <AppListView />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/agent-tasks" title="Agent Tasks">
          <AgentTaskList />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/code" title="Code Editor">
          <CodeEditor />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/terminal" title="Terminal">
          <TerminalComponent />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/settings" title="Settings">
          <SettingsPanel />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/credentials" title="Credentials">
          <AgentCredentialsPanel />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/app-store" title="App Store">
          <AppStoreView />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/deployed" title="Deployed">
          <DeployedAppsView />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/manifest" title="Manifest">
          <RuntimeManifestEditor />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/security" title="Security">
          <ApiKeyManagementPanel />
        </TabbedLayout.Route>
      </TabbedLayout>
    </Content>
  );
};
