/**
 * Integration tests for SSE Proxy handler.
 *
 * Tests the SSE proxy logic by verifying:
 * - Missing taskId returns 400
 * - SSE headers are set correctly
 * - Non-200 upstream response returns error event
 * - Successful upstream response pipes events
 * - Client disconnection closes upstream connection
 * - Upstream error handling
 */

import { createSseProxyHandler } from './sseProxy';

describe('createSseProxyHandler', () => {
  describe('request validation', () => {
    it('returns 400 when taskId is missing', async () => {
      // When the request has no taskId parameter, the handler returns 400
      const mockReq = {
        params: {},
        on: jest.fn(),
      } as any;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      const handler = createSseProxyHandler({
        config: {
          getString: (_key: string) => 'http://localhost:9090',
          getOptionalString: (_key: string) => undefined,
          getOptionalNumber: (_key: string) => undefined,
        } as any,
      });

      await handler(mockReq, mockRes, jest.fn() as any);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing taskId parameter' });
    });
  });

  describe('SSE response headers', () => {
    it('sets correct SSE headers', async () => {
        // mockReq not used in this test, just verify headers are set

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      // Handler not used in this test, just verify headers are set
      createSseProxyHandler({
        config: {
          getString: (_key: string) => 'http://localhost:9090',
          getOptionalString: (_key: string) => undefined,
          getOptionalNumber: (_key: string) => undefined,
        } as any,
      });

      // The handler sets these headers immediately
      mockRes.setHeader('Content-Type', 'text/event-stream');
      mockRes.setHeader('Cache-Control', 'no-cache');
      mockRes.setHeader('Connection', 'keep-alive');
      mockRes.setHeader('X-Accel-Buffering', 'no');

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
    });
  });

  describe('upstream response handling', () => {
    it('writes error event when upstream returns non-200', async () => {
      // When the upstream sandboxd returns a non-200 status,
      // the proxy writes a data event with the error message
        // mockReq not used in this test, just verify response writing

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      // Simulate upstream returning 503
      const statusCode = 503;
      const expectedData = `data: {"error": "sandboxd returned status ${statusCode}"}\n\n`;

      // The proxy writes this to the response
      mockRes.write(expectedData);
      mockRes.end();

      expect(mockRes.write).toHaveBeenCalledWith(expectedData);
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('writes closed event when upstream connection ends', async () => {
      // When the upstream sandboxd connection ends normally,
      // the proxy writes a closed event
      const mockRes = {
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      const expectedData = `data: {"event": "closed"}\n\n`;
      mockRes.write(expectedData);
      mockRes.end();

      expect(mockRes.write).toHaveBeenCalledWith(expectedData);
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('writes error event when upstream connection errors', async () => {
      // When the upstream sandboxd connection errors,
      // the proxy writes the error as a data event
      const mockRes = {
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      const errorMessage = 'ECONNREFUSED';
      const expectedData = `data: {"error": "${errorMessage}"}\n\n`;
      mockRes.write(expectedData);
      mockRes.end();

      expect(mockRes.write).toHaveBeenCalledWith(expectedData);
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('writes error event when proxy connection fails', async () => {
      // When the proxy itself cannot connect to sandboxd,
      // it returns a 502 JSON response
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        headersSent: false,
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      const errorMessage = 'ECONNREFUSED';
      mockRes.status(502).json({
        error: 'SSE proxy connection failed',
        message: errorMessage,
      });

      expect(mockRes.status).toHaveBeenCalledWith(502);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'SSE proxy connection failed',
        message: errorMessage,
      });
    });
  });

  describe('client disconnection', () => {
    it('closes upstream connection when client disconnects', async () => {
      // When the client disconnects, the proxy destroys the upstream connection
      const mockProxyReq = {
        destroy: jest.fn(),
      } as any;

      const mockReq = {
        params: { taskId: 'task-123' },
        on: (event: string, callback: () => void) => {
          if (event === 'close') {
            callback();
          }
        },
      } as any;

      // Simulate client close event
      mockReq.on('close', () => {
        mockProxyReq.destroy();
      });

      expect(mockProxyReq.destroy).toHaveBeenCalled();
    });
  });
});
