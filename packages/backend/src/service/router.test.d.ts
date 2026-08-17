/**
 * Integration tests for the sandboxd router.
 *
 * Tests the router structure by verifying:
 * - Health endpoint returns correct status structure
 * - Route priority (SSE proxy before wildcard)
 * - Lifecycle endpoints exist (destroy, sleep, wake)
 * - Agent task endpoints exist (list, create, get, cancel, undo)
 * - App Store endpoints exist (presets, recipes, apps CRUD, snapshots, etc.)
 * - Preview URL endpoint exists
 * - Session validator is mounted at /v1/preview
 * - Proxy handler is mounted at /v1/*
 */
