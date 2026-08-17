import { Page, Content, ContentHeader, HeaderLabel } from '@backstage/core-components';
import { SandboxdContent } from './SandboxdContent';

/**
 * Root page component for the standalone sandboxd plugin route.
 */
export const SandboxdRoot = () => (
  <Page themeId="tool">
    <Content>
      <ContentHeader title="Sandboxd">
        <HeaderLabel label="Status" value="Active" />
      </ContentHeader>
      <SandboxdContent />
    </Content>
  </Page>
);
