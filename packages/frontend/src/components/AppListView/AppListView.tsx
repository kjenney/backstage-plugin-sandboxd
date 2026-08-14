import React, { useCallback } from 'react';
import {
  Typography,
  Button,
  Box,
  CircularProgress,
  Paper,
} from '@material-ui/core';
import { Refresh as RefreshIcon } from '@material-ui/icons';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useSandboxdApps } from '../SandboxdApi';
import { AppListTable } from './AppListTable';

/**
 * List view of all sandboxd apps with status, preview URLs, and agent activity.
 */
export const AppListView: React.FC = () => {
  const { entity } = useEntity();
  const entityName = entity.metadata.name;

  const { value: apps, loading, error } = useSandboxdApps(
    entityName,
  );

  const handleRefresh = useCallback(() => {
    // Trigger a re-fetch by toggling a key — useSandboxdApps will re-run
    // when entityName changes, so we force a state update
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
          Failed to load sandboxd apps: {error.message}
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
        <Typography variant="h6">Sandboxd Apps</Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Box>
      {apps && apps.length > 0 ? (
        <AppListTable apps={apps} onRefresh={handleRefresh} />
      ) : (
        <Typography variant="body2" color="textSecondary">
          No sandboxd apps found for this entity. Ensure the entity has the
          sandboxd annotation and that sandboxd is running.
        </Typography>
      )}
    </Paper>
  );
};
