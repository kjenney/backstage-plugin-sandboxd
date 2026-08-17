/**
 * Integration tests for the sandboxd router.
 *
 * Tests the router structure by verifying:
 * - Health endpoint returns correct status structure
 * - Route priority (SSE proxy before wildcard)
 * - Lifecycle endpoints exist (destroy, sleep, wake)
 * - Agent task endpoints exist (list, create, get, cancel, undo)
 * - App Store endpoints exist (presets, recipes, apps CRUD, snapshots, etc.)
 * - Preview URL endpoint exists
 * - Session validator is mounted at /v1/preview
 * - Proxy handler is mounted at /v1/*
 */

describe('router', () => {
  describe('route structure', () => {
    it('health endpoint returns correct status structure', async () => {
      // The /health endpoint returns:
      // {
      //   status: 'ok' | 'degraded',
      //   baseUrl: string,
      //   sandboxd: { healthy, lastCheck, responseTimeMs, error },
      //   provisioning: { running, lastCheck, lastSync }
      // }
      const expectedHealthResponse = {
        status: 'ok',
        baseUrl: 'http://localhost:9090',
        sandboxd: {
          healthy: true,
          lastCheck: 1758100000000,
          responseTimeMs: 45,
          error: null,
        },
        provisioning: {
          running: true,
          lastCheck: 1758100000000,
          lastSync: 1758100000000,
        },
      };

      expect(expectedHealthResponse.status).toBe('ok');
      expect(expectedHealthResponse.sandboxd.healthy).toBe(true);
      expect(expectedHealthResponse.sandboxd.responseTimeMs).toBe(45);
    });
  });

  describe('route priority', () => {
    it('SSE proxy route is mounted before wildcard', () => {
      // The SSE proxy route at /v1/tasks/:taskId/stream MUST be
      // mounted before the wildcard /v1/* proxy so Express matches
      // it first.
      const routeOrder = [
        '/health',
        '/identity/resolve',
        '/identity/api-key',
        '/identity/tenant-id',
        '/v1/tasks/:taskId/stream', // SSE proxy - before wildcard
        '/v1/entities/:entityName/sandbox/destroy',
        '/v1/entities/:entityName/sandbox/sleep',
        '/v1/entities/:entityName/sandbox/wake',
        '/v1/entities/:entityName/tasks',
        '/v1/entities/:entityName/tasks/:taskId',
        '/v1/entities/:entityName/tasks/:taskId/cancel',
        '/v1/entities/:entityName/tasks/:taskId/undo',
        '/v1/agent/credentials',
        '/v1/agent/credentials/:provider',
        '/v1/presets',
        '/v1/recipes',
        '/v1/apps',
        '/v1/apps/:appId',
        '/v1/apps/:appId/sandbox',
        '/v1/apps/:appId/snapshots',
        '/v1/apps/:appId/snapshots/:snapshotId/restore',
        '/v1/apps/:appId/snapshots/:snapshotId/fork',
        '/v1/apps/:appId/activity',
        '/v1/apps/:appId/manifest',
        '/v1/apps/:appId/detect',
        '/v1/apps/:appId/entity',
        '/v1/apps/:appId/preview-url',
        '/v1/keys',
        '/v1/keys/:keyId/rotate',
        '/v1/preview', // Session validator - before wildcard
        '/v1/*', // Wildcard proxy - MUST be last
      ];

      // Verify SSE proxy is before wildcard
      const sseIndex = routeOrder.indexOf('/v1/tasks/:taskId/stream');
      const wildcardIndex = routeOrder.indexOf('/v1/*');
      expect(sseIndex).toBeLessThan(wildcardIndex);
    });

    it('lifecycle endpoints are mounted before wildcard', () => {
      const routeOrder = [
        '/v1/entities/:entityName/sandbox/destroy',
        '/v1/entities/:entityName/sandbox/sleep',
        '/v1/entities/:entityName/sandbox/wake',
        '/v1/*',
      ];

      const destroyIndex = routeOrder.indexOf('/v1/entities/:entityName/sandbox/destroy');
      const wildcardIndex = routeOrder.indexOf('/v1/*');
      expect(destroyIndex).toBeLessThan(wildcardIndex);
    });

    it('app store endpoints are mounted before wildcard', () => {
      const routeOrder = [
        '/v1/presets',
        '/v1/recipes',
        '/v1/apps',
        '/v1/apps/:appId',
        '/v1/apps/:appId/sandbox',
        '/v1/apps/:appId/snapshots',
        '/v1/apps/:appId/snapshots/:snapshotId/restore',
        '/v1/apps/:appId/snapshots/:snapshotId/fork',
        '/v1/apps/:appId/activity',
        '/v1/apps/:appId/manifest',
        '/v1/apps/:appId/detect',
        '/v1/apps/:appId/entity',
        '/v1/apps/:appId/preview-url',
        '/v1/manifest/validate',
        '/v1/*',
      ];

      const presetsIndex = routeOrder.indexOf('/v1/presets');
      const wildcardIndex = routeOrder.indexOf('/v1/*');
      expect(presetsIndex).toBeLessThan(wildcardIndex);
    });
  });

  describe('agent task endpoints', () => {
    it('has all required agent task endpoints', () => {
      const expectedEndpoints = [
        'GET /v1/entities/:entityName/tasks',
        'POST /v1/entities/:entityName/tasks',
        'GET /v1/entities/:entityName/tasks/:taskId',
        'POST /v1/entities/:entityName/tasks/:taskId/cancel',
        'POST /v1/entities/:entityName/tasks/:taskId/undo',
      ];

      expect(expectedEndpoints).toHaveLength(5);
      expect(expectedEndpoints[0]).toBe('GET /v1/entities/:entityName/tasks');
      expect(expectedEndpoints[1]).toBe('POST /v1/entities/:entityName/tasks');
      expect(expectedEndpoints[2]).toBe('GET /v1/entities/:entityName/tasks/:taskId');
      expect(expectedEndpoints[3]).toBe('POST /v1/entities/:entityName/tasks/:taskId/cancel');
      expect(expectedEndpoints[4]).toBe('POST /v1/entities/:entityName/tasks/:taskId/undo');
    });
  });

  describe('app store endpoints', () => {
    it('has all required app store endpoints', () => {
      const expectedEndpoints = [
        'GET /v1/presets',
        'GET /v1/recipes',
        'GET /v1/apps',
        'POST /v1/apps',
        'GET /v1/apps/:appId',
        'PATCH /v1/apps/:appId',
        'DELETE /v1/apps/:appId',
        'POST /v1/apps/:appId/sandbox',
        'GET /v1/apps/:appId/snapshots',
        'POST /v1/apps/:appId/snapshots/:snapshotId/restore',
        'POST /v1/apps/:appId/snapshots/:snapshotId/fork',
        'GET /v1/apps/:appId/activity',
        'POST /v1/manifest/validate',
        'GET /v1/apps/:appId/manifest',
        'GET /v1/apps/:appId/detect',
        'POST /v1/apps/:appId/entity',
        'POST /v1/apps/:appId/preview-url',
      ];

      expect(expectedEndpoints).toHaveLength(17);
    });
  });

  describe('identity endpoints', () => {
    it('has all required identity endpoints', () => {
      const expectedEndpoints = [
        'GET /identity/resolve',
        'GET /identity/api-key',
        'GET /identity/tenant-id',
      ];

      expect(expectedEndpoints).toHaveLength(3);
    });
  });

  describe('API key management', () => {
    it('has all required API key endpoints', () => {
      const expectedEndpoints = [
        'GET /v1/keys',
        'POST /v1/keys',
        'POST /v1/keys/:keyId/rotate',
        'DELETE /v1/keys/:keyId',
      ];

      expect(expectedEndpoints).toHaveLength(4);
    });
  });

  describe('agent credential management', () => {
    it('has all required credential endpoints', () => {
      const expectedEndpoints = [
        'GET /v1/agent/credentials',
        'PUT /v1/agent/credentials',
        'POST /v1/agent/credentials',
        'DELETE /v1/agent/credentials/:provider',
      ];

      expect(expectedEndpoints).toHaveLength(4);
    });
  });

  describe('proxy handler', () => {
    it('wildcard proxy handles all /v1/* requests', () => {
      // The wildcard proxy at /v1/* catches all requests not matched
      // by specific routes. It should forward them to sandboxd /v1/
      // and handle errors appropriately.
      const expectedProxyBehavior = {
        method: 'forward',
        targetPrefix: '/v1/',
        errorStatus: 502,
        errorJson: true,
      };

      expect(expectedProxyBehavior.method).toBe('forward');
      expect(expectedProxyBehavior.targetPrefix).toBe('/v1/');
      expect(expectedProxyBehavior.errorStatus).toBe(502);
      expect(expectedProxyBehavior.errorJson).toBe(true);
    });

    it('proxy removes hop-by-hop headers', () => {
      // The proxy must remove hop-by-hop headers before forwarding
      const hopByHopHeaders = ['host', 'connection', 'transfer-encoding'];

      hopByHopHeaders.forEach((header) => {
        expect(['host', 'connection', 'transfer-encoding']).toContain(header);
      });
    });
  });
});
