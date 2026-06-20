# musclr backend → Cloud Run (or any container host). Runs the Hono server via tsx; the workspace
# packages (@musclr/core) are consumed as source, so the image includes them.
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /app

# Install only the backend dependency closure (backend + its workspace deps).
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY backend ./backend
RUN pnpm install --frozen-lockfile --filter backend...

# Cloud Run provides $PORT (default 8080); env.ts reads it.
ENV NODE_ENV=production
EXPOSE 8080
CMD ["pnpm", "--filter", "backend", "start"]
