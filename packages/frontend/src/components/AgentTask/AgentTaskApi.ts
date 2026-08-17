/**
 * API hooks for sandboxd agent task management.
 *
 * Agent tasks are submitted to sandboxd's /v1/tasks endpoint and can be
 * monitored via SSE streaming at /v1/tasks/:taskId/stream.
 */

import { useAsync } from 'react-use';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AgentTaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentTask {
  id: string;
  status: AgentTaskStatus;
  agent: string;              // 'opencode' | 'claude-code'
  prompt: string;
  createdAt: string;          // ISO timestamp
  updatedAt: string;          // ISO timestamp
  checkpointId?: string;      // for undo support
  entityName: string;
}

export interface AgentTaskCreatePayload {
  agent: 'opencode' | 'claude-code';
  prompt: string;
  model?: string;
  entityName: string;
}

export interface AgentTaskEvent {
  event: string;              // 'progress' | 'completed' | 'error' | 'checkpoint'
  taskId: string;
  data: {
    message?: string;
    checkpointId?: string;
    status?: AgentTaskStatus;
    error?: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Helper: fetch wrapper (reuses existing base)                       */
/* ------------------------------------------------------------------ */

const API_BASE = '/api/sandboxd/v1';

async function agentFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Agent API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Fetch the list of agent tasks for a given entity.
 */
export function useAgentTasks(entityName: string) {
  return useAsync(async () => {
    return agentFetch<AgentTask[]>(`/entities/${entityName}/tasks`);
  }, [entityName]);
}

/**
 * Create a new agent task.
 */
export function useCreateAgentTask() {
  return async (payload: AgentTaskCreatePayload) => {
    return agentFetch<AgentTask>(
      `/entities/${payload.entityName}/tasks`,
      {
        method: 'POST',
        body: JSON.stringify({
          agent: payload.agent,
          prompt: payload.prompt,
          model: payload.model,
        }),
      },
    );
  };
}

/**
 * Get a single agent task by ID.
 */
export function useGetAgentTask() {
  return async (entityName: string, taskId: string) => {
    return agentFetch<AgentTask>(
      `/entities/${entityName}/tasks/${taskId}`,
    );
  };
}

/**
 * Cancel a running agent task.
 */
export function useCancelAgentTask() {
  return async (entityName: string, taskId: string) => {
    return agentFetch(`/entities/${entityName}/tasks/${taskId}/cancel`, {
      method: 'POST',
    });
  };
}

/**
 * Undo a completed task using its checkpoint.
 */
export function useUndoAgentTask() {
  return async (entityName: string, taskId: string) => {
    return agentFetch(`/entities/${entityName}/tasks/${taskId}/undo`, {
      method: 'POST',
    });
  };
}

/**
 * Establish an SSE connection for real-time agent task progress.
 * Returns an EventSource that emits events with the following structure:
 *   - event: 'progress'   -> streaming agent output
 *   - event: 'completed'  -> task finished successfully
 *   - event: 'error'      -> task failed
 *   - event: 'checkpoint' -> checkpoint created (for undo)
 */
export function useAgentTaskStream(
  entityName: string,
  taskId: string,
  onEvent?: (event: AgentTaskEvent) => void,
  onError?: (error: Error) => void,
): EventSource | null {
  // This hook is meant to be called imperatively from within a component.
  // The entityName parameter is unused for the SSE endpoint (the stream is by taskId only),
  // but we keep it for API consistency with the other hooks.
  void entityName;

  const es = new EventSource(
    `/api/sandboxd/v1/tasks/${taskId}/stream`,
  );

  es.onmessage = (msg: MessageEvent) => {
    try {
      const data = JSON.parse(msg.data);
      if (onEvent) {
        onEvent(data);
      }
    } catch {
      // If parsing fails, treat raw data as a progress message
      if (onEvent) {
        onEvent({
          event: 'progress',
          taskId,
          data: { message: msg.data },
        });
      }
    }
  };

  es.onerror = (err: Event) => {
    if (onError) {
      onError(new Error(`SSE connection error: ${err}`));
    }
    es.close();
  };

  return es;
}
