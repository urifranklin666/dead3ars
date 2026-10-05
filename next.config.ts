import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Typed <Link href> — a stale route becomes a build error rather than a 404. */
  typedRoutes: true,

  /* Emit a self-contained server so the production image carries only what it
   * needs (see Dockerfile). */
  output: "standalone",

  /* Module markdown is read from disk at runtime (see loadModules), so the
   * bundler cannot infer it. Declare it explicitly for the server trace. */
  outputFileTracingIncludes: {
    "/*": ["./content/modules/**/*"],
  },

  /* Never trace the local database into the standalone output. db.ts resolves
   * DZ_DB at runtime (default ./data/dead3ars.db), so a traced copy would ship
   * developer data inside the image — at the exact path the mounted volume is
   * meant to occupy. The server creates it on first boot instead.
   *
   * Two keys, because the route key is the build entry name, not the URL: app
   * routes ("app/...", normalized to "/...") match "/*", but the instrumentation
   * trace is entered as the bare "instrumentation" and never matches "/*".
   *
   * Caveat: this only takes effect on POSIX builds. Next resolves excludes with
   * path.join and then matches with picomatch, but — unlike its include
   * handling — never converts the backslashes that produces on Windows, so the
   * globs cannot match and the exclusion silently does nothing there. Linux is
   * the deploy target, and the Dockerfile strips any traced copy defensively. */
  outputFileTracingExcludes: {
    "/*": ["data/**", "**/*.db", "**/*.db-wal", "**/*.db-shm"],
    instrumentation: ["data/**", "**/*.db", "**/*.db-wal", "**/*.db-shm"],
  },
};

export default nextConfig;

