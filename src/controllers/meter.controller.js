'use strict';

const { z } = require('zod');
const meterService = require('../services/meter.service');

const listQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1, 'page must be >= 1')),
  q: z.string().optional().nullable(),
});

const consumptionQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : null))
    .pipe(z.number().int().min(1).nullable()),
});

async function listMeters(req, res, next) {
  try {
    const query = listQuerySchema.parse(req.query);
    const { meters, pagination } = await meterService.listMeters({
      page: query.page,
      search: query.q || null,
    });

    res.json({ data: meters, pagination });
  } catch (err) {
    next(err);
  }
}

async function getMeterDetail(req, res, next) {
  try {
    const { meterId } = req.params;
    const meter = await meterService.getMeterDetail(meterId);
    res.json({ data: meter });
  } catch (err) {
    next(err);
  }
}

async function getMeterLocation(req, res, next) {
  try {
    const { meterId } = req.params;
    const location = await meterService.getMeterLocation(meterId);
    res.json({ data: location });
  } catch (err) {
    next(err);
  }
}

async function getMeterConsumption(req, res, next) {
  try {
    const { meterId } = req.params;
    const query = consumptionQuerySchema.parse(req.query);
    const readings = await meterService.getMeterConsumption(meterId, query.limit);

    res.json({
      data: readings,
      meta: { meterId, count: readings.length },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMeters, getMeterDetail, getMeterLocation, getMeterConsumption };
