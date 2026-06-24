# Stage 1: Install server dependencies
# node:18-slim (Debian/glibc) has pre-built sqlite3 ARM64 binaries — no compilation needed
FROM node:18-slim AS deps

WORKDIR /app

COPY package-server.json package.json

# npm cache mount avoids re-downloading tarballs on rebuild
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Stage 2: Production image
FROM node:18-slim

WORKDIR /app

# Copy node_modules from build stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY www ./www
COPY server.js ./

# Create directories for runtime data and config
RUN mkdir -p server/config server/data && \
    chown -R node:node /app

USER node

EXPOSE 8200

CMD ["node", "server.js"]
