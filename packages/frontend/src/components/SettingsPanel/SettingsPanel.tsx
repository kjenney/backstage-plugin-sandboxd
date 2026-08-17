import React, { useState, useCallback } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  CircularProgress,
  Snackbar,
  MenuItem,
  Divider,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { Save as SaveIcon } from '@material-ui/icons';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  useSandboxdSettings,
  useSandboxdUpdateSettings,
  SandboxdSettings,
} from '../SandboxdApi';

/**
 * Settings panel for sandboxd runtime lifecycle and agent configuration.
 *
 * Provides controls for:
 * - Runtime lifecycle settings (sleep timeout, memory limits)
 * - Agent model configuration
 * - Max concurrent apps
 */
export const SettingsPanel: React.FC = () => {
  const { entity } = useEntity();
  const entityName = entity.metadata.name;
  const { value: settings, loading, error } = useSandboxdSettings(entityName);
  const updateSettings = useSandboxdUpdateSettings();

  const [localSettings, setLocalSettings] = useState<SandboxdSettings>({});
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // Sync local state when settings load
  React.useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleChange = useCallback(
    (field: keyof SandboxdSettings) =>
      (
        e:
          | React.ChangeEvent<HTMLInputElement>
          | React.ChangeEvent<{ value: unknown }>,
      ) => {
        const value = e.target.value;
        setLocalSettings((prev) => ({
          ...prev,
          [field]:
            typeof prev[field] === 'number'
              ? Number(value) || 0
              : value,
        }));
      },
    [],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateSettings(entityName, localSettings);
      setSnackbar({
        open: true,
        message: 'Settings saved successfully',
        severity: 'success',
      });
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to save settings',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  }, [entityName, localSettings, updateSettings]);

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
          Failed to load settings: {error.message}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>
        Sandboxd Settings
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Configure runtime lifecycle and agent behavior for{' '}
        <strong>{entityName}</strong>.
      </Typography>

      <Divider style={{ margin: '16px 0' }} />

      <Typography variant="subtitle1" gutterBottom>
        Runtime Lifecycle
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Sleep Timeout (seconds)"
            type="number"
            fullWidth
            value={localSettings.sleepTimeout ?? ''}
            onChange={handleChange('sleepTimeout')}
            helperText="Time before an idle sandbox goes to sleep"
            InputProps={{
              inputProps: { min: 0 },
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Memory Limit (MB)"
            type="number"
            fullWidth
            value={localSettings.memoryLimitMb ?? ''}
            onChange={handleChange('memoryLimitMb')}
            helperText="Maximum memory allocation per sandbox"
            InputProps={{
              inputProps: { min: 0 },
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Max Concurrent Apps"
            type="number"
            fullWidth
            value={localSettings.maxConcurrentApps ?? ''}
            onChange={handleChange('maxConcurrentApps')}
            helperText="Maximum number of concurrent sandbox apps"
            InputProps={{
              inputProps: { min: 0 },
            }}
          />
        </Grid>
      </Grid>

      <Divider style={{ margin: '16px 0' }} />

      <Typography variant="subtitle1" gutterBottom>
        Agent Configuration
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Agent Model"
            fullWidth
            select
            value={localSettings.agentModel ?? ''}
            onChange={handleChange('agentModel')}
            helperText="Language model used for agent inference"
          >
            <MenuItem value="">Default</MenuItem>
            <MenuItem value="gpt-4o">GPT-4o</MenuItem>
            <MenuItem value="gpt-4">GPT-4</MenuItem>
            <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
            <MenuItem value="claude-3-opus">Claude 3 Opus</MenuItem>
            <MenuItem value="claude-3-sonnet">Claude 3 Sonnet</MenuItem>
            <MenuItem value="claude-3-haiku">Claude 3 Haiku</MenuItem>
            <MenuItem value="anthropic/claude-3.5-sonnet">
              Claude 3.5 Sonnet
            </MenuItem>
          </TextField>
        </Grid>
      </Grid>

      <Box mt={3}>
        <Button
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          Save Settings
        </Button>
      </Box>

      {/* Success/Error notification */}
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
