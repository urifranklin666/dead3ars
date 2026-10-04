import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Typed <Link href> — a stale route becomes a build error rather than a 404. */
  typedRoutes: true,

  /* Module markdown is read from disk at runtime (see loadModules), so the
   * bundler cannot infer it. Declare it explicitly for the server trace. */
  outputFileTracingIncludes: {
    "/*": ["./content/modules/**/*"],
  },
};

export default nextConfig;
