/// <reference types="react" />
/**
 * The sandboxd plugin instance.
 *
 * @public
 */
export declare const sandboxdPlugin: import("@backstage/core-plugin-api").BackstagePlugin<{}, {}, {}>;
/**
 * Route ref for the sandboxd root page.
 *
 * @public
 */
export declare const rootRouteRef: import("@backstage/core-plugin-api").RouteRef<undefined>;
/**
 * Route ref for the sandboxd entity content page.
 *
 * @public
 */
export declare const entityContentRouteRef: import("@backstage/core-plugin-api").RouteRef<undefined>;
/**
 * Route ref for the sandboxd App Store page.
 *
 * @public
 */
export declare const appStoreRouteRef: import("@backstage/core-plugin-api").RouteRef<undefined>;
/**
 * Root component for the sandboxd plugin.
 *
 * @public
 */
export declare const SandboxdRoot: () => import("react").JSX.Element;
/**
 * Content component for entity pages.
 *
 * @public
 */
export declare const SandboxdContent: () => import("react").JSX.Element;
/**
 * App Store root component — standalone route for browsing and deploying apps.
 *
 * @public
 */
export declare const SandboxdAppStore: () => import("react").JSX.Element;
