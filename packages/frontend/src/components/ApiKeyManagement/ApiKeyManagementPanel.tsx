/**
 * API Key Management Panel — manage sandboxd API keys from the Backstage UI.
 *
 * Provides a table view of existing keys with actions to create, rotate,
 * and revoke keys. Includes a snackbar notification for feedback.
 * Also displays the current user's sandboxd identity (tenant ID, API token).
 */

import React, { useState, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Snackbar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Chip,
  Divider,
} from '@mui/material';
import {
  Create as CreateIcon,
  Delete as DeleteIcon,
  Refresh as RotateIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Person as PersonIcon,
  VpnKey as KeyIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { Alert } from '@mui/lab';
import {
  useSandboxdApiKeys,
  useSandboxdCreateApiKey,
  useSandboxdRotateApiKey,
  useSandboxdRevokeApiKey,
  useSandboxdAuth,
  useSandboxdApiKey,
  useSandboxdTenantId,
  useSandboxdIsMultiTenant,
  CreateApiKeyResult,
} from './ApiKeyApi';

/**
 * Chip colors for key states.
 */
const STATE_COLORS: Record<string, string> = {
  active: '#4caf50',
  expired: '#9e9e9e',
  revoked: '#f44336',
};

function getStateColor(state: string | undefined): string {
  if (!state) return STATE_COLORS.expired;
  return STATE_COLORS[state.toLowerCase()] || STATE_COLORS.expired;
}

/**
 * API Key Management Panel component.
 *
 * Displays a table of sandboxd API keys with actions to:
 * - Create a new key (with name, description, and optional expiry)
 * - Rotate an existing key (revoke old, create replacement)
 * - Revoke an existing key
 * - Toggle visibility of the full key value (only shown on creation)
 *
 * Also displays the current user's sandboxd identity:
 * - Tenant ID (for multi-tenant mode)
 * - API key status
 * - User entity reference
 */
export const ApiKeyManagementPanel: React.FC = () => {
  // Revalidation key for force-refreshing data
  const [revalidateKey, setRevalidateKey] = useState(0);

  const { value: keys, loading, error } = useSandboxdApiKeys(revalidateKey);
  const createApiKey = useSandboxdCreateApiKey();
  const rotateApiKey = useSandboxdRotateApiKey();
  const revokeApiKey = useSandboxdRevokeApiKey();

  // Current user's sandboxd identity
  const { value: identity, loading: identityLoading } = useSandboxdAuth();
  const { value: apiKey, loading: apiKeyLoading } = useSandboxdApiKey();
  const { value: tenantId, loading: tenantLoading } = useSandboxdTenantId();
  const isMultiTenant = useSandboxdIsMultiTenant();

  // Snackbar for notifications
   const [snackbar, setSnackbar] = useState<{
     open: boolean;
     message: string;
     severity: 'success' | 'error';
   }>({ open: false, message: '', severity: 'success' });

  // Dialog for creating a new key
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createExpiresAt, setCreateExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);

  // Dialog for key creation result (showing the full key value)
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResult | null>(null);

  // Dialog for rotating a key
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [rotatingKeyId, setRotatingKeyId] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

  // Dialog for revoking a key
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Toggle visibility of full key values
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const toggleKeyVisibility = useCallback((keyId: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  }, []);

  // Create a new key
  const handleCreate = useCallback(async () => {
    if (!createName.trim()) {
      setSnackbar({
        open: true,
        message: 'Key name is required',
        severity: 'error',
      });
      return;
    }

    setCreating(true);
    try {
      const result = await createApiKey({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        expiresAt: createExpiresAt.trim() || undefined,
      });

      setCreatedKey(result);
      setCreateDialogOpen(false);
      setCreateName('');
      setCreateDescription('');
      setCreateExpiresAt('');
      setSnackbar({
        open: true,
        message: `API key "${result.name}" created successfully`,
        severity: 'success',
      });
      setRevalidateKey((prev) => prev + 1);
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to create API key',
        severity: 'error',
      });
    } finally {
      setCreating(false);
    }
  }, [createName, createDescription, createExpiresAt, createApiKey, setRevalidateKey]);

  // Rotate a key
  const handleRotate = useCallback(async () => {
    if (!rotatingKeyId) return;

    setRotating(true);
    try {
      await rotateApiKey(rotatingKeyId);
      setRotateDialogOpen(false);
      setRotatingKeyId(null);
      setSnackbar({
        open: true,
        message: 'API key rotated successfully',
        severity: 'success',
      });
      setRevalidateKey((prev) => prev + 1);
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to rotate API key',
        severity: 'error',
      });
    } finally {
      setRotating(false);
    }
  }, [rotatingKeyId, rotateApiKey, setRevalidateKey]);

  // Revoke a key
  const handleRevoke = useCallback(async () => {
    if (!revokeKeyId) return;

    setRevoking(true);
    try {
      await revokeApiKey(revokeKeyId);
      setRevokeDialogOpen(false);
      setRevokeKeyId(null);
      setSnackbar({
        open: true,
        message: 'API key revoked successfully',
        severity: 'success',
      });
      setRevalidateKey((prev) => prev + 1);
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to revoke API key',
        severity: 'error',
      });
    } finally {
      setRevoking(false);
    }
  }, [revokeKeyId, revokeApiKey, setRevalidateKey]);

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  };

  const maskApiKey = (key: string | undefined): string => {
    if (!key) return '—';
    if (key.length <= 4) return '•'.repeat(key.length);
    return key.slice(0, 4) + '•'.repeat(Math.min(4, key.length - 4));
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box display="flex" alignItems="center">
            <SecurityIcon style={{ marginRight: 8 }} />
            <Typography variant="h6">API Key Management</Typography>
          </Box>
        }
        subheader="Manage sandboxd API keys for authentication and tenant isolation"
      />

      {/* Identity info section — shows current user's sandboxd identity */}
      {(identityLoading || apiKeyLoading || tenantLoading || identity) && (
        <CardContent>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Current Identity
          </Typography>
          <Divider style={{ marginBottom: 8 }} />
          <Box display="flex" flexWrap="wrap">
            {/* User entity reference */}
            <Box display="flex" alignItems="center">
              <PersonIcon fontSize="small" color="action" />
              <Typography variant="body2" color="textSecondary">
                User:
              </Typography>
              <Typography variant="body2">
                {identity?.userEntityRef || '—'}
              </Typography>
            </Box>

            {/* Tenant ID (multi-tenant only) */}
            {isMultiTenant && (
              <Box display="flex" alignItems="center">
                <GroupIcon fontSize="small" color="action" />
                <Typography variant="body2" color="textSecondary">
                  Tenant:
                </Typography>
                <Typography variant="body2">
                  {tenantId || (tenantLoading ? <CircularProgress size={16} /> : '—')}
                </Typography>
              </Box>
            )}

            {/* API key status */}
            <Box display="flex" alignItems="center">
              <KeyIcon fontSize="small" color="action" />
              <Typography variant="body2" color="textSecondary">
                API Key:
              </Typography>
              <Typography variant="body2">
                {apiKeyLoading ? (
                  <CircularProgress size={16} />
                ) : apiKey ? (
                  <>
                    <code style={{ fontFamily: 'monospace' }}>
                      {maskApiKey(apiKey)}
                    </code>
                    <Button size="small" onClick={() => toggleKeyVisibility('current')}>
                      {revealedKeys.has('current') ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </Button>
                    {revealedKeys.has('current') && (
                      <Typography variant="body2" style={{ fontFamily: 'monospace', marginLeft: 4 }}>
                        {apiKey}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Chip label="No token" size="small" />
                )}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      )}

      {loading && (
        <CardContent>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            py={3}
          >
            <CircularProgress size={24} />
            <Typography variant="body2" style={{ marginLeft: 8 }}>
              Loading API keys...
            </Typography>
          </Box>
        </CardContent>
      )}

      {error && (
        <CardContent>
          <Typography variant="body2" color="error">
            Failed to load API keys: {(error as Error).message}
          </Typography>
        </CardContent>
      )}

      {!loading && !error && (
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1">
              {keys?.length ?? 0} API key{(keys?.length ?? 0) !== 1 ? 's' : ''}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<CreateIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create API Key
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Key Prefix</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {keys?.map((key) => (
                  <TableRow key={key.id} hover>
                    <TableCell>{key.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={key.state}
                        size="small"
                        style={{
                          backgroundColor: getStateColor(key.state),
                          color: '#fff',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2">
                          {revealedKeys.has(key.id)
                            ? key.keyPrefix
                            : '••••'}
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => toggleKeyVisibility(key.id)}
                        >
                          {revealedKeys.has(key.id) ? (
                            <VisibilityOffIcon fontSize="small" />
                          ) : (
                            <VisibilityIcon fontSize="small" />
                          )}
                        </Button>
                      </Box>
                    </TableCell>
                    <TableCell>{formatDate(key.expiresAt)}</TableCell>
                    <TableCell>{formatDate(key.createdAt)}</TableCell>
                    <TableCell>
                      <Box display="flex">
                        <Button
                          size="small"
                          color="primary"
                          startIcon={<RotateIcon />}
                          onClick={() => {
                            setRotatingKeyId(key.id);
                            setRotateDialogOpen(true);
                          }}
                        >
                          Rotate
                        </Button>
                        <Button
                          size="small"
                          color="secondary"
                          startIcon={<DeleteIcon />}
                          onClick={() => {
                            setRevokeKeyId(key.id);
                            setRevokeDialogOpen(true);
                          }}
                        >
                          Revoke
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {keys && keys.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No API keys found. Create one to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      )}

      {/* Create API Key Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Create a new API key for sandboxd authentication. The key value
            will be shown only once after creation.
          </DialogContentText>
          <Box mt={2}>
            <TextField
              label="Key Name"
              fullWidth
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g., my-service-key"
              required
            />
          </Box>
          <Box mt={2}>
            <TextField
              label="Description"
              fullWidth
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Optional description"
            />
          </Box>
          <Box mt={2}>
            <TextField
              label="Expires At (optional)"
              fullWidth
              type="date"
              value={createExpiresAt}
              onChange={(e) => setCreateExpiresAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreate}
            disabled={creating || !createName.trim()}
            startIcon={
              creating ? <CircularProgress size={16} /> : <CreateIcon />
            }
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Created Key Dialog (show the full key value) */}
      <Dialog
        open={createdKey !== null}
        onClose={() => setCreatedKey(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>API Key Created</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your API key has been created. Store it securely — it will not be
            shown again.
          </DialogContentText>
          {createdKey && (
            <Box mt={2}>
              <Typography variant="subtitle1">
                Key Name: {createdKey.name}
              </Typography>
              <Typography variant="subtitle1" style={{ marginTop: 8 }}>
                Key Value:
              </Typography>
              <Paper
                variant="outlined"
                style={{
                  padding: 16,
                  marginTop: 8,
                  backgroundColor: '#f5f5f5',
                  wordBreak: 'break-all',
                }}
              >
                <Typography variant="body1" style={{ fontFamily: 'monospace' }}>
                  {createdKey.key}
                </Typography>
              </Paper>
              <Typography variant="caption" color="textSecondary" style={{ marginTop: 8, display: 'block' }}>
                Key Prefix (for reference): {createdKey.keyPrefix}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatedKey(null)} color="primary">
            Copy to Clipboard
          </Button>
          <Button onClick={() => setCreatedKey(null)} color="primary">
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rotate Key Dialog */}
      <Dialog open={rotateDialogOpen} onClose={() => setRotateDialogOpen(false)}>
        <DialogTitle>Rotate API Key</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Rotating this key will revoke the current key and create a
            replacement with the same name. The new key value will be shown
            only once after rotation.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRotateDialogOpen(false)} disabled={rotating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRotate}
            disabled={rotating}
            startIcon={
              rotating ? <CircularProgress size={16} /> : <RotateIcon />
            }
            style={{ backgroundColor: '#ff9800', color: '#fff' }}
          >
            {rotating ? 'Rotating...' : 'Rotate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Key Dialog */}
      <Dialog open={revokeDialogOpen} onClose={() => setRevokeDialogOpen(false)}>
        <DialogTitle>Revoke API Key</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to revoke this API key? This action is
            irreversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeDialogOpen(false)} disabled={revoking}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleRevoke}
            disabled={revoking}
            startIcon={
              revoking ? <CircularProgress size={16} /> : <DeleteIcon />
            }
          >
            {revoking ? 'Revoking...' : 'Revoke'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Card>
  );
};
