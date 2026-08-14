import React from 'react';
import { Navbar, Page, Content } from '@backstage/core-components';
import { SandboxdContent } from './SandboxdContent';

/**
 * Root page component for the standalone sandboxd plugin route.
 */
export const SandboxdRoot = () => (
  <Page themeId="tool">
    <Navbar title="Sandboxd" />
    <Content>
      <SandboxdContent />
    </Content>
  </Page>
);
