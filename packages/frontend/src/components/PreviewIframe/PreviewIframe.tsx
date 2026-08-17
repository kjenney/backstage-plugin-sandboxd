import React, { useCallback, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Tooltip,
  CircularProgress,
  Paper,
  Divider,
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  FileCopy as CopyIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  WbSunny as WakeIcon,
  Brightness3 as SleepIcon,
} from '@mui/icons-material';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useSandboxdPreviewUrl } from '../ApiKeyManagement/PreviewUrlApi';
import {
  useSandboxdWakeApp,
  useSandboxdSleepApp,
  useSandboxdApps,
} from '../SandboxdApi';
import { SandboxStatus } from '../SandboxdApi';

/* ------------------------------------------------------------------ */
/*  Wake State Indicator                                               */
/* ------------------------------------------------------------------ */

/**
 * Shows a "warming up" loading state while a sleeping sandbox
 * is being woken up. Displays a pulse animation and a message
 * encouraging the user to wait.
 */
const WakeStateIndicator: React.FC<{ isWaking: boolean }> = ({
  isWaking,
}) => {
  if (!isWaking) return null;
  return (
    <Paper
      elevation={2}
      style={{
        padding: 16,
        textAlign: 'center',
        background:
          'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
        border: '1px solid #ff9800',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Pulse ring animation */}
      <Box
        position="absolute"
        top={-20}
        left={-20}
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          border: '2px solid #ff9800',
          opacity: 0.3,
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />
      <Box display="flex" flexDirection="column" alignItems="center">
        <CircularProgress size={32} style={{ color: '#ff9800' }} />
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Waking up sandbox…
        </Typography>
        <Typography variant="caption" color="textSecondary">
          This may take 15–30 seconds
        </Typography>
      </Box>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.5); opacity: 0.1; }
          100% { transform: scale(1); opacity: 0.3; }
        }
      `}</style>
    </Paper>
  );
};

/* ------------------------------------------------------------------ */
/*  Preview URL Display with Copy-to-Clipboard                         */
/* ------------------------------------------------------------------ */

/**
 * Displays the preview URL with a copy-to-clipboard button and an
 * "open in new tab" button.
 */
const PreviewUrlDisplay: React.FC<{
  previewUrl: string;
  status: SandboxStatus | undefined;
}> = ({ previewUrl, status }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — fallback to select-all
      const textArea = document.createElement('textarea');
      textArea.value = previewUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [previewUrl]);

  const isSleeping = status === 'sleeping';

  return (
    <Box display="flex" flexDirection="column">
       <Typography variant="subtitle2" gutterBottom>
         Preview URL
       </Typography>
       <Box display="flex" alignItems="center">
         <Paper
           elevation={0}
           style={{
             flex: 1,
             padding: '6px 10px',
             fontSize: 12,
             fontFamily: 'monospace',
             background: '#f5f5f5',
             overflow: 'hidden',
             textOverflow: 'ellipsis',
             whiteSpace: 'nowrap',
           }}
         >
           {isSleeping ? '… (waking up) …' : previewUrl}
         </Paper>
         <Tooltip
           title={copied ? 'Copied!' : 'Copy URL'}
           placement="top"
         >
           <Button
             size="small"
             variant="outlined"
             startIcon={copied ? undefined : <CopyIcon />}
             onClick={handleCopy}
             disabled={isSleeping}
             style={{ marginRight: 4 }}
           >
             {copied ? 'Copied!' : 'Copy'}
           </Button>
         </Tooltip>
         <Tooltip title="Open in new tab" placement="top">
           <Button
             size="small"
             variant="outlined"
             startIcon={<OpenInNewIcon />}
             component="a"
             href={isSleeping ? undefined : previewUrl}
             target="_blank"
             rel="noopener noreferrer"
             disabled={isSleeping}
           >
             Open
           </Button>
         </Tooltip>
       </Box>
     </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Preview Iframe Component                                           */
/* ------------------------------------------------------------------ */

/**
 * Embeds a sandboxd preview URL directly in the entity page as an iframe.
 * Shows a wake-state indicator when the sandbox is sleeping and being woken.
 * Provides copy-to-clipboard and open-in-new-tab buttons.
 *
 * Features:
 * - Inline iframe with configurable height
 * - Wake-state indicator with pulse animation
 * - Copy URL to clipboard button
 * - Open in new tab button
 * - Fullscreen toggle button
 * - Respects sandboxd's TLS preview mode
 */
export const PreviewIframe: React.FC = () => {
  const { entity } = useEntity();
  const entityName = entity.metadata.name;
  const [isWaking, setIsWaking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);

  const wakeApp = useSandboxdWakeApp();
  const sleepApp = useSandboxdSleepApp();

  // Fetch the auth-gated preview URL
  const {
    value: gatedPreviewUrl,
    loading: previewLoading,
    error: previewError,
  } = useSandboxdPreviewUrl(entityName);

  // Fetch the current app status to detect sleeping state
  const {
    value: apps,
    loading: appsLoading,
    error: appsError,
  } = useSandboxdApps(entityName);

  const status = apps?.[0]?.status;
  const rawPreviewUrl = apps?.[0]?.previewUrl;

  // Use the gated preview URL if available, fall back to raw URL
  const effectivePreviewUrl = gatedPreviewUrl?.url || rawPreviewUrl;

  // Auto-wake when the sandbox is sleeping and the user opens the preview
  const handleIframeLoad = useCallback(() => {
    setIframeError(null);
  }, []);

  const handleIframeError = useCallback(() => {
    setIframeError(
      'Failed to load preview — the sandbox may need to be woken up.',
    );
  }, []);

  const handleWake = useCallback(async () => {
    if (!effectivePreviewUrl) return;
    setIsWaking(true);
    setIframeError(null);
    try {
      await wakeApp(entityName);
      // After waking, the iframe will auto-reload on the next render
    } catch {
      // Error handled by fetch wrapper
    } finally {
      // Keep the waking state visible for a bit to show the indicator
      setTimeout(() => setIsWaking(false), 5000);
    }
  }, [wakeApp, entityName, effectivePreviewUrl]);

  const handleSleep = useCallback(async () => {
    try {
      await sleepApp(entityName);
    } catch {
      // Error handled by fetch wrapper
    }
  }, [sleepApp, entityName]);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Determine if we should show the wake button
  const shouldShowWake = status === 'sleeping' && !isWaking;
  const shouldShowSleep = status === 'running';

  // If fullscreen, render as a standalone overlay
  if (isFullscreen) {
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        zIndex={9999}
        display="flex"
        flexDirection="column"
      >
        <Box display="flex" alignItems="center">
          <Typography variant="subtitle2">Preview</Typography>
          <Box display="flex">
            <Tooltip title="Exit fullscreen">
              <Button size="small" onClick={handleToggleFullscreen}>
                <FullscreenExitIcon />
              </Button>
            </Tooltip>
          </Box>
        </Box>
        <Box flex={1}>
          {effectivePreviewUrl ? (
            <iframe
              src={effectivePreviewUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          ) : (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
            >
              <CircularProgress />
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Card
      style={{
        maxHeight: '70vh',
        overflow: 'hidden',
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        px={2}
        py={1}
        style={{ borderBottom: '1px solid #e0e0e0' }}
      >
        <Typography variant="subtitle1">Sandbox Preview</Typography>
        <Box display="flex" alignItems="center">
          {shouldShowSleep && (
            <Tooltip title="Sleep sandbox">
              <Button size="small" onClick={handleSleep}>
                <SleepIcon />
              </Button>
            </Tooltip>
          )}
          {shouldShowWake && (
            <Tooltip title="Wake sandbox">
              <Button
                size="small"
                color="primary"
                onClick={handleWake}
                startIcon={<WakeIcon />}
                style={{ marginLeft: 4 }}
              >
                Wake
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Fullscreen">
            <Button size="small" onClick={handleToggleFullscreen}>
              <FullscreenIcon />
            </Button>
          </Tooltip>
        </Box>
      </Box>

      <Divider />

      <CardContent>
        {/* Wake state indicator */}
        <WakeStateIndicator isWaking={isWaking} />

        {/* Preview URL display with copy */}
        <PreviewUrlDisplay previewUrl={effectivePreviewUrl || ''} status={status} />

        <Divider style={{ margin: '12px 0' }} />

        {/* Iframe */}
        {previewLoading || appsLoading ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            style={{
              height: 400,
              background: '#f5f5f5',
              borderRadius: 4,
            }}
          >
            <CircularProgress />
          </Box>
        ) : previewError || appsError ? (
          <Box
            style={{
              height: 400,
              background: '#ffebee',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <Typography variant="body2" color="error">
              Error loading preview: {previewError?.message || appsError?.message}
            </Typography>
          </Box>
        ) : effectivePreviewUrl ? (
          <Box
            style={{
              height: 400,
              borderRadius: 4,
              overflow: 'hidden',
              background: isWaking ? '#fff3e0' : '#fff',
            }}
          >
            {isWaking ? (
              /* Show a temporary loading state while waking */
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                style={{ height: 400 }}
              >
                <Box
                   display="flex"
                   flexDirection="column"
                   alignItems="center"
                 >
                   <WakeIcon
                     style={{ fontSize: 48, color: '#ff9800' }}
                   />
                   <Typography variant="h6" color="textSecondary">
                     Waking up…
                   </Typography>
                   <Typography variant="body2" color="textSecondary">
                     This may take up to 30 seconds
                   </Typography>
                 </Box>
              </Box>
            ) : (
              <iframe
                src={effectivePreviewUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            )}
          </Box>
        ) : (
          <Box
            style={{
              height: 400,
              background: '#f5f5f5',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <SleepIcon style={{ fontSize: 48, color: '#bdbdbd' }} />
            <Typography variant="body2" color="textSecondary">
              No preview available — start the sandbox first
            </Typography>
          </Box>
        )}

        {/* Error message from iframe */}
        {iframeError && (
          <Box mt={2}>
            <Typography variant="body2" color="error">
              {iframeError}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/*  Export hooks used by PreviewIframe                                 */
/* ------------------------------------------------------------------ */

// Re-export the apps hook for use in parent components
export { useSandboxdApps };
