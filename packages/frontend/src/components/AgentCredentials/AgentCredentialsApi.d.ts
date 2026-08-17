/**
 * API hooks for sandboxd agent credential configuration.
 *
 * sandboxd manages agent credentials via its credential-injecting proxy.
 * This module provides hooks to inspect and manage agent auth configuration
 * from the Backstage UI.
 */
export interface AgentCredentialConfig {
    provider: string;
    apiKeySet: boolean;
    models: string[];
    endpoint?: string;
}
export interface AgentCredentialUpdate {
    provider?: string;
    apiKey?: string;
    endpoint?: string;
}
/**
 * Fetch the current agent credential configuration.
 */
export declare function useAgentCredentials(): import("react-use/lib/useAsyncFn").AsyncState<AgentCredentialConfig[]>;
/**
 * Update agent credential configuration.
 */
export declare function useUpdateAgentCredentials(): (config: AgentCredentialUpdate) => Promise<unknown>;
/**
 * Add a new agent credential provider.
 */
export declare function useAddAgentCredentials(): (config: AgentCredentialUpdate) => Promise<unknown>;
/**
 * Remove an agent credential provider.
 */
export declare function useRemoveAgentCredentials(): (provider: string) => Promise<unknown>;
