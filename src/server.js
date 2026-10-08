'use strict';

const config = require('./config/env');
const app = require('./app');

const server = app.listen(config.port, () => {
  console.log(`[server] Running on port ${config.port}`);
});

process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[server] SIGINT received, shutting down');
  server.close(() => process.exit(0));
});
