import React from 'react';
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

/**
 * Main content component for the sandboxd plugin.
 *
 * Renders a tabbed interface with:
 * - Apps: list of sandboxd apps with status and preview URLs
 * - Code Editor: CodeMirror-based file editor with file tree
 * - Terminal: xterm-based terminal connected to sandboxd
 * - Settings: runtime lifecycle and agent configuration
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
        <TabbedLayout.Route path="/code" title="Code Editor">
          <CodeEditor />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/terminal" title="Terminal">
          <TerminalComponent />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/settings" title="Settings">
          <SettingsPanel />
        </TabbedLayout.Route>
      </TabbedLayout>
    </Content>
  );
};
