# Build context is the repo root (see docker-compose.prod.yml) because this
# is an npm workspaces monorepo with a single lockfile at the root.
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache \
    libreoffice \
    poppler-utils \
    fontconfig \
    ttf-dejavu \
    ttf-liberation \
    font-noto

COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci --workspace=server --omit=dev --ignore-scripts

COPY server ./server

WORKDIR /app/server

# Install EB Garamond font for LibreOffice headless rendering
RUN mkdir -p /usr/share/fonts/ebgaramond && \
    cp src/assets/fonts/* /usr/share/fonts/ebgaramond/ && \
    fc-cache -f /usr/share/fonts/ebgaramond

EXPOSE 3001

RUN chmod +x /app/server/docker-entrypoint.sh
ENTRYPOINT ["/app/server/docker-entrypoint.sh"]
