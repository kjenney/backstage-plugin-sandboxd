import React, { useCallback, useState } from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  VpnKey as KeyIcon,
} from '@mui/icons-material';
import { Alert } from '@mui/lab';
import {
  useAgentCredentials,
  useUpdateAgentCredentials,
  useRemoveAgentCredentials,
  AgentCredentialConfig,
  AgentCredentialUpdate,
} from './AgentCredentialsApi';

/**
 * Agent credential configuration panel.
 *
 * Displays configured agent credential providers and allows adding/updating
 * credentials. Credentials are stored in sandboxd's credential-injecting
 * proxy — API keys never leave the infrastructure.
 */
export const AgentCredentialsPanel: React.FC = () => {
  const { value: credentials, loading, error } = useAgentCredentials();
  const updateCredentials = useUpdateAgentCredentials();
  const removeCredentials = useRemoveAgentCredentials();

  const [addOpen, setAddOpen] = useState(false);
  const [newProvider, setNewProvider] = useState('openai');
  const [newApiKey, setNewApiKey] = useState('');
  const [newEndpoint, setNewEndpoint] = useState('');
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const handleAdd = useCallback(async () => {
    if (!newApiKey.trim()) return;
    setSaving(true);
    try {
      const payload: AgentCredentialUpdate = {
        provider: newProvider,
        apiKey: newApiKey.trim(),
      };
      if (newEndpoint.trim()) {
        payload.endpoint = newEndpoint.trim();
      }
      await updateCredentials(payload);
      setNewApiKey('');
      setNewEndpoint('');
      setAddOpen(false);
      setSnackbar({
        open: true,
        message: 'Credential added successfully',
        severity: 'success',
      });
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to add credential',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  }, [newProvider, newApiKey, newEndpoint, updateCredentials]);

  const handleRemove = useCallback(async (provider: string) => {
    try {
      await removeCredentials(provider);
      setSnackbar({
        open: true,
        message: `Removed ${provider} credentials`,
        severity: 'success',
      });
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to remove credentials',
        severity: 'error',
      });
    }
  }, [removeCredentials]);

  const providerColorMap: Record<string, 'primary' | 'secondary' | 'default'> = {
    openai: 'primary',
    anthropic: 'secondary',
    custom: 'default',
  };

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
          Failed to load credentials: {error.message}
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
        <Typography variant="h6">Agent Credentials</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
        >
          Add Provider
        </Button>
      </Box>

      <Typography variant="body2" color="textSecondary" gutterBottom>
        Manage API credentials for AI agent providers. Keys are stored securely
        in sandboxd's credential-injecting proxy — they never leave the
        infrastructure.
      </Typography>

      <Divider style={{ margin: '16px 0' }} />

      {credentials && credentials.length > 0 ? (
        <Box>
          {credentials.map((cred: AgentCredentialConfig) => (
            <Box
              key={cred.provider}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={2}
              p={2}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: 4,
              }}
            >
              <Box>
                <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                  <Chip
                    label={cred.provider.toUpperCase()}
                    color={providerColorMap[cred.provider] || 'default'}
                    size="small"
                  />
                  {cred.apiKeySet && (
                    <Chip
                      label="Configured"
                      color="primary"
                      size="small"
                    />
                  )}
                </Box>
                <Box mt={1}>
                  <Typography variant="body2" color="textSecondary">
                    Models: {cred.models.length > 0 ? cred.models.join(', ') : 'Default'}
                  </Typography>
                </Box>
                {cred.endpoint && (
                  <Typography variant="caption" color="textSecondary">
                    Endpoint: {cred.endpoint}
                  </Typography>
                )}
              </Box>
              <IconButton
                size="small"
                onClick={() => handleRemove(cred.provider)}
                color="secondary"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
        </Box>
      ) : (
        <Box mt={2}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minHeight={100}
          >
            <KeyIcon style={{ fontSize: 48, color: '#bdbdbd' }} />
          </Box>
          <Typography variant="body2" color="textSecondary" align="center">
            No agent credentials configured. Add a provider to get started.
          </Typography>
        </Box>
      )}

      {/* Add credential dialog */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Agent Credential Provider</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <TextField
              select
              label="Provider"
              fullWidth
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value)}
              margin="normal"
            >
              <MenuItem value="openai">OpenAI</MenuItem>
              <MenuItem value="anthropic">Anthropic</MenuItem>
              <MenuItem value="custom">Custom Endpoint</MenuItem>
            </TextField>
          </Box>
          <Box mt={2}>
            <TextField
              label="API Key"
              fullWidth
              type="password"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              margin="normal"
            />
          </Box>
          {newProvider === 'custom' && (
            <Box mt={2}>
              <TextField
                label="Endpoint URL"
                fullWidth
                value={newEndpoint}
                onChange={(e) => setNewEndpoint(e.target.value)}
                margin="normal"
                placeholder="https://api.example.com/v1"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAdd}
            variant="contained"
            color="primary"
            disabled={!newApiKey.trim() || saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};
