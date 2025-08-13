#!/bin/bash
set -e
echo "Installing dependencies including dev dependencies..."
npm install
echo "Building frontend..."
npx vite build
echo "Building backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
echo "Build completed successfully!"