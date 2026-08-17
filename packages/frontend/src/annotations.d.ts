/**
 * Backstage annotation constants for sandboxd integration.
 *
 * These annotations are read from entity metadata to configure sandboxd
 * behavior and trigger automatic sandbox provisioning.
 *
 * Example entity YAML:
 *
 *   apiVersion: backstage.io/v1alpha1
 *   kind: Component
 *   metadata:
 *     name: my-app
 *     annotations:
 *       sandboxd.backstage.io/sandboxd-enabled: 'true'
 *       sandboxd.backstage.io/runtime: 'node'
 *       sandboxd.backstage.io/memory-limit-mb: '512'
 *       sandboxd.backstage.io/sleep-timeout: '600'
 *       sandboxd.backstage.io/auto-provision: 'true'
 *       sandboxd.backstage.io/agent-model: 'gpt-4o'
 */
/**
 * Annotation prefix for all sandboxd annotations.
 */
export declare const SANDBOXD_ANNOTATION_PREFIX = "sandboxd.backstage.io";
/**
 * Core annotation keys.
 */
export declare const SANDBOXD_ANNOTATIONS: {
    /**
     * Enables sandboxd integration for this entity.
     * Set to 'true' to activate sandboxd features.
     */
    readonly sandboxdEnabled: "sandboxd.backstage.io/sandboxd-enabled";
    /**
     * Runtime environment for the sandbox (e.g., 'node', 'python', 'java').
     * Used during automatic provisioning to select the correct runtime.
     */
    readonly runtime: "sandboxd.backstage.io/runtime";
    /**
     * Memory limit for the sandbox in megabytes.
     * Default: 512 MB.
     */
    readonly memoryLimitMb: "sandboxd.backstage.io/memory-limit-mb";
    /**
     * Idle timeout before the sandbox goes to sleep, in seconds.
     * Default: 600 (10 minutes).
     */
    readonly sleepTimeout: "sandboxd.backstage.io/sleep-timeout";
    /**
     * Automatically provision a sandbox when this entity is created
     * or when the annotation is first added. Set to 'true' to enable.
     */
    readonly autoProvision: "sandboxd.backstage.io/auto-provision";
    /**
     * AI agent model to use for this sandbox (e.g., 'gpt-4o', 'claude-3.5').
     * Used when agent-assisted coding is enabled.
     */
    readonly agentModel: "sandboxd.backstage.io/agent-model";
    /**
     * The sandboxd app identifier — set by the entity sync provider when a
     * sandboxd app is deployed from the App Store. Allows the frontend plugin
     * to recognize auto-provisioned entities.
     */
    readonly appId: "sandboxd.backstage.io/app-id";
    /**
     * The app's preview URL — set by the entity sync provider. Enables the
     * preview button on the entity page.
     */
    readonly previewUrl: "sandboxd.backstage.io/preview-url";
    /**
     * Current app status from sandboxd (running/sleeping/stopped/starting/error).
     * Set by the entity sync provider during reconciliation.
     */
    readonly status: "sandboxd.backstage.io/status";
    /**
     * The preset ID that created this app — set when deploying from a curated
     * preset in the App Store. Used to display the preset name on entity cards.
     */
    readonly presetId: "sandboxd.backstage.io/preset-id";
};
/**
 * Type of all annotation keys.
 */
export type SandboxdAnnotationKey = (typeof SANDBOXD_ANNOTATIONS)[keyof typeof SANDBOXD_ANNOTATIONS];
/**
 * Parse all sandboxd annotations from an entity into a typed config object.
 */
export interface SandboxdEntityConfig {
    enabled: boolean;
    runtime: string | undefined;
    memoryLimitMb: number | undefined;
    sleepTimeout: number | undefined;
    autoProvision: boolean;
    agentModel: string | undefined;
    appId: string | undefined;
    previewUrl: string | undefined;
    status: string | undefined;
    presetId: string | undefined;
}
export declare function parseSandboxdAnnotations(annotations?: Record<string, string>): SandboxdEntityConfig;
/**
 * Check if an entity has sandboxd enabled (backward-compatible with existing code).
 */
export declare function isSandboxdAvailable(annotations?: Record<string, string>): boolean;
/**
 * Check if an entity was auto-provisioned by the sandboxd entity sync.
 * Entities created by the entity provider have the app-id annotation set.
 */
export declare function isSandboxdManagedEntity(annotations?: Record<string, string>): boolean;
