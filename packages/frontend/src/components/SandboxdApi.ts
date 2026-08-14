/**
 * Custom hooks for communicating with the sandboxd backend proxy.
 *
 * All API calls route through /api/sandboxd/v1/ — never directly to sandboxd.
 */

import { useAsync } from 'react-use';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SandboxStatus = 'running' | 'sleeping' | 'stopped';

export interface SandboxApp {
  name: string;
  status: SandboxStatus;
  previewUrl?: string;
  agentActive?: boolean;
  agentModel?: string;
}

export interface SandboxFileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: SandboxFileNode[];
}

export interface SandboxdSettings {
  sleepTimeout?: number;
  memoryLimitMb?: number;
  agentModel?: string;
  maxConcurrentApps?: number;
}

/* ------------------------------------------------------------------ */
/*  Helper: fetch wrapper with Backstage auth headers                  */
/* ------------------------------------------------------------------ */

const API_BASE = '/api/sandboxd/v1';

async function sandboxdFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Sandboxd API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Fetch the list of sandboxd apps for a given entity.
 */
export function useSandboxdApps(entityName: string) {
  return useAsync(async () => {
    return sandboxdFetch<SandboxApp[]>(`/entities/${entityName}/apps`);
  }, [entityName]);
}

/**
 * Start a sandboxd app.
 */
export function useSandboxdStartApp() {
  return async (entityName: string, appName: string) => {
    return sandboxdFetch(`/entities/${entityName}/apps/${appName}/start`, {
      method: 'POST',
    });
  };
}

/**
 * Stop a sandboxd app.
 */
export function useSandboxdStopApp() {
  return async (entityName: string, appName: string) => {
    return sandboxdFetch(`/entities/${entityName}/apps/${appName}/stop`, {
      method: 'POST',
    });
  };
}

/**
 * Restart a sandboxd app.
 */
export function useSandboxdRestartApp() {
  return async (entityName: string, appName: string) => {
    return sandboxdFetch(`/entities/${entityName}/apps/${appName}/restart`, {
      method: 'POST',
    });
  };
}

/**
 * Fetch the file tree for a given entity.
 */
export function useSandboxdFileTree(entityName: string) {
  return useAsync(async () => {
    return sandboxdFetch<SandboxFileNode[]>(`/entities/${entityName}/files`);
  }, [entityName]);
}

/**
 * Read a file from the sandboxd filesystem.
 */
export function useSandboxdReadFile() {
  return async (entityName: string, filePath: string) => {
    return sandboxdFetch<string>(
      `/entities/${entityName}/files?path=${encodeURIComponent(filePath)}`,
    );
  };
}

/**
 * Write a file to the sandboxd filesystem.
 */
export function useSandboxdWriteFile() {
  return async (
    entityName: string,
    filePath: string,
    content: string,
  ) => {
    return sandboxdFetch(
      `/entities/${entityName}/files?path=${encodeURIComponent(filePath)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ content }),
      },
    );
  };
}

/**
 * Fetch the current settings for a given entity.
 */
export function useSandboxdSettings(entityName: string) {
  return useAsync(async () => {
    return sandboxdFetch<SandboxdSettings>(
      `/entities/${entityName}/settings`,
    );
  }, [entityName]);
}

/**
 * Update settings for a given entity.
 */
export function useSandboxdUpdateSettings() {
  return async (entityName: string, settings: SandboxdSettings) => {
    return sandboxdFetch(
      `/entities/${entityName}/settings`,
      {
        method: 'PUT',
        body: JSON.stringify(settings),
      },
    );
  };
}
