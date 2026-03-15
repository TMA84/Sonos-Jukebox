FROM node:18-alpine

WORKDIR /app

# Install build tools for native modules (sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
RUN npm install --omit=dev

# Remove build tools to keep image small
RUN apk del python3 make g++

# Copy built application
COPY www ./www
COPY server.js ./

# Create directories for runtime data and config
RUN mkdir -p server/config server/data && \
    chown -R node:node /app

USER node

EXPOSE 8200

CMD ["node", "server.js"]
