/**
 * App Store API hooks for the sandboxd plugin.
 *
 * Communicates with sandboxd's curated app catalog (presets), recipes,
 * and app lifecycle via the backend proxy.
 */

import { useAsync } from 'react-use';

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
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A runtime preset — a curated, one-click-deployable app template. */
export interface SandboxdPreset {
  id: string;
  name: string;
  description?: string;
  /** Framework or category tag, e.g. "react", "python", "node" */
  framework?: string;
  /** Human-friendly category, e.g. "Web", "Data Science", "Backend" */
  category?: string;
  /** Runtime capabilities this preset supports */
  capabilities?: Record<string, boolean>;
  /** Optional icon / logo URL */
  icon?: string;
}

/** An embedded runtime recipe — framework-specific sandbox.yaml guidance. */
export interface SandboxdRecipe {
  id: string;
  name: string;
  framework: string;
  description?: string;
  /** The recommended sandbox.yaml for this framework */
  manifest?: Record<string, unknown>;
}

/** A tenant-scoped app (deployed from a preset or custom). */
export interface SandboxdApp {
  id: string;
  name: string;
  presetId?: string;
  status?: 'running' | 'sleeping' | 'stopped' | 'starting' | 'error';
  previewUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** A snapshot of an app's sandbox state. */
export interface SandboxdSnapshot {
  id: string;
  appId: string;
  name?: string;
  description?: string;
  createdAt?: string;
  status?: string;
}

/** Result of manifest validation. */
export interface ManifestValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  /** The validated/normalized manifest */
  normalized?: Record<string, unknown>;
}

/** Runtime detection suggestions for an app's workspace. */
export interface RuntimeDetectionResult {
  framework?: string;
  language?: string;
  suggestedPreset?: string;
  suggestions?: string[];
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Fetch the list of available runtime presets (the app catalog).
 * @param revalidateKey — increment to force a refetch.
 */
export function useSandboxdPresets(revalidateKey = 0) {
  return useAsync(async () => {
    return sandboxdFetch<SandboxdPreset[]>('/presets');
  }, [revalidateKey]);
}

/**
 * Fetch the list of embedded runtime recipes.
 * @param revalidateKey — increment to force a refetch.
 */
export function useSandboxdRecipes(revalidateKey = 0) {
  return useAsync(async () => {
    return sandboxdFetch<SandboxdRecipe[]>('/recipes');
  }, [revalidateKey]);
}

/**
 * Fetch the list of tenant-scoped apps.
 * @param revalidateKey — increment to force a refetch.
 */
export function useSandboxdApps(revalidateKey = 0) {
  return useAsync(async () => {
    return sandboxdFetch<SandboxdApp[]>('/apps');
  }, [revalidateKey]);
}

/**
 * Get a single app by ID.
 */
export function useSandboxdGetApp(appId: string) {
  return useAsync(async () => {
    return sandboxdFetch<SandboxdApp>(`/apps/${appId}`);
  }, [appId]);
}

/**
 * Create an app (one-click deploy from a preset).
 */
export function useSandboxdCreateApp() {
  return async (data: {
    name: string;
    presetId?: string;
    manifest?: Record<string, unknown>;
  }) => {
    return sandboxdFetch<SandboxdApp>('/apps', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };
}

/**
 * Update an app (partial).
 */
export function useSandboxdUpdateApp() {
  return async (appId: string, data: Record<string, unknown>) => {
    return sandboxdFetch<SandboxdApp>(`/apps/${appId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  };
}

/**
 * Delete an app (and all its sandboxes).
 */
export function useSandboxdDeleteApp() {
  return async (appId: string) => {
    return sandboxdFetch<void>(`/apps/${appId}`, {
      method: 'DELETE',
    });
  };
}

/**
 * Create the sandbox for an app (start it).
 */
export function useSandboxdCreateSandbox() {
  return async (appId: string) => {
    return sandboxdFetch<void>(`/apps/${appId}/sandbox`, {
      method: 'POST',
    });
  };
}

/**
 * List snapshots for an app.
 */
export function useSandboxdSnapshots(appId: string) {
  return useAsync(async () => {
    return sandboxdFetch<SandboxdSnapshot[]>(`/apps/${appId}/snapshots`);
  }, [appId]);
}

/**
 * Restore an app from a snapshot.
 */
export function useSandboxdRestoreSnapshot() {
  return async (appId: string, snapshotId: string) => {
    return sandboxdFetch<void>(`/apps/${appId}/snapshots/${snapshotId}/restore`, {
      method: 'POST',
    });
  };
}

/**
 * Fork a snapshot into a new app.
 */
export function useSandboxdForkSnapshot() {
  return async (appId: string, snapshotId: string) => {
    return sandboxdFetch<SandboxdApp>(
      `/apps/${appId}/snapshots/${snapshotId}/fork`,
      {
        method: 'POST',
      },
    );
  };
}

/**
 * Get the activity timeline for an app.
 */
export function useSandboxdActivity(appId: string) {
  return useAsync(async () => {
    return sandboxdFetch<unknown[]>(`/apps/${appId}/activity`);
  }, [appId]);
}

/**
 * Validate a sandbox.yaml manifest (stateless).
 */
export function useSandboxdValidateManifest() {
  return async (manifest: Record<string, unknown>) => {
    return sandboxdFetch<ManifestValidationResult>('/manifest/validate', {
      method: 'POST',
      body: JSON.stringify(manifest),
    });
  };
}

/**
 * Get the validated sandbox.yaml for an app.
 */
export function useSandboxdGetManifest(appId: string) {
  return useAsync(async () => {
    return sandboxdFetch<Record<string, unknown>>(`/apps/${appId}/manifest`);
  }, [appId]);
}

/**
 * Get runtime detection suggestions for an app's workspace.
 */
export function useSandboxdDetectRuntime(appId: string) {
  return useAsync(async () => {
    return sandboxdFetch<RuntimeDetectionResult>(`/apps/${appId}/detect`);
  }, [appId]);
}

/**
 * Create a Backstage entity for a sandboxd app after deploy.
 *
 * Calls the backend /v1/apps/:appId/entity endpoint to ensure the app
 * has a corresponding entity in the Backstage Software Catalog with
 * all sandboxd annotations.
 */
export function useSandboxdCreateEntity() {
  return async (appId: string) => {
    return sandboxdFetch<{ entity: unknown }>(`/apps/${appId}/entity`, {
      method: 'POST',
    });
  };
}
