/** What build is actually on screen.
 *
 * Stamped by vite.config.ts at build time. Shown in the account sheet so "is this live yet?" is a glance
 * rather than a conversation -- an installed iOS PWA holds its index.html long past a deploy, and without
 * a stamp there is no way to tell a stale app from a broken feature.
 */
declare const __BUILD_ID__: string;
declare const __BUILT_AT__: string;

export const BUILD_ID: string = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "dev";
export const BUILT_AT: string = typeof __BUILT_AT__ === "string" ? __BUILT_AT__ : "";
