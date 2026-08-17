# Agent Tasks

The Agent Task panel allows developers to create, monitor, manage, and undo AI coding agent tasks via sandboxd's agent system.

## Features

- **Create tasks** — Submit prompts to AI coding agents with configurable models
- **SSE progress streaming** — Real-time agent output via Server-Sent Events
- **Cancel tasks** — Stop a running agent task mid-execution
- **Undo tasks** — Revert a completed task using its checkpoint

## Task Lifecycle

```
Create → Running → Completed → (optional) Undone
                → Cancelled
                → Error
```

## SSE Events

The SSE proxy streams the following event types from sandboxd:

| Event | Description |
|-------|-------------|
| `progress` | Streaming agent output (token-by-token) |
| `completed` | Task finished successfully |
| `error` | Task failed with an error |
| `checkpoint` | Checkpoint created (enables undo) |

## Creating a Task

```tsx
import { useCreateAgentTask } from '@internal/backstage-plugin-sandboxd-frontend';

const createTask = useCreateAgentTask();

// Create a task
await createTask(entityName, {
  agent: 'default',        // Agent identifier
  prompt: 'Build a REST API...',  // The prompt for the agent
  model: 'gpt-4o',        // AI model to use
});
```

## Monitoring Task Progress

The SSE connection is established automatically when viewing the Agent Tasks tab. Progress events are streamed in real-time:

```tsx
import { useSseAgentTaskProgress } from '@internal/backstage-plugin-sandboxd-frontend';

const { progress, status, error } = useSseAgentTaskProgress(entityName, taskId);
```

## Cancelling a Task

```tsx
import { useCancelAgentTask } from '@internal/backstage-plugin-sandboxd-frontend';

const cancelTask = useCancelAgentTask();
await cancelTask(entityName, taskId);
```

## Undoing a Task

If a checkpoint was created during task execution, the task can be undone:

```tsx
import { useUndoAgentTask } from '@internal/backstage-plugin-sandboxd-frontend';

const undoTask = useUndoAgentTask();
await undoTask(entityName, taskId);
```

## Agent Task API Hooks

| Hook | Purpose |
|------|---------|
| `useAgentTaskList(entityName)` | List all tasks for the entity |
| `useCreateAgentTask()` | Create a new agent task |
| `useCancelAgentTask()` | Cancel a running task |
| `useUndoAgentTask()` | Undo a completed task via checkpoint |
| `useSseAgentTaskProgress(entityName, taskId)` | Stream task progress via SSE |

## Backend Endpoints

The backend proxies the following agent task endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/v1/entities/:entityName/tasks` | List tasks |
| `POST` | `/v1/entities/:entityName/tasks` | Create task |
| `GET` | `/v1/entities/:entityName/tasks/:taskId` | Get task details |
| `POST` | `/v1/entities/:entityName/tasks/:taskId/cancel` | Cancel task |
| `POST` | `/v1/entities/:entityName/tasks/:taskId/undo` | Undo task |
| `GET` | `/v1/tasks/:taskId/stream` | SSE stream (proxied via SSE proxy) |
