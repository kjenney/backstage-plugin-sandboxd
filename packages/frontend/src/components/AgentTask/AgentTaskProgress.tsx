import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Button,
  Divider,
} from '@material-ui/core';
import {
  Close as CloseIcon,
  PlayArrow as PlayArrowIcon,
} from '@material-ui/icons';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  useAgentTaskStream,
  useGetAgentTask,
  AgentTaskEvent,
  AgentTask,
} from './AgentTaskApi';

/**
 * Real-time SSE progress display for an agent task.
 *
 * Connects to the sandboxd SSE stream for a specific task and shows
 * live progress messages, status changes, and checkpoint events.
 */
export const AgentTaskProgress: React.FC<{ taskId: string }> = ({
  taskId,
}) => {
  const { entity } = useEntity();
  const entityName = entity.metadata.name;

  const getTask = useGetAgentTask();

  const [task, setTask] = useState<AgentTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch initial task state
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await getTask(entityName, taskId);
        if (!cancelled) {
          setTask(t);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [entityName, taskId, getTask]);

  // SSE connection
  const handleEvent = useCallback((event: AgentTaskEvent) => {
    if (event.event === 'progress' && event.data.message) {
      setMessages(prev => [...prev, event.data.message!]);
    } else if (event.event === 'completed') {
      setMessages(prev => [...prev, 'Task completed']);
      if (task) {
        setTask({ ...task, status: 'completed' });
      }
    } else if (event.event === 'error') {
      setMessages(prev => [...prev, `Error: ${event.data.error || 'Unknown error'}`]);
      if (task) {
        setTask({ ...task, status: 'failed' });
      }
    } else if (event.event === 'checkpoint') {
      setMessages(prev => [...prev, 'Checkpoint created']);
    }
  }, [task]);

  const handleError = useCallback((err: Error) => {
    setMessages(prev => [...prev, `Connection lost: ${err.message}`]);
    setConnected(false);
  }, []);

  const connect = useCallback(() => {
    const es = useAgentTaskStream(entityName, taskId, handleEvent, handleError);
    esRef.current = es;
    setConnected(true);
  }, [entityName, taskId, handleEvent, handleError]);

  // Auto-connect when task is running
  useEffect(() => {
    if (task && task.status === 'running' && !connected) {
      connect();
    }
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setConnected(false);
    };
  }, [taskId, task?.status, connected, connect]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <Paper style={{ padding: 16 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          minHeight={100}
        >
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error && !task) {
    return (
      <Paper style={{ padding: 16 }}>
        <Typography variant="body2" color="error">
          Failed to load task: {error}
        </Typography>
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
        <Box display="flex" alignItems="center" style={{ gap: 16 }}>
          <Typography variant="h6">Task Progress</Typography>
          {task && (
            <Chip
              label={task.status.toUpperCase()}
              color={
                task.status === 'running'
                  ? 'primary'
                  : task.status === 'completed'
                  ? 'primary'
                  : task.status === 'failed'
                  ? 'secondary'
                  : 'default'
              }
              size="small"
            />
          )}
          {connected && (
            <Chip
              label="LIVE"
              color="primary"
              size="small"
              style={{ animation: 'pulse 2s infinite' }}
            />
          )}
        </Box>
        <Box>
          {!connected && task && task.status === 'running' && (
            <Button
              size="small"
              startIcon={<PlayArrowIcon />}
              onClick={connect}
            >
              Connect
            </Button>
          )}
          {connected && (
            <Button
              size="small"
              startIcon={<CloseIcon />}
              onClick={() => {
                esRef.current?.close();
                esRef.current = null;
                setConnected(false);
              }}
            >
              Disconnect
            </Button>
          )}
        </Box>
      </Box>

      <Divider style={{ marginBottom: 16 }} />

      <Box
        style={{
          maxHeight: 400,
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: 13,
          background: '#1e1e1e',
          color: '#d4d4d4',
          padding: 16,
          borderRadius: 4,
        }}
      >
        {messages.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            {task?.status === 'running'
              ? 'Waiting for agent output...'
              : 'No progress messages yet.'}
          </Typography>
        ) : (
          messages.map((msg, i) => (
            <Typography
              key={i}
              variant="body2"
              style={{ marginBottom: 4, whiteSpace: 'pre-wrap' }}
            >
              {msg}
            </Typography>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>
    </Paper>
  );
};
