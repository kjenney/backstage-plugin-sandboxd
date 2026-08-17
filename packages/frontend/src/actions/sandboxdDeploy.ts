/**
 * Re-export of the sandboxd Deploy scaffolder action.
 *
 * The actual implementation lives in the backend package because
 * createTemplateAction requires server-side execution.
 */

export { sandboxdDeployAction } from '@internal/backstage-plugin-sandboxd-backend';
