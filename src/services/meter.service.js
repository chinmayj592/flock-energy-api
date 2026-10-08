'use strict';

const { fetchMeterList, fetchMeterGeo, fetchMeterEnergy } = require('../portal/portal.client');
const { parseMeterList, parseMeterGeo, parseMeterEnergy } = require('../portal/portal.parser');
const { createError } = require('../middleware/error.middleware');

async function listMeters({ page = 1, search = null } = {}) {
  const json = await fetchMeterList(page, search);
  const result = parseMeterList(json);

  if (!result || !Array.isArray(result.meters)) {
    throw createError(502, 'PARSE_ERROR', 'Failed to parse meter list from portal');
  }

  return result;
}

async function getMeterDetail(meterId) {
  const listJson = await fetchMeterList(1, meterId);
  const { meters } = parseMeterList(listJson);

  const meter = meters.find((m) => m.meterId === meterId);
  if (!meter) {
    throw createError(404, 'METER_NOT_FOUND', `Meter ${meterId} not found`);
  }

  const [geoJson, energyJson] = await Promise.all([
    fetchMeterGeo(meterId),
    fetchMeterEnergy(meterId),
  ]);

  const location = parseMeterGeo(geoJson);
  const consumption = parseMeterEnergy(energyJson);

  return { ...meter, location, consumption };
}

async function getMeterLocation(meterId) {
  const geoJson = await fetchMeterGeo(meterId);
  return parseMeterGeo(geoJson);
}

(meterId, limit = null) {
  const energyJson = await fetchMeterEnergy(meterId);
  const readings = parseMeterEnergy(energyJson);

  if (limit && limit > 0) {
    return readings.slice(0, limit);
  }

  return readings;
}

module.exports = { listMeters, getMeterDetail, getMeterLocation, getMeterConsumption };
