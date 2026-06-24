# Use Alpine (musl) to match the HA addon runtime environment (Alpine + Node.js 22)
# better-sqlite3 publishes pre-built musl ARM64 binaries — no compilation needed
FROM node:22-alpine AS deps

WORKDIR /app

COPY package-server.json package.json

RUN --mount=type=cache,target=/root/.npm \
    npm install

# Stage 2: Production image
FROM node:22-alpine

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY www ./www
COPY server.js ./

RUN mkdir -p server/config server/data && \
    chown -R node:node /app

USER node

EXPOSE 8200

CMD ["node", "server.js"]
