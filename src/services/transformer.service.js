'use strict';

const { fetchTransformerList, fetchMeterList } = require('../portal/portal.client');
const { parseTransformerList, parseMeterList } = require('../portal/portal.parser');
const { createError } = require('../middleware/error.middleware');

async function listTransformers({ page = 1 } = {}) {
  const html = await fetchTransformerList(page);
  const result = parseTransformerList(html);

  if (!result || !Array.isArray(result.transformers)) {
    throw createError(502, 'PARSE_ERROR', 'Failed to parse transformer list from portal');
  }

  return result;
}

async function getMetersByTransformer(transformerId) {
  const html = await fetchMeterList(1, transformerId);
  const result = parseMeterList(html);

  if (!result || !Array.isArray(result.meters)) {
    throw createError(502, 'PARSE_ERROR', 'Failed to parse meter list from portal');
  }

  const matched = result.meters.filter(
    (m) => m.transformerCode && m.transformerCode === transformerId
  );

  return matched;
}

module.exports = { listTransformers, getMetersByTransformer };
