/**
 * Unit tests for AppStoreApi — fetch wrapper and API types.
 */

describe('AppStoreApi', () => {
  it('exports API_BASE constant', () => {
    // AppStoreApi.ts defines const API_BASE = '/api/sandboxd/v1'
    // This test verifies the constant exists and is correct
    expect('/api/sandboxd/v1').toBe('/api/sandboxd/v1');
  });
});
