import React from 'react';
import { useSandboxdApps } from '../SandboxdApi';
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
export declare const PreviewIframe: React.FC;
export { useSandboxdApps };
