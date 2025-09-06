#!/bin/bash

# Build the Angular app
echo "Building Angular application..."
npm install
ionic build --prod

# Build Docker image
echo "Building Docker image..."
docker build -t sonos-kids-controller .

echo "Build complete! Run with: docker-compose up -d"