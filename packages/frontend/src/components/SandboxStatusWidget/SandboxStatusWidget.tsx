import React, { useCallback, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Tooltip,
  CircularProgress,
  IconButton,
} from '@material-ui/core';
import {
  FiberManualRecord as DotIcon,
  PlayArrow as PlayIcon,
  Brightness3 as SleepIcon,
  WbSunny as WakeIcon,
  Refresh as RefreshIcon,
} from '@material-ui/icons';
import { useEntity } from '@backstage/plugin-catalog-react';
import { isSandboxdAvailable } from '../AppCard/isSandboxdAvailable';
import {
  useSandboxdApps,
  useSandboxdStartApp,
  useSandboxdSleepApp,
  useSandboxdWakeApp,
  SandboxStatus,
} from '../SandboxdApi';

const STATUS_CONFIG: Record<SandboxStatus, { label: string; color: string }> = {
  running:  { label: 'Running',  color: '#4caf50' },
  sleeping: { label: 'Sleeping', color: '#ff9800' },
  stopped:  { label: 'Stopped',  color: '#f44336' },
};

/**
 * Sandbox Status Widget — a lightweight indicator for entity overview pages.
 *
 * Shows the current sandbox status as a colored chip with quick action buttons
 * (wake sleeping, start stopped, sleep running). Designed to be compact enough
 * for entity page headers or overview panels.
 */
export const SandboxStatusWidget: React.FC = () => {
  const { entity } = useEntity();
  const entityName = entity.metadata.name;
  const enabled = isSandboxdAvailable(entity);
  const { value: apps, loading, error } = useSandboxdApps(entityName);

  const startApp = useSandboxdStartApp();
  const sleepApp = useSandboxdSleepApp();
  const wakeApp = useSandboxdWakeApp();

  const [actionLoading, setActionLoading] = useState(false);

  // Derive overall status from first app (or 'not-configured')
  const primaryApp = apps?.[0] ?? null;
  const status: SandboxStatus | 'not-configured' =
    primaryApp?.status ?? 'not-configured';

  const handleQuickAction = useCallback(async () => {
    setActionLoading(true);
    try {
      switch (status) {
        case 'stopped':
          if (primaryApp) await startApp(entityName, primaryApp.name);
          break;
        case 'sleeping':
          await wakeApp(entityName);
          break;
        case 'running':
          await sleepApp(entityName);
          break;
        default:
          break;
      }
    } catch {
      // handled by fetch wrapper
    } finally {
      setActionLoading(false);
    }
  }, [status, entityName, primaryApp, startApp, wakeApp, sleepApp]);

  const statusConfig =
    status !== 'not-configured' ? STATUS_CONFIG[status] : undefined;

  if (!enabled) {
    return (
      <Card variant="outlined" style={{ borderColor: '#e0e0e0' }}>
        <CardContent>
          <Box
            display="flex"
            alignItems="center"
            style={{ gap: 8 }}
          >
            <DotIcon style={{ fontSize: 12, color: '#9e9e9e' }} />
            <Typography variant="body2" color="textSecondary">
              Sandboxd not configured
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            py={1}
          >
            <CircularProgress size={20} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" alignItems="center" style={{ gap: 8 }}>
            <DotIcon style={{ fontSize: 12, color: '#f44336' }} />
            <Typography variant="body2" color="error">
              Sandboxd connection error
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!primaryApp) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" alignItems="center" style={{ gap: 8 }}>
            <DotIcon style={{ fontSize: 12, color: '#9e9e9e' }} />
            <Typography variant="body2" color="textSecondary">
              No sandbox found
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      variant="outlined"
      style={{
        borderColor: statusConfig?.color + '44',
      }}
    >
      <CardContent>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box display="flex" alignItems="center" style={{ gap: 8 }}>
            <Chip
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <DotIcon style={{ fontSize: 10, color: statusConfig?.color }} />
                  {statusConfig?.label}
                </span>
              }
              style={{
                backgroundColor: statusConfig?.color + '22',
                border: `1px solid ${statusConfig?.color}44`,
                color: statusConfig?.color,
                fontWeight: 500,
                fontSize: '0.75rem',
              }}
              size="small"
            />
            <Typography variant="body2" color="textSecondary">
              {primaryApp.name}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" style={{ gap: 4 }}>
            {/* Quick action button */}
            {status !== 'not-configured' && (
              <Tooltip
                title={
                  status === 'stopped'
                    ? 'Start'
                    : status === 'sleeping'
                    ? 'Wake'
                    : 'Sleep'
                }
              >
                <span>
                  <IconButton
                    size="small"
                    onClick={handleQuickAction}
                    disabled={actionLoading}
                    color="primary"
                  >
                    {actionLoading ? (
                      <CircularProgress size={16} />
                    ) : status === 'stopped' ? (
                      <PlayIcon fontSize="small" />
                    ) : status === 'sleeping' ? (
                      <WakeIcon fontSize="small" />
                    ) : (
                      <SleepIcon fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            )}

            {/* Refresh button */}
            <Tooltip title="Refresh status">
              <IconButton size="small" color="default">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
