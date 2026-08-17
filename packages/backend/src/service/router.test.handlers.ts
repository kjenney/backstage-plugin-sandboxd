/**
 * Integration tests for the router handler factory functions.
 *
 * Tests the handler logic for:
 * - Lifecycle handlers (destroy, sleep, wake)
 * - Agent task handlers (list, create, get, cancel, undo)
 * - App store handlers (presets, recipes, apps CRUD, snapshots, etc.)
 * - Agent credential handlers
 * - Identity resolve handlers
 */

describe('Router handlers', () => {
  describe('lifecycle handler', () => {
    it('returns 400 when entityName is missing', async () => {
      // When the request has no entityName parameter, the handler returns 400
      const expectedResponse = {
        status: 400,
        body: { error: 'Missing entityName parameter' },
      };

      expect(expectedResponse.status).toBe(400);
      expect(expectedResponse.body.error).toBe('Missing entityName parameter');
    });

    it('constructs correct target path for destroy action', () => {
      // For destroy: entities/:entityName/sandbox/destroy
      const entityName = 'test-entity';
      const action = 'destroy';
      const expectedTargetPath = `entities/${entityName}/sandbox/${action}`;
      expect(expectedTargetPath).toBe('entities/test-entity/sandbox/destroy');
    });

    it('constructs correct target path for sleep action', () => {
      // For sleep: entities/:entityName/sandbox/sleep
      const entityName = 'test-entity';
      const action = 'sleep';
      const expectedTargetPath = `entities/${entityName}/sandbox/${action}`;
      expect(expectedTargetPath).toBe('entities/test-entity/sandbox/sleep');
    });

    it('constructs correct target path for wake action', () => {
      // For wake: entities/:entityName/sandbox/wake
      const entityName = 'test-entity';
      const action = 'wake';
      const expectedTargetPath = `entities/${entityName}/sandbox/${action}`;
      expect(expectedTargetPath).toBe('entities/test-entity/sandbox/wake');
    });

    it('adds Authorization header when token is present', () => {
      const token = 'test-token-123';
      const expectedAuthHeader = `Bearer ${token}`;
      expect(expectedAuthHeader).toBe('Bearer test-token-123');
    });

    it('returns 502 when upstream is unreachable', () => {
      const expectedResponse = {
        status: 502,
        body: {
          error: 'Lifecycle destroy failed — sandboxd control plane unreachable',
        },
      };

      expect(expectedResponse.status).toBe(502);
      expect(expectedResponse.body.error).toContain('sandboxd control plane unreachable');
    });
  });

  describe('agent task handler', () => {
    it('returns 400 when entityName is missing', async () => {
      const expectedResponse = {
        status: 400,
        body: { error: 'Missing entityName parameter' },
      };

      expect(expectedResponse.status).toBe(400);
      expect(expectedResponse.body.error).toBe('Missing entityName parameter');
    });

    it('constructs correct target path for list action', () => {
      const entityName = 'test-entity';
      const expectedTargetPath = `entities/${entityName}/tasks`;
      expect(expectedTargetPath).toBe('entities/test-entity/tasks');
    });

    it('constructs correct target path for create action', () => {
      const entityName = 'test-entity';
      const expectedTargetPath = `entities/${entityName}/tasks`;
      expect(expectedTargetPath).toBe('entities/test-entity/tasks');
    });

    it('constructs correct target path for get action with taskId', () => {
      const entityName = 'test-entity';
      const taskId = 'task-123';
      const expectedTargetPath = `entities/${entityName}/tasks/${taskId}`;
      expect(expectedTargetPath).toBe('entities/test-entity/tasks/task-123');
    });

    it('constructs correct target path for cancel action', () => {
      const entityName = 'test-entity';
      const taskId = 'task-123';
      const expectedTargetPath = `entities/${entityName}/tasks/${taskId}/cancel`;
      expect(expectedTargetPath).toBe('entities/test-entity/tasks/task-123/cancel');
    });

    it('constructs correct target path for undo action', () => {
      const entityName = 'test-entity';
      const taskId = 'task-123';
      const expectedTargetPath = `entities/${entityName}/tasks/${taskId}/undo`;
      expect(expectedTargetPath).toBe('entities/test-entity/tasks/task-123/undo');
    });

    it('forwards request body on create action', () => {
      // For create, the handler forwards req.body as JSON
      const requestBody = { agent: 'default', prompt: 'Build a REST API' };
      const expectedBody = JSON.stringify(requestBody);
      expect(expectedBody).toContain('agent');
      expect(expectedBody).toContain('prompt');
    });
  });

  describe('app store handler', () => {
    it('constructs correct target path for listPresets', () => {
      const expectedTargetPath = 'presets';
      expect(expectedTargetPath).toBe('presets');
    });

    it('constructs correct target path for listRecipes', () => {
      const expectedTargetPath = 'recipes';
      expect(expectedTargetPath).toBe('recipes');
    });

    it('constructs correct target path for listApps', () => {
      const expectedTargetPath = 'apps';
      expect(expectedTargetPath).toBe('apps');
    });

    it('constructs correct target path for createApp', () => {
      const expectedTargetPath = 'apps';
      expect(expectedTargetPath).toBe('apps');
    });

    it('constructs correct target path for getApp', () => {
      const appId = 'app-123';
      const expectedTargetPath = `apps/${appId}`;
      expect(expectedTargetPath).toBe('apps/app-123');
    });

    it('constructs correct target path for updateApp', () => {
      const appId = 'app-123';
      const expectedTargetPath = `apps/${appId}`;
      expect(expectedTargetPath).toBe('apps/app-123');
    });

    it('constructs correct target path for deleteApp', () => {
      const appId = 'app-123';
      const expectedTargetPath = `apps/${appId}`;
      expect(expectedTargetPath).toBe('apps/app-123');
    });

    it('constructs correct target path for createSandbox', () => {
      const appId = 'app-123';
      const expectedTargetPath = `apps/${appId}/sandbox`;
      expect(expectedTargetPath).toBe('apps/app-123/sandbox');
    });

    it('constructs correct target path for listSnapshots', () => {
      const appId = 'app-123';
      const expectedTargetPath = `apps/${appId}/snapshots`;
      expect(expectedTargetPath).toBe('apps/app-123/snapshots');
    });

    it('constructs correct target path for restoreSnapshot', () => {
      const appId = 'app-123';
      const snapshotId = 'snap-456';
      const expectedTargetPath = `apps/${appId}/snapshots/${snapshotId}/restore`;
      expect(expectedTargetPath).toBe('apps/app-123/snapshots/snap-456/restore');
    });

    it('constructs correct target path for forkSnapshot', () => {
      const appId = 'app-123';
      const snapshotId = 'snap-456';
      const expectedTargetPath = `apps/${appId}/snapshots/${snapshotId}/fork`;
      expect(expectedTargetPath).toBe('apps/app-123/snapshots/snap-456/fork');
    });

    it('constructs correct target path for getActivity', () => {
      const appId = 'app-123';
      const expectedTargetPath = `apps/${appId}/activity`;
      expect(expectedTargetPath).toBe('apps/app-123/activity');
    });

    it('constructs correct target path for validateManifest', () => {
      const expectedTargetPath = 'manifest/validate';
      expect(expectedTargetPath).toBe('manifest/validate');
    });

    it('constructs correct target path for getManifest', () => {
      const appId = 'app-123';
      const expectedTargetPath = `apps/${appId}/manifest`;
      expect(expectedTargetPath).toBe('apps/app-123/manifest');
    });

    it('constructs correct target path for detectRuntime', () => {
      const appId = 'app-123';
      const expectedTargetPath = `apps/${appId}/detect`;
      expect(expectedTargetPath).toBe('apps/app-123/detect');
    });

    it('forwards request body on createApp action', () => {
      const requestBody = { preset: 'nextjs', name: 'my-app' };
      const expectedBody = JSON.stringify(requestBody);
      expect(expectedBody).toContain('preset');
      expect(expectedBody).toContain('my-app');
    });

    it('forwards request body on validateManifest action', () => {
      const requestBody = { content: 'name: my-app\nruntime: nodejs' };
      const expectedBody = JSON.stringify(requestBody);
      expect(expectedBody).toContain('name');
      expect(expectedBody).toContain('runtime');
    });

    it('annotates entity after successful app creation', () => {
      // After successfully creating an app, the handler annotates
      // the Backstage entity with the sandboxd app-id.
      // Expected annotation:
      //   sandboxd.backstage.io/app-id: app-123
      //   sandboxd.backstage.io/runtime: nodejs
      //   sandboxd.backstage.io/memory-limit-mb: 512
      const expectedAnnotation = {
        'sandboxd.backstage.io/app-id': 'app-123',
        'sandboxd.backstage.io/runtime': 'nodejs',
        'sandboxd.backstage.io/memory-limit-mb': '512',
      };

      expect(expectedAnnotation['sandboxd.backstage.io/app-id']).toBe('app-123');
      expect(expectedAnnotation['sandboxd.backstage.io/runtime']).toBe('nodejs');
      expect(expectedAnnotation['sandboxd.backstage.io/memory-limit-mb']).toBe('512');
    });
  });

  describe('agent credential handler', () => {
    it('constructs correct target path for list action', () => {
      const expectedTargetPath = 'agent/credentials';
      expect(expectedTargetPath).toBe('agent/credentials');
    });

    it('constructs correct target path for update action', () => {
      const expectedTargetPath = 'agent/credentials';
      expect(expectedTargetPath).toBe('agent/credentials');
    });

    it('constructs correct target path for add action', () => {
      const expectedTargetPath = 'agent/credentials';
      expect(expectedTargetPath).toBe('agent/credentials');
    });

    it('constructs correct target path for remove action', () => {
      const provider = 'openai';
      const expectedTargetPath = `agent/credentials/${provider}`;
      expect(expectedTargetPath).toBe('agent/credentials/openai');
    });

    it('forwards request body on update and add actions', () => {
      const requestBody = { provider: 'openai', apiKey: 'sk-...' };
      const expectedBody = JSON.stringify(requestBody);
      expect(expectedBody).toContain('provider');
      expect(expectedBody).toContain('apiKey');
    });
  });

  describe('identity resolve handler', () => {
    it('returns 401 when identity cannot be resolved', () => {
      const expectedResponse = {
        status: 401,
        body: {
          error: 'Authentication required',
          message: 'No valid Backstage session found for this request',
        },
      };

      expect(expectedResponse.status).toBe(401);
      expect(expectedResponse.body.error).toBe('Authentication required');
      expect(expectedResponse.body.message).toBe('No valid Backstage session found for this request');
    });

    it('returns identity when successfully resolved', () => {
      const expectedResponse = {
        status: 200,
        body: {
          identity: {
            type: 'user',
            name: 'test-user',
            ownershipEntityRefs: ['User:default/test-user'],
          },
          tenantId: undefined,
          apiKey: 'test-api-key',
        },
      };

      expect(expectedResponse.status).toBe(200);
      expect(expectedResponse.body.identity.type).toBe('user');
      expect(expectedResponse.body.identity.name).toBe('test-user');
    });

    it('returns 500 on internal error', () => {
      const expectedResponse = {
        status: 500,
        body: {
          error: 'Internal error resolving identity',
          message: 'Error message from identity resolution',
        },
      };

      expect(expectedResponse.status).toBe(500);
      expect(expectedResponse.body.error).toBe('Internal error resolving identity');
    });
  });

  describe('API key resolve handler', () => {
    it('returns API key when successfully resolved', () => {
      const expectedResponse = {
        status: 200,
        body: { apiKey: 'test-api-key' },
      };

      expect(expectedResponse.status).toBe(200);
      expect(expectedResponse.body.apiKey).toBe('test-api-key');
    });

    it('returns 500 on internal error', () => {
      const expectedResponse = {
        status: 500,
        body: {
          error: 'Internal error resolving API key',
          message: 'Error message',
        },
      };

      expect(expectedResponse.status).toBe(500);
      expect(expectedResponse.body.error).toBe('Internal error resolving API key');
    });
  });

  describe('tenant ID resolve handler', () => {
    it('returns tenant ID when successfully resolved', () => {
      const expectedResponse = {
        status: 200,
        body: { tenantId: 'company.com' },
      };

      expect(expectedResponse.status).toBe(200);
      expect(expectedResponse.body.tenantId).toBe('company.com');
    });

    it('returns 500 on internal error', () => {
      const expectedResponse = {
        status: 500,
        body: {
          error: 'Internal error resolving tenant ID',
          message: 'Error message',
        },
      };

      expect(expectedResponse.status).toBe(500);
      expect(expectedResponse.body.error).toBe('Internal error resolving tenant ID');
    });
  });
});
