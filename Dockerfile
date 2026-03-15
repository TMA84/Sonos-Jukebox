# Stage 1: Install server dependencies with build tools
FROM node:18-alpine AS deps

WORKDIR /app

# Install build tools for native modules (sqlite3 on ARM)
# py3-setuptools provides distutils (removed in Python 3.12+, needed by node-gyp)
RUN apk add --no-cache python3 py3-setuptools make g++ linux-headers

# Only install the packages the server actually needs
RUN npm init -y && \
    npm install --build-from-source \
      express@^4.21.1 \
      cors@^2.8.5 \
      sqlite3@^5.1.7 \
      spotify-web-api-node@^5.0.2 \
      uuid@^11.0.3

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
