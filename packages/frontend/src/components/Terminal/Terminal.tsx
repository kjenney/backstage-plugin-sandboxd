import React, { useEffect, useRef, useCallback } from 'react';
import { Paper, Typography, Box, CircularProgress, Button } from '@material-ui/core';
import { Refresh as RefreshIcon } from '@material-ui/icons';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { useEntity } from '@backstage/plugin-catalog-react';

import 'xterm/css/xterm.css';

/**
 * xterm-based terminal component connected to sandboxd via WebSocket.
 *
 * Connects to sandboxd's terminal WebSocket endpoint through the backend proxy,
 * fits to container size, and supports terminal resizing.
 */
export const Terminal: React.FC = () => {
  const { entity } = useEntity();
  const entityName = entity.metadata.name;

  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connecting, setConnecting] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const connectTerminal = useCallback(() => {
    if (connecting || connected) return;
    setConnecting(true);
    setError(null);

    // Determine WebSocket URL based on current page protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/sandboxd/v1/entities/${entityName}/terminal/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnecting(false);
      setConnected(true);
    };

    ws.onmessage = (event) => {
      if (termRef.current) {
        termRef.current.write(event.data);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setError('Terminal disconnected. Click Reconnect to try again.');
    };

    ws.onerror = () => {
      setConnecting(false);
      setError('Failed to connect to terminal. Ensure sandboxd is running.');
    };
  }, [connecting, connected, entityName]);

  // Initialize xterm
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"Fira Code", "Cascadia Code", "DejaVu Sans Mono", Consolas, monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;

    // Send terminal input via WebSocket
    term.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // Handle resize
    term.onResize(({ cols, rows }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: 'resize', cols, rows }),
        );
      }
    });

    // Fit on window resize
    const resizeObserver = new ResizeObserver(() => {
      fit.fit();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      wsRef.current?.close();
      resizeObserver.disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  return (
    <Paper style={{ height: '100%', minHeight: 500, display: 'flex', flexDirection: 'column' }}>
      <Box
        p={1}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        style={{ borderBottom: '1px solid #e0e0e0' }}
      >
        <Typography variant="subtitle2" color="textSecondary">
          Terminal
          {connected && (
            <span style={{ color: '#4caf50', marginLeft: 8 }}>● Connected</span>
          )}
          {connecting && (
            <span style={{ color: '#ff9800', marginLeft: 8 }}>● Connecting…</span>
          )}
          {error && (
            <span style={{ color: '#f44336', marginLeft: 8 }}>● Disconnected</span>
          )}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={connectTerminal}
          disabled={connecting || connected}
        >
          Reconnect
        </Button>
      </Box>
      <Box
        flex={1}
        position="relative"
        style={{ backgroundColor: '#1e1e1e' }}
      >
        {connecting && !connected && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <CircularProgress color="secondary" />
          </Box>
        )}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </Box>
    </Paper>
  );
};
