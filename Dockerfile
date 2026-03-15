# Stage 1: Install dependencies with build tools
FROM node:18-alpine AS deps

WORKDIR /app

# Install build tools for native modules (sqlite3 on ARM)
RUN apk add --no-cache python3 make g++ linux-headers

COPY package*.json ./
RUN npm install --omit=dev --build-from-source

# Stage 2: Production image
FROM node:18-alpine

WORKDIR /app

# Copy node_modules from build stage (includes compiled native modules)
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Copy built application
COPY www ./www
COPY server.js ./

# Create directories for runtime data and config
RUN mkdir -p server/config server/data && \
    chown -R node:node /app

USER node

EXPOSE 8200

CMD ["node", "server.js"]
