# Build context is the repository root, not apps/web, because the app imports
# @bzim/types as a workspace package.
#
#   docker build -f apps/web/Dockerfile -t bzim-web .

# ---- build ----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/web/package.json ./apps/web/

RUN npm ci \
    --include-workspace-root \
    --workspace=@bzim/types \
    --workspace=@bzim/web

COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# BUILD arguments, not runtime variables: NEXT_PUBLIC_* is inlined into the
# bundle, so changing a hostname means rebuilding the image, not editing .env.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --workspace=@bzim/types \
    && npm run build --workspace=@bzim/web

# ---- run ------------------------------------------------------------------
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# `output: "standalone"` traces exactly the dependencies the server needs, so
# node_modules never enters this stage. In a workspace the trace keeps the
# monorepo layout, so the server entry sits under apps/web. The other two COPYs
# are not optional: standalone deliberately excludes both, and without them
# every asset 404s.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

USER node

EXPOSE 3000

# 127.0.0.1, not localhost: the Next server binds IPv4-only (HOSTNAME above),
# while BusyBox wget resolves "localhost" to ::1 first and gets connection
# refused. The container then reports unhealthy while serving traffic perfectly.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

CMD ["node", "apps/web/server.js"]
