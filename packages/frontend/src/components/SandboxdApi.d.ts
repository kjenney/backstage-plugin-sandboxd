/**
 * Custom hooks for communicating with the sandboxd backend proxy.
 *
 * All API calls route through /api/sandboxd/v1/ — never directly to sandboxd.
 */
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
/**
 * Fetch the list of sandboxd apps for a given entity.
 */
export declare function useSandboxdApps(entityName: string): import("react-use/lib/useAsyncFn").AsyncState<SandboxApp[]>;
/**
 * Start a sandboxd app.
 */
export declare function useSandboxdStartApp(): (entityName: string, appName: string) => Promise<unknown>;
/**
 * Stop a sandboxd app.
 */
export declare function useSandboxdStopApp(): (entityName: string, appName: string) => Promise<unknown>;
/**
 * Restart a sandboxd app.
 */
export declare function useSandboxdRestartApp(): (entityName: string, appName: string) => Promise<unknown>;
/**
 * Destroy a sandboxd app (permanent deletion).
 */
export declare function useSandboxdDestroyApp(): (entityName: string) => Promise<unknown>;
/**
 * Put a sandbox to sleep (frees memory, wakes on next request).
 */
export declare function useSandboxdSleepApp(): (entityName: string) => Promise<unknown>;
/**
 * Wake a sleeping sandbox.
 */
export declare function useSandboxdWakeApp(): (entityName: string) => Promise<unknown>;
/**
 * Fetch the file tree for a given entity.
 */
export declare function useSandboxdFileTree(entityName: string): import("react-use/lib/useAsyncFn").AsyncState<SandboxFileNode[]>;
/**
 * Read a file from the sandboxd filesystem.
 */
export declare function useSandboxdReadFile(): (entityName: string, filePath: string) => Promise<string>;
/**
 * Write a file to the sandboxd filesystem.
 */
export declare function useSandboxdWriteFile(): (entityName: string, filePath: string, content: string) => Promise<unknown>;
/**
 * Fetch the current settings for a given entity.
 */
export declare function useSandboxdSettings(entityName: string): import("react-use/lib/useAsyncFn").AsyncState<SandboxdSettings>;
/**
 * Update settings for a given entity.
 */
export declare function useSandboxdUpdateSettings(): (entityName: string, settings: SandboxdSettings) => Promise<unknown>;
