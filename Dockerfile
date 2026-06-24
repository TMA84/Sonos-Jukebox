# Stage 1: Install server dependencies with build tools
FROM node:18-alpine AS deps

WORKDIR /app

# Install build tools for native modules (sqlite3 on ARM)
# py3-setuptools provides distutils (removed in Python 3.12+, needed by node-gyp)
RUN apk add --no-cache python3 py3-setuptools make g++ linux-headers

# Copy package.json so Docker can cache this layer when dependencies don't change
COPY package-server.json package.json

# npm cache mount avoids re-downloading tarballs on rebuild
RUN --mount=type=cache,target=/root/.npm \
    npm install && \
    npm install --build-from-source sqlite3@^5.1.7

# Stage 2: Production image
FROM node:18-alpine

WORKDIR /app

# Copy node_modules from build stage (includes compiled native modules)
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
