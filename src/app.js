'use strict';

const express = require('express');
const { errorMiddleware } = require('./middleware/error.middleware');
const meterRoutes = require('./routes/meter.routes');
const transformerRoutes = require('./routes/transformer.routes');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/meters', meterRoutes);
app.use('/api/v1/transformers', transformerRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      details: [],
    },
  });
});

app.use(errorMiddleware);

module.exports = app;
