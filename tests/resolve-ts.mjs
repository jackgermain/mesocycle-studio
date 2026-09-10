/** Let Node resolve the extensionless relative imports the app source uses.
 *
 * Vite resolves `from "../screens/exerciseHelpers"` by trying extensions; Node's ESM resolver does not,
 * and fails outright. Rather than rewriting every import in src/ to carry a ".ts" -- which would need
 * allowImportingTsExtensions and touch a hundred files to serve the tests -- this hook does what Vite
 * does, only for relative specifiers that have no extension, and only when the .ts or .tsx file is
 * really there. Anything else falls straight through to the default resolver.
 *
 * Registered by `npm test` with --import, alongside --experimental-strip-types, which is what turns the
 * TypeScript into runnable JS. No dependency, which matters: this project has no npm registry access
 * from the environment the code is written in.
 */
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXTS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier) && context.parentURL) {
      const base = new URL(specifier, context.parentURL);
      for (const ext of EXTS) {
        const candidate = new URL(base.href + ext);
        if (existsSync(fileURLToPath(candidate))) {
          return { url: pathToFileURL(fileURLToPath(candidate)).href, shortCircuit: true };
        }
      }
    }
    return nextResolve(specifier, context);
  },
});
