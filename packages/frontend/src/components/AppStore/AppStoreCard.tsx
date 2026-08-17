import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Divider,
  Typography,
  Button,
  Chip,
  Box,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Launch as OpenInNewIcon,
  Storage as AppIcon,
} from '@mui/icons-material';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useSandboxdApps } from '../SandboxdApi';
import {
  useSandboxdStartApp,
  useSandboxdStopApp,
} from '../SandboxdApi';
import {
  parseSandboxdAnnotations,
} from '../../annotations';
import { useSandboxdPreviewUrl } from '../ApiKeyManagement/PreviewUrlApi';

/**
 * Status chip colors — consistent with the rest of the plugin.
 */
const STATUS_COLORS: Record<string, string> = {
  running: '#4caf50',
  sleeping: '#ff9800',
  stopped: '#9e9e9e',
  starting: '#2196f3',
  error: '#f44336',
};

function getStatusColor(status: string | undefined): string {
  if (!status) return STATUS_COLORS.stopped;
  return STATUS_COLORS[status.toLowerCase()] || STATUS_COLORS.stopped;
}

/**
 * AppStore entity card component for Software Catalog integration.
 *
 * This card appears on entity pages in the Backstage Software Catalog
 * for entities that have sandboxd annotations. It shows the app's
 * current status, preview URL, preset information, and quick-action
 * buttons (start/stop/preview).
 *
 * The card is designed to be used alongside the existing AppCard
 * lifecycle management component, providing a lightweight overview
 * of the sandboxd app's state directly on the catalog entity page.
 */
export const AppStoreCard: React.FC = () => {
  const { entity } = useEntity();
  const entityName = entity.metadata.name;
  const config = parseSandboxdAnnotations(entity.metadata.annotations);

  const {
    value: apps,
    loading,
    error,
  } = useSandboxdApps(entityName);
  const startApp = useSandboxdStartApp();
  const stopApp = useSandboxdStopApp();

  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  // If the entity doesn't have sandboxd enabled, don't show the card
  if (!config.enabled && !config.appId) {
    return null;
  }

  const app = apps?.[0];

  const handleStart = async () => {
    if (!app) return;
    setActionLoading('start');
    try {
      await startApp(entityName, app.name);
    } catch {
      // Error handled by fetch wrapper
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async () => {
    if (!app) return;
    setActionLoading('stop');
    try {
      await stopApp(entityName, app.name);
    } catch {
      // Error handled by fetch wrapper
    } finally {
      setActionLoading(null);
    }
  };

  const status = app?.status || config.status;

  // Get auth-gated preview URL from the backend
  const { value: gatedPreviewUrl } = useSandboxdPreviewUrl(
    config.appId || '',
  );

  // Use the gated preview URL if available, fall back to the raw URL
  const effectivePreviewUrl = gatedPreviewUrl?.url || app?.previewUrl || config.previewUrl;

  return (
    <Card>
      <CardHeader
        title="Sandboxd App"
        subheader={entityName}
        avatar={<AppIcon />}
      />
      <Divider />

      {loading && (
        <CardContent>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            py={3}
          >
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      )}

      {error && (
        <CardContent>
          <Typography variant="body2" color="error">
            Failed to load sandboxd app status: {(error as Error).message}
          </Typography>
        </CardContent>
      )}

      {app && (
        <CardContent>
          {/* Status and metadata row */}
          <Box mb={2}>
            <Chip
              label={status || 'unknown'}
              size="small"
              style={{
                backgroundColor: getStatusColor(status),
                color: '#fff',
                marginRight: 8,
              }}
            />
            {config.presetId && (
              <Chip
                label={`Preset: ${config.presetId}`}
                size="small"
                variant="outlined"
                style={{ marginRight: 8 }}
              />
            )}
            {config.runtime && (
              <Chip
                label={`Runtime: ${config.runtime}`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>

          {/* Preview URL */}
          {effectivePreviewUrl && (
            <Box mb={2}>
              <Tooltip title="Open in new tab">
                <Button
                  component="a"
                  size="small"
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  href={effectivePreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  disabled={false}
                >
                  Open Preview
                </Button>
              </Tooltip>
            </Box>
          )}

          {/* Quick action buttons */}
          <Box display="flex" alignItems="center" style={{ gap: 8 }}>
            {status !== 'running' && (
              <Button
                size="small"
                variant="contained"
                color="primary"
                disabled={actionLoading !== null}
                onClick={handleStart}
                startIcon={
                  actionLoading === 'start' ? (
                    <CircularProgress size={16} />
                  ) : undefined
                }
              >
                Start
              </Button>
            )}

            {status === 'running' && (
              <Button
                size="small"
                variant="contained"
                color="secondary"
                disabled={actionLoading !== null}
                onClick={handleStop}
                startIcon={
                  actionLoading === 'stop' ? (
                    <CircularProgress size={16} />
                  ) : undefined
                }
              >
                Stop
              </Button>
            )}

            {config.appId && (
              <Typography variant="caption" color="textSecondary">
                App ID: {config.appId}
              </Typography>
            )}
          </Box>
        </CardContent>
      )}

      {/* No app found but entity is sandboxd-enabled */}
      {!loading && !error && !app && (
        <CardContent>
          <Typography variant="body2" color="textSecondary">
            No sandboxd app found for this entity. Use the App Store tab to
            deploy one.
          </Typography>
        </CardContent>
      )}
    </Card>
  );
};
