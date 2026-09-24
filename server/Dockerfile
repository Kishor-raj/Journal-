# Build context is the repo root (see docker-compose.prod.yml) because this
# is an npm workspaces monorepo with a single lockfile at the root.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci --workspace=server --omit=dev --ignore-scripts

COPY server ./server

WORKDIR /app/server

EXPOSE 3001

RUN chmod +x /app/server/docker-entrypoint.sh
ENTRYPOINT ["/app/server/docker-entrypoint.sh"]
