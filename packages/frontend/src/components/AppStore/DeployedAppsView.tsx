import React, { useCallback, useState } from 'react';
import {
  Typography,
  Button,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  DeleteForever as DestroyIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  useSandboxdApps,
  useSandboxdDeleteApp,
  useSandboxdCreateSandbox,
  SandboxdApp,
} from './AppStoreApi';

/**
 * Status chip with color coding for app states.
 */
const STATUS_COLORS: Record<string, string> = {
  running: '#388e3c',
  sleeping: '#ff9800',
  stopped: '#9e9e9e',
  starting: '#1976d2',
  error: '#f44336',
};

const StatusChip: React.FC<{ status?: string }> = ({ status }) => (
  <Chip
    label={status || 'unknown'}
    size="small"
    style={{
      backgroundColor: STATUS_COLORS[status || ''] || '#607d8b',
      color: '#fff',
      textTransform: 'capitalize',
    }}
  />
);

/**
 * View of deployed apps with actions: start sandbox, open preview, delete.
 * Auto-refreshes after each action via revalidation key.
 */
export const DeployedAppsView: React.FC = () => {
  const [revalidateKey, setRevalidateKey] = useState(0);
  const { value: apps, loading, error } = useSandboxdApps(revalidateKey);
  const deleteApp = useSandboxdDeleteApp();
  const createSandbox = useSandboxdCreateSandbox();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SandboxdApp | null>(null);

  const handleCreateSandbox = useCallback(
    async (app: SandboxdApp) => {
      setActionLoading(app.id);
      try {
        await createSandbox(app.id);
        setRevalidateKey((k) => k + 1); // refresh after action
      } catch {
        // Error handled by fetch wrapper
      } finally {
        setActionLoading(null);
      }
    },
    [createSandbox],
  );

  const handleDeleteClick = useCallback((app: SandboxdApp) => {
    setDeleteTarget(app);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const target = deleteTarget;
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
    if (!target) return;

    setActionLoading(target.id);
    try {
      await deleteApp(target.id);
      setRevalidateKey((k) => k + 1); // refresh after action
    } catch {
      // Error handled by fetch wrapper
    } finally {
      setActionLoading(null);
    }
  }, [deleteTarget, deleteApp]);

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
          Failed to load deployed apps: {error.message}
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
        <Typography variant="h6">Deployed Apps</Typography>
        <Box display="flex" alignItems="center">
          <Chip
            label={`${apps?.length ?? 0} apps`}
            size="small"
            variant="outlined"
            style={{ marginRight: 8 }}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => setRevalidateKey((k) => k + 1)}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {apps && apps.length > 0 ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Preset</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Preview</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {apps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <Typography variant="body2" style={{ fontWeight: 'bold' }}>
                      {app.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={app.status} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {app.presetId || 'Custom'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {app.createdAt
                        ? new Date(app.createdAt).toLocaleDateString()
                        : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {app.previewUrl ? (
                      <Tooltip title="Open preview">
                        <Button
                          size="small"
                          href={app.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          startIcon={<OpenInNewIcon />}
                        >
                          Open
                        </Button>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex">
                      {(app.status === 'stopped' || app.status === 'sleeping') && (
                        <Tooltip
                          title={
                            actionLoading === app.id
                              ? 'Starting…'
                              : 'Start sandbox'
                          }
                        >
                          <span>
                            <Button
                              size="small"
                              color="primary"
                              onClick={() => handleCreateSandbox(app)}
                              disabled={actionLoading !== null}
                              style={{ marginRight: 8 }}
                            >
                              {actionLoading === app.id
                                ? 'Starting…'
                                : 'Start'}
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                      <Tooltip
                        title={
                          actionLoading === app.id
                            ? 'Deleting…'
                            : 'Delete app'
                        }
                      >
                        <span>
                          <Button
                            size="small"
                            color="secondary"
                            startIcon={<DestroyIcon />}
                            onClick={() => handleDeleteClick(app)}
                            disabled={actionLoading !== null}
                          >
                            Delete
                          </Button>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography variant="body2" color="textSecondary">
          No deployed apps yet. Use the Deploy button from the App Store tab
          to get started.
        </Typography>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeleteTarget(null);
        }}
      >
        <DialogTitle>Delete App</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete{' '}
            <strong>{deleteTarget?.name}</strong>? This will remove the app and
            all its sandboxes.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteConfirmOpen(false);
              setDeleteTarget(null);
            }}
          >
            Cancel
          </Button>
          <Button
            color="secondary"
            variant="contained"
            startIcon={<DestroyIcon />}
            onClick={handleDeleteConfirm}
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
