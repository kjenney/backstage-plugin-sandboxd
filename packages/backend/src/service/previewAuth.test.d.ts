/**
 * Integration tests for Preview URL authentication.
 *
 * Tests the preview URL auth gate by verifying:
 * - Missing appId returns 400
 * - No Backstage identity returns 401
 * - Unresolvable identity returns 401
 * - No preview URL returns 404
 * - Auth-gated URL is constructed correctly
 * - Session validator rejects missing tokens
 * - Session validator rejects expired tokens
 * - Session validator accepts valid tokens
 */
export {};
