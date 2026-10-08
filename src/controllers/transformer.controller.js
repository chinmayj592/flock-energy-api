'use strict';

const { z } = require('zod');
const transformerService = require('../services/transformer.service');

const listQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1, 'page must be >= 1')),
});

async function listTransformers(req, res, next) {
  try {
    const query = listQuerySchema.parse(req.query);
    const { transformers, pagination } = await transformerService.listTransformers({
      page: query.page,
    });

    res.json({ data: transformers, pagination });
  } catch (err) {
    next(err);
  }
}

async function getMetersByTransformer(req, res, next) {
  try {
    const { transformerId } = req.params;
    const meters = await transformerService.getMetersByTransformer(transformerId);

    res.json({
      data: meters,
      meta: { transformerId, count: meters.length },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listTransformers, getMetersByTransformer };
