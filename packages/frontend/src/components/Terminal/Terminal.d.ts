import React from 'react';
import 'xterm/css/xterm.css';
/**
 * xterm-based terminal component connected to sandboxd via WebSocket.
 *
 * Connects to sandboxd's terminal WebSocket endpoint through the backend proxy,
 * fits to container size, and supports terminal resizing.
 */
export declare const Terminal: React.FC;
