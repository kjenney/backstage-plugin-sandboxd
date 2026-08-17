import React, { useCallback, useState } from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Undo as UndoIcon,
  Refresh as RefreshIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  useAgentTasks,
  useCreateAgentTask,
  useCancelAgentTask,
  useUndoAgentTask,
  AgentTask,
  AgentTaskStatus,
} from './AgentTaskApi';

/**
 * Color-coded status chip for agent task states.
 */
function TaskStatusChip({ status }: { status: AgentTaskStatus }) {
  const colorMap: Record<AgentTaskStatus, 'default' | 'primary' | 'secondary'> = {
    pending: 'default',
    running: 'primary',
    completed: 'primary',
    failed: 'secondary',
    cancelled: 'default',
  };

  return (
    <Chip
      label={status.toUpperCase()}
      color={colorMap[status]}
      size="small"
      style={{ textTransform: 'uppercase', fontSize: 10 }}
    />
  );
}

/**
 * Agent task management UI — list, create, cancel, and undo agent tasks.
 *
 * Provides:
 * - Table view of all agent tasks for the entity
 * - Create new task dialog with agent model selection
 * - Cancel running tasks
 * - Undo completed tasks (reverts to checkpoint)
 */
export const AgentTaskList: React.FC = () => {
  const { entity } = useEntity();
  const entityName = entity.metadata.name;

  const { value: tasks, loading, error } = useAgentTasks(entityName);
  const createTask = useCreateAgentTask();
  const cancelTask = useCancelAgentTask();
  const undoTask = useUndoAgentTask();

  const [createOpen, setCreateOpen] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [newAgent, setNewAgent] = useState<'opencode' | 'claude-code'>('opencode');
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (!newPrompt.trim()) return;
    setCreating(true);
    try {
      await createTask({
        agent: newAgent,
        prompt: newPrompt.trim(),
        entityName,
      });
      setNewPrompt('');
      setCreateOpen(false);
    } catch {
      // Error handled by API hook — user sees page reload on retry
    } finally {
      setCreating(false);
    }
  }, [newPrompt, newAgent, entityName, createTask]);

  const handleCancel = useCallback(async (taskId: string) => {
    setActionLoading(taskId);
    try {
      await cancelTask(entityName, taskId);
    } finally {
      setActionLoading(null);
    }
  }, [entityName, cancelTask]);

  const handleUndo = useCallback(async (taskId: string) => {
    setActionLoading(taskId);
    try {
      await undoTask(entityName, taskId);
    } finally {
      setActionLoading(null);
    }
  }, [entityName, undoTask]);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  if (loading) {
    return (
      <Paper style={{ padding: 16 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          minHeight={200}
        >
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper style={{ padding: 16 }}>
        <Typography variant="body2" color="error">
          Failed to load agent tasks: {error.message}
        </Typography>
        <Box mt={2}>
          <Button variant="outlined" onClick={handleRefresh}>
            Retry
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper style={{ padding: 16 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">Agent Tasks</Typography>
        <Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            style={{ marginRight: 8 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            New Task
          </Button>
        </Box>
      </Box>

      {tasks && tasks.length > 0 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell>Prompt</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((task: AgentTask) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <TaskStatusChip status={task.status} />
                  </TableCell>
                  <TableCell>{task.agent}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      noWrap
                      style={{ maxWidth: 300 }}
                    >
                      {task.prompt}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {new Date(task.createdAt).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {task.status === 'running' && (
                      <Tooltip title="Cancel task">
                        <IconButton
                          size="small"
                          onClick={() => handleCancel(task.id)}
                          disabled={actionLoading === task.id}
                        >
                          {actionLoading === task.id ? (
                            <CircularProgress size={16} />
                          ) : (
                            <StopIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                    {task.status === 'completed' && task.checkpointId && (
                      <Tooltip title="Undo (revert to checkpoint)">
                        <IconButton
                          size="small"
                          onClick={() => handleUndo(task.id)}
                          disabled={actionLoading === task.id}
                        >
                          {actionLoading === task.id ? (
                            <CircularProgress size={16} />
                          ) : (
                            <UndoIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography variant="body2" color="textSecondary">
          No agent tasks found for this entity. Create a new task to start
          AI-driven development.
        </Typography>
      )}

      {/* Create task dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Agent Task</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <TextField
              select
              label="Agent"
              fullWidth
              value={newAgent}
              onChange={(e) =>
                setNewAgent(e.target.value as 'opencode' | 'claude-code')
              }
              margin="normal"
            >
              <MenuItem value="opencode">OpenCode</MenuItem>
              <MenuItem value="claude-code">Claude Code</MenuItem>
            </TextField>
          </Box>
          <Box mt={2}>
            <TextField
              label="Prompt"
              fullWidth
              multiline
              rows={6}
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="Describe what you want the AI agent to build..."
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            color="primary"
            disabled={!newPrompt.trim() || creating}
          >
            {creating ? <CircularProgress size={20} /> : 'Create Task'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
