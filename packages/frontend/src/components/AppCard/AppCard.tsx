import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Box,
  Tooltip,
  CircularProgress,
} from '@material-ui/core';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Replay as ReplayIcon,
  OpenInNew as OpenInNewIcon,
} from '@material-ui/icons';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  useSandboxdApps,
  useSandboxdStartApp,
  useSandboxdStopApp,
  useSandboxdRestartApp,
  SandboxApp,
} from '../SandboxdApi';
import { AppCardStatus } from './AppCardStatus';

/**
 * Backstage entity card component for sandboxd.
 *
 * Shows sandbox status (running/sleeping/stopped) with colored indicators,
 * app name and preview URL, and action buttons (start/stop/restart).
 */
export const AppCard: React.FC = () => {
  const { entity } = useEntity();
  const entityName = entity.metadata.name;
  const { value: apps, loading, error } = useSandboxdApps(entityName);
  const startApp = useSandboxdStartApp();
  const stopApp = useSandboxdStopApp();
  const restartApp = useSandboxdRestartApp();

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction =
    (action: 'start' | 'stop' | 'restart', app: SandboxApp) =>
    async () => {
      setActionLoading(app.name);
      try {
        const fn =
          action === 'start'
            ? startApp
            : action === 'stop'
              ? stopApp
              : restartApp;
        await fn(entityName, app.name);
      } catch {
        // Error handled by fetch wrapper
      } finally {
        setActionLoading(null);
      }
    };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" py={3}>
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="error">
            Failed to load sandboxd apps: {error.message}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Sandboxd Apps
        </Typography>
        {apps && apps.length > 0 ? (
          <Grid container spacing={2}>
            {apps.map((app) => (
              <Grid item xs={12} key={app.name}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Box>
                    <Typography variant="subtitle1">{app.name}</Typography>
                    <AppCardStatus status={app.status} />
                    {app.agentActive && (
                      <Typography
                        variant="caption"
                        style={{ marginLeft: 8 }}
                        color="textSecondary"
                      >
                        Agent: {app.agentModel || 'active'}
                      </Typography>
                    )}
                  </Box>
                  <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                    {app.previewUrl && (
                      <Tooltip title="Open preview">
                        <Button
                          size="small"
                          startIcon={<OpenInNewIcon />}
                          href={app.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Preview
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip
                      title={
                        actionLoading === app.name
                          ? 'Action in progress…'
                          : 'Start app'
                      }
                    >
                      <span>
                        <Button
                          size="small"
                          color="primary"
                          startIcon={
                            actionLoading === app.name ? (
                              <CircularProgress size={16} />
                            ) : (
                              <PlayIcon />
                            )
                          }
                          onClick={handleAction('start', app)}
                          disabled={actionLoading !== null}
                        >
                          Start
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip title="Stop app">
                      <Button
                        size="small"
                        color="secondary"
                        startIcon={
                          actionLoading === app.name ? (
                            <CircularProgress size={16} />
                          ) : (
                            <StopIcon />
                          )
                        }
                        onClick={handleAction('stop', app)}
                        disabled={actionLoading !== null}
                      >
                        Stop
                      </Button>
                    </Tooltip>
                    <Tooltip title="Restart app">
                      <Button
                        size="small"
                        startIcon={
                          actionLoading === app.name ? (
                            <CircularProgress size={16} />
                          ) : (
                            <ReplayIcon />
                          )
                        }
                        onClick={handleAction('restart', app)}
                        disabled={actionLoading !== null}
                      >
                        Restart
                      </Button>
                    </Tooltip>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No sandboxd apps found for this entity.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
