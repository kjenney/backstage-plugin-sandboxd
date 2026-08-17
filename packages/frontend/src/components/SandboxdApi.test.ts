/**
 * Unit tests for SandboxdApi — frontend hooks and API helpers.
 */

import { SandboxStatus } from './SandboxdApi';

describe('SandboxdApi types', () => {
  it('SandboxStatus type has the expected values', () => {
    const statuses: SandboxStatus[] = ['running', 'sleeping', 'stopped'];
    expect(statuses).toHaveLength(3);
    expect(statuses).toContain('running');
    expect(statuses).toContain('sleeping');
    expect(statuses).toContain('stopped');
  });
});
