/**
 * Custom scaffolder action for deploying sandboxd apps from presets.
 *
 * This action can be used in Backstage Software Templates to deploy an app
 * to sandboxd and create the corresponding Backstage entity in one step.
 *
 * Usage in template.yaml:
 *
 *   - id: deploy
 *     name: Deploy to sandboxd
 *     action: sandboxd:deploy
 *     input:
 *       name: my-app
 *       presetId: react-vite
 *       manifest:
 *         runtime: node
 *         memoryLimitMb: 512
 *
 * The action returns the app ID and entity reference as output.
 */
import { JsonObject } from '@backstage/types';
export declare const sandboxdDeployAction: import("@backstage/plugin-scaffolder-node").TemplateAction<JsonObject & {
    name: string;
    presetId?: string | undefined;
    manifest?: JsonObject | undefined;
    createEntity?: boolean | undefined;
}, JsonObject & {
    appId: string;
    entityRef: string;
    previewUrl: string;
}>;
