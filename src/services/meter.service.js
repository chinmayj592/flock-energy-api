'use strict';

const { fetchMeterList, fetchMeterDetail } = require('../portal/portal.client');
const { parseMeterList, parseMeterDetail } = require('../portal/portal.parser');
const { createError } = require('../middleware/error.middleware');

async function listMeters({ page = 1, search = null } = {}) {
  const html = await fetchMeterList(page, search);
  const result = parseMeterList(html);

  if (!result || !Array.isArray(result.meters)) {
    throw createError(502, 'PARSE_ERROR', 'Failed to parse meter list from portal');
  }

  return result;
}

async function getMeterDetail(meterId) {
  const html = await fetchMeterDetail(meterId);
  const meter = parseMeterDetail(html);

  if (!meter || !meter.meterId) {
    throw createError(404, 'METER_NOT_FOUND', `Meter ${meterId} not found`);
  }

  return meter;
}

async function getMeterConsumption(meterId, limit = null) {
  const meter = await getMeterDetail(meterId);
  const readings = meter.consumption || [];

  if (limit && limit > 0) {
    return readings.slice(0, limit);
  }

  return readings;
}

module.exports = { listMeters, getMeterDetail, getMeterConsumption };
