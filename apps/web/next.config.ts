import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  /**
   * @particle-network/universal-account-sdk ships the shorthand exports form —
   * `{ "import": ..., "require": ... }` with no "." subpath and no `default`
   * or `browser` condition. Turbopack won't resolve that for the browser, so
   * the implementation never lands in a client chunk: `UniversalAccount`
   * evaluates to undefined and `new UniversalAccount()` throws
   * "(void 0) is not a constructor" the moment a send, leash, or pledge is
   * confirmed.
   *
   * transpilePackages alone does not fix it — verified by grepping the built
   * chunks for SDK internals (`particle.network`, `eip7702AuthSignature`),
   * which stayed absent. Pointing the specifier straight at dist/index.mjs
   * bypasses the broken map entirely.
   *
   * The same map is why tsx returned an empty namespace for this package, and
   * why its CHAIN_ID enum came back undefined once bundled.
   */
  transpilePackages: ["@particle-network/universal-account-sdk"],
  turbopack: {
    resolveAlias: {
      // Relative to this project root, not absolute — Turbopack rejects an
      // absolute path here ("server relative imports are not implemented").
      // node_modules is hoisted to the workspace root.
      "@particle-network/universal-account-sdk":
        "../../node_modules/@particle-network/universal-account-sdk/dist/index.mjs",
    },
  },
};

export default nextConfig;
