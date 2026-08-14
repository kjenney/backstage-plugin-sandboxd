import React, { useCallback, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Box,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@material-ui/core';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Replay as ReplayIcon,
  DeleteForever as DestroyIcon,
  Brightness3 as SleepIcon,
  WbSunny as WakeIcon,
  OpenInNew as OpenInNewIcon,
} from '@material-ui/icons';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  useSandboxdApps,
  useSandboxdStartApp,
  useSandboxdStopApp,
  useSandboxdRestartApp,
  useSandboxdDestroyApp,
  useSandboxdSleepApp,
  useSandboxdWakeApp,
  SandboxApp,
} from '../SandboxdApi';
import { AppCardStatus } from './AppCardStatus';

type AppAction =
  | 'start'
  | 'stop'
  | 'restart'
  | 'destroy'
  | 'sleep'
  | 'wake';

/**
 * Backstage entity card component for sandboxd.
 *
 * Shows sandbox status (running/sleeping/stopped) with colored indicators,
 * app name and preview URL, and action buttons (start/stop/restart/destroy/sleep/wake).
 * Destroy action requires confirmation via dialog.
 */
export const AppCard: React.FC = () => {
  const { entity } = useEntity();
  const entityName = entity.metadata.name;
  const { value: apps, loading, error } = useSandboxdApps(entityName);
  const startApp = useSandboxdStartApp();
  const stopApp = useSandboxdStopApp();
  const restartApp = useSandboxdRestartApp();
  const destroyApp = useSandboxdDestroyApp();
  const sleepApp = useSandboxdSleepApp();
  const wakeApp = useSandboxdWakeApp();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [destroyConfirmOpen, setDestroyConfirmOpen] = useState(false);
  const [destroyTarget, setDestroyTarget] = useState<string | null>(null);

  const handleAction =
    (action: AppAction, app: SandboxApp) =>
    async () => {
      if (action === 'destroy') {
        setDestroyTarget(app.name);
        setDestroyConfirmOpen(true);
        return;
      }

      setActionLoading(app.name);
      try {
        switch (action) {
          case 'start':
            await startApp(entityName, app.name);
            break;
          case 'stop':
            await stopApp(entityName, app.name);
            break;
          case 'restart':
            await restartApp(entityName, app.name);
            break;
          case 'sleep':
            await sleepApp(entityName);
            break;
          case 'wake':
            await wakeApp(entityName);
            break;
        }
      } catch {
        // Error handled by fetch wrapper
      } finally {
        setActionLoading(null);
      }
    };

  const handleDestroyConfirm = useCallback(async () => {
    const target = destroyTarget;
    setDestroyConfirmOpen(false);
    setDestroyTarget(null);
    if (!target) return;

    setActionLoading(target);
    try {
      await destroyApp(entityName);
    } catch {
      // Error handled by fetch wrapper
    } finally {
      setActionLoading(null);
    }
  }, [destroyTarget, destroyApp, entityName]);

  const handleDestroyCancel = useCallback(() => {
    setDestroyConfirmOpen(false);
    setDestroyTarget(null);
  }, []);

  // Determine which lifecycle buttons to show based on status
  const shouldShowSleep = (status: string) =>
    status === 'running';
  const shouldShowWake = (status: string) =>
    status === 'sleeping';
  const shouldShowStart = (status: string) =>
    status === 'stopped' || status === 'sleeping';
  const shouldShowStop = (status: string) =>
    status === 'running';

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
    <>
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
                    <Box
                      display="flex"
                      alignItems="center"
                      style={{ gap: 8 }}
                    >
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

                      {/* Start — show when stopped or sleeping */}
                      {shouldShowStart(app.status) && (
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
                      )}

                      {/* Stop — show when running */}
                      {shouldShowStop(app.status) && (
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
                      )}

                      {/* Restart — always available */}
                      <Tooltip
                        title={
                          actionLoading === app.name
                            ? 'Action in progress…'
                            : 'Restart app'
                        }
                      >
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

                      {/* Sleep — show when running */}
                      {shouldShowSleep(app.status) && (
                        <Tooltip
                          title={
                            actionLoading === app.name
                              ? 'Action in progress…'
                              : 'Sleep sandbox'
                          }
                        >
                          <Button
                            size="small"
                            startIcon={
                              actionLoading === app.name ? (
                                <CircularProgress size={16} />
                              ) : (
                                <SleepIcon />
                              )
                            }
                            onClick={handleAction('sleep', app)}
                            disabled={actionLoading !== null}
                          >
                            Sleep
                          </Button>
                        </Tooltip>
                      )}

                      {/* Wake — show when sleeping */}
                      {shouldShowWake(app.status) && (
                        <Tooltip
                          title={
                            actionLoading === app.name
                              ? 'Action in progress…'
                              : 'Wake sandbox'
                          }
                        >
                          <Button
                            size="small"
                            color="primary"
                            startIcon={
                              actionLoading === app.name ? (
                                <CircularProgress size={16} />
                              ) : (
                                <WakeIcon />
                              )
                            }
                            onClick={handleAction('wake', app)}
                            disabled={actionLoading !== null}
                          >
                            Wake
                          </Button>
                        </Tooltip>
                      )}

                      {/* Destroy — always available with confirmation */}
                      <Tooltip title="Destroy sandbox (permanent)">
                        <Button
                          size="small"
                          color="secondary"
                          startIcon={<DestroyIcon />}
                          onClick={handleAction('destroy', app)}
                          disabled={actionLoading !== null}
                        >
                          Destroy
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

      {/* Destroy confirmation dialog */}
      <Dialog
        open={destroyConfirmOpen}
        onClose={handleDestroyCancel}
        aria-labelledby="destroy-dialog-title"
        aria-describedby="destroy-dialog-description"
      >
        <DialogTitle id="destroy-dialog-title">
          Destroy Sandbox
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="destroy-dialog-description">
            Are you sure you want to permanently destroy the sandbox for{' '}
            <strong>{destroyTarget}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDestroyCancel} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleDestroyConfirm}
            color="secondary"
            variant="contained"
            startIcon={<DestroyIcon />}
            autoFocus
          >
            Destroy
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
