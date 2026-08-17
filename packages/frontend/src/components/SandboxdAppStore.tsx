import React from 'react';
import {
  Page,
  Content,
  ContentHeader,
  HeaderLabel,
  TabbedLayout,
} from '@backstage/core-components';
import { AppStoreView } from './AppStore/AppStoreView';
import { DeployedAppsView } from './AppStore/DeployedAppsView';
import { RuntimeManifestEditor } from './AppStore/RuntimeManifestEditor';

/**
 * Standalone App Store page for the sandboxd plugin.
 *
 * Provides three tabs:
 *   - App Store: Browse and deploy curated apps
 *   - Deployed: View and manage deployed apps
 *   - Manifest Editor: Write custom runtime manifests
 */
export const SandboxdAppStore = () => (
  <Page themeId="tool">
    <Content>
      <ContentHeader title="Sandboxd App Store">
        <HeaderLabel label="Status" value="Active" />
      </ContentHeader>
      <TabbedLayout>
        <TabbedLayout.Route path="/store" title="App Store">
          <AppStoreView />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/deployed" title="Deployed">
          <DeployedAppsView />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/manifest" title="Manifest Editor">
          <RuntimeManifestEditor />
        </TabbedLayout.Route>
      </TabbedLayout>
    </Content>
  </Page>
);
