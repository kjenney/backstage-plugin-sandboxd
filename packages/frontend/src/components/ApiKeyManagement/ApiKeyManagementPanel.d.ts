/**
 * API Key Management Panel — manage sandboxd API keys from the Backstage UI.
 *
 * Provides a table view of existing keys with actions to create, rotate,
 * and revoke keys. Includes a snackbar notification for feedback.
 * Also displays the current user's sandboxd identity (tenant ID, API token).
 */
import React from 'react';
/**
 * API Key Management Panel component.
 *
 * Displays a table of sandboxd API keys with actions to:
 * - Create a new key (with name, description, and optional expiry)
 * - Rotate an existing key (revoke old, create replacement)
 * - Revoke an existing key
 * - Toggle visibility of the full key value (only shown on creation)
 *
 * Also displays the current user's sandboxd identity:
 * - Tenant ID (for multi-tenant mode)
 * - API key status
 * - User entity reference
 */
export declare const ApiKeyManagementPanel: React.FC;
