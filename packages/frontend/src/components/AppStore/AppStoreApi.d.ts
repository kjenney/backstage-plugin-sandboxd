/**
 * App Store API hooks for the sandboxd plugin.
 *
 * Communicates with sandboxd's curated app catalog (presets), recipes,
 * and app lifecycle via the backend proxy.
 */
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
/**
 * Fetch the list of available runtime presets (the app catalog).
 * @param revalidateKey — increment to force a refetch.
 */
export declare function useSandboxdPresets(revalidateKey?: number): import("react-use/lib/useAsyncFn").AsyncState<SandboxdPreset[]>;
/**
 * Fetch the list of embedded runtime recipes.
 * @param revalidateKey — increment to force a refetch.
 */
export declare function useSandboxdRecipes(revalidateKey?: number): import("react-use/lib/useAsyncFn").AsyncState<SandboxdRecipe[]>;
/**
 * Fetch the list of tenant-scoped apps.
 * @param revalidateKey — increment to force a refetch.
 */
export declare function useSandboxdApps(revalidateKey?: number): import("react-use/lib/useAsyncFn").AsyncState<SandboxdApp[]>;
/**
 * Get a single app by ID.
 */
export declare function useSandboxdGetApp(appId: string): import("react-use/lib/useAsyncFn").AsyncState<SandboxdApp>;
/**
 * Create an app (one-click deploy from a preset).
 */
export declare function useSandboxdCreateApp(): (data: {
    name: string;
    presetId?: string;
    manifest?: Record<string, unknown>;
}) => Promise<SandboxdApp>;
/**
 * Update an app (partial).
 */
export declare function useSandboxdUpdateApp(): (appId: string, data: Record<string, unknown>) => Promise<SandboxdApp>;
/**
 * Delete an app (and all its sandboxes).
 */
export declare function useSandboxdDeleteApp(): (appId: string) => Promise<void>;
/**
 * Create the sandbox for an app (start it).
 */
export declare function useSandboxdCreateSandbox(): (appId: string) => Promise<void>;
/**
 * List snapshots for an app.
 */
export declare function useSandboxdSnapshots(appId: string): import("react-use/lib/useAsyncFn").AsyncState<SandboxdSnapshot[]>;
/**
 * Restore an app from a snapshot.
 */
export declare function useSandboxdRestoreSnapshot(): (appId: string, snapshotId: string) => Promise<void>;
/**
 * Fork a snapshot into a new app.
 */
export declare function useSandboxdForkSnapshot(): (appId: string, snapshotId: string) => Promise<SandboxdApp>;
/**
 * Get the activity timeline for an app.
 */
export declare function useSandboxdActivity(appId: string): import("react-use/lib/useAsyncFn").AsyncState<unknown[]>;
/**
 * Validate a sandbox.yaml manifest (stateless).
 */
export declare function useSandboxdValidateManifest(): (manifest: Record<string, unknown>) => Promise<ManifestValidationResult>;
/**
 * Get the validated sandbox.yaml for an app.
 */
export declare function useSandboxdGetManifest(appId: string): import("react-use/lib/useAsyncFn").AsyncState<Record<string, unknown>>;
/**
 * Get runtime detection suggestions for an app's workspace.
 */
export declare function useSandboxdDetectRuntime(appId: string): import("react-use/lib/useAsyncFn").AsyncState<RuntimeDetectionResult>;
/**
 * Create a Backstage entity for a sandboxd app after deploy.
 *
 * Calls the backend /v1/apps/:appId/entity endpoint to ensure the app
 * has a corresponding entity in the Backstage Software Catalog with
 * all sandboxd annotations.
 */
export declare function useSandboxdCreateEntity(): (appId: string) => Promise<{
    entity: unknown;
}>;
