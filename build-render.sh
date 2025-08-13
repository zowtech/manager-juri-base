#!/bin/bash
set -e

echo "🚀 Iniciando build para Render..."

# Build frontend com npx
echo "📦 Building frontend..."
npx vite build

# Build backend com npx 
echo "🔧 Building backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "✅ Build completo!"