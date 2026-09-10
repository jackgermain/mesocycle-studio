import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'

/** The commit this bundle was built from, stamped in at build time and shown in the account sheet.
 *
 * An installed iOS PWA caches its index.html hard enough that "is this live yet?" cost most of an evening
 * once -- the deploy was verifiably correct and the phone was verifiably showing something else, with no
 * way for either side to say which build was actually on screen. A visible stamp settles it in one glance
 * instead of a round trip.
 *
 * Falls back to "dev" where git isn't available, which is the dev server and any build off a tarball. */
function buildId(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
    __BUILT_AT__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
})
