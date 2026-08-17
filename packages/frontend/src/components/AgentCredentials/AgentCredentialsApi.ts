/**
 * API hooks for sandboxd agent credential configuration.
 *
 * sandboxd manages agent credentials via its credential-injecting proxy.
 * This module provides hooks to inspect and manage agent auth configuration
 * from the Backstage UI.
 */

import { useAsync } from 'react-use';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AgentCredentialConfig {
  provider: string;            // 'openai' | 'anthropic' | 'custom'
  apiKeySet: boolean;          // whether the API key is configured
  models: string[];            // available models for this provider
  endpoint?: string;           // custom endpoint if provider is 'custom'
}

export interface AgentCredentialUpdate {
  provider?: string;
  apiKey?: string;
  endpoint?: string;
}

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

const API_BASE = '/api/sandboxd/v1';

async function credentialsFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Credentials API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Fetch the current agent credential configuration.
 */
export function useAgentCredentials() {
  return useAsync(async () => {
    return credentialsFetch<AgentCredentialConfig[]>('/agent/credentials');
  }, []);
}

/**
 * Update agent credential configuration.
 */
export function useUpdateAgentCredentials() {
  return async (config: AgentCredentialUpdate) => {
    return credentialsFetch(
      '/agent/credentials',
      {
        method: 'PUT',
        body: JSON.stringify(config),
      },
    );
  };
}

/**
 * Add a new agent credential provider.
 */
export function useAddAgentCredentials() {
  return async (config: AgentCredentialUpdate) => {
    return credentialsFetch(
      '/agent/credentials',
      {
        method: 'POST',
        body: JSON.stringify(config),
      },
    );
  };
}

/**
 * Remove an agent credential provider.
 */
export function useRemoveAgentCredentials() {
  return async (provider: string) => {
    return credentialsFetch(
      `/agent/credentials/${encodeURIComponent(provider)}`,
      {
        method: 'DELETE',
      },
    );
  };
}
