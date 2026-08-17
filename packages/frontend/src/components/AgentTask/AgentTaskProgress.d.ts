import React from 'react';
/**
 * Real-time SSE progress display for an agent task.
 *
 * Connects to the sandboxd SSE stream for a specific task and shows
 * live progress messages, status changes, and checkpoint events.
 */
export declare const AgentTaskProgress: React.FC<{
    taskId: string;
}>;
