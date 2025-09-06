FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY www ./www
COPY server.js ./
COPY server ./server

# Create config directory and set permissions
RUN mkdir -p server/config && \
    chown -R node:node /app

USER node

EXPOSE 8200

CMD ["node", "server.js"]