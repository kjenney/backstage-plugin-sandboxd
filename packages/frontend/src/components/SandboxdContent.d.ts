import React from 'react';
/**
 * Main content component for the sandboxd plugin.
 *
 * Renders a tabbed interface with:
 * - Apps: list of sandboxd apps with status and preview URLs
 * - Agent Tasks: manage AI coding agent tasks (create, monitor, cancel, undo)
 * - Code Editor: CodeMirror-based file editor with file tree
 * - Terminal: xterm-based terminal connected to sandboxd
 * - Settings: runtime lifecycle and agent configuration
 * - Credentials: agent credential provider management
 * - App Store: browse curated apps and deploy
 * - Deployed: view and manage deployed apps
 * - Manifest: custom runtime manifest editor
 *
 * Requires the entity to have the sandboxd annotation.
 */
export declare const SandboxdContent: () => React.JSX.Element;
