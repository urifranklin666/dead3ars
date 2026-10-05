# dead3ars — production image.
#
# Multi-stage so the final image carries only the standalone server and the
# content it reads at runtime. The database lives on a mounted volume at
# /data (see DZ_DB below), never inside the image.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next.config.ts sets output: "standalone", so this emits .next/standalone.
RUN npm run build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
# The SQLite file lives on a volume, and a health/persistence path the platform
# can mount. DZ_DB overrides it (see src/lib/db.ts).
ENV DZ_DB=/data/dead3ars.db
ENV PORT=3000

# Standalone output: the server, its traced node_modules, and the traced
# content/modules (declared in outputFileTracingIncludes).
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Belt and braces: the module markdown is read from disk at runtime.
COPY --from=build /app/content ./content

# Drop any database the tracer left in the standalone output. DZ_DB points at
# /data, so a traced copy would not shadow the volume — but it is developer data
# and it would be picked up by a run from the standalone directory with DZ_DB
# unset, where the default path is exactly data/dead3ars.db.
RUN rm -rf /app/data

RUN mkdir -p /data && chown -R node:node /data
USER node
EXPOSE 3000

# Compose/Orchestrators poll this. It checks content + database reachability.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
