FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --omit=dev

# Copy built application
COPY www ./www
COPY server.js ./
COPY server ./server

# Ensure default config files exist
COPY server/config/pin-default.json ./server/config/
COPY server/config/config-example.json ./server/config/

# Create config directory and set permissions
RUN mkdir -p server/config && \
    chown -R node:node /app

USER node

EXPOSE 8200

CMD ["node", "server.js"]