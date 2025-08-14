#!/usr/bin/env node
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

import('./dist/index.js').catch((err) => {
  console.error('Falha ao iniciar a app:', err);
  process.exit(1);
});