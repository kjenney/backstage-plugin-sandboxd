/**
 * API hooks for sandboxd agent task management.
 *
 * Agent tasks are submitted to sandboxd's /v1/tasks endpoint and can be
 * monitored via SSE streaming at /v1/tasks/:taskId/stream.
 */
export type AgentTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export interface AgentTask {
    id: string;
    status: AgentTaskStatus;
    agent: string;
    prompt: string;
    createdAt: string;
    updatedAt: string;
    checkpointId?: string;
    entityName: string;
}
export interface AgentTaskCreatePayload {
    agent: 'opencode' | 'claude-code';
    prompt: string;
    model?: string;
    entityName: string;
}
export interface AgentTaskEvent {
    event: string;
    taskId: string;
    data: {
        message?: string;
        checkpointId?: string;
        status?: AgentTaskStatus;
        error?: string;
    };
}
/**
 * Fetch the list of agent tasks for a given entity.
 */
export declare function useAgentTasks(entityName: string): import("react-use/lib/useAsyncFn").AsyncState<AgentTask[]>;
/**
 * Create a new agent task.
 */
export declare function useCreateAgentTask(): (payload: AgentTaskCreatePayload) => Promise<AgentTask>;
/**
 * Get a single agent task by ID.
 */
export declare function useGetAgentTask(): (entityName: string, taskId: string) => Promise<AgentTask>;
/**
 * Cancel a running agent task.
 */
export declare function useCancelAgentTask(): (entityName: string, taskId: string) => Promise<unknown>;
/**
 * Undo a completed task using its checkpoint.
 */
export declare function useUndoAgentTask(): (entityName: string, taskId: string) => Promise<unknown>;
/**
 * Establish an SSE connection for real-time agent task progress.
 * Returns an EventSource that emits events with the following structure:
 *   - event: 'progress'   -> streaming agent output
 *   - event: 'completed'  -> task finished successfully
 *   - event: 'error'      -> task failed
 *   - event: 'checkpoint' -> checkpoint created (for undo)
 */
export declare function useAgentTaskStream(entityName: string, taskId: string, onEvent?: (event: AgentTaskEvent) => void, onError?: (error: Error) => void): EventSource | null;
