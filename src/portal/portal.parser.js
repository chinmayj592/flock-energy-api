'use strict';

function parseMeterList(json) {
  const raw = json?.data;
  if (!Array.isArray(raw)) return { meters: [], pagination: { total: 0, page: 1, pageSize: 20 } };

  const meters = raw.map((m) => ({
    meterId: m.meterId || null,
    serialNumber: m.serialNo || null,
    make: m.make || null,
    phaseType: m.phaseType || null,
    installationStatus: m.installStatus || null,
    transformerCode: m.dtCode || null,
  }));

  return {
    meters,
    pagination: {
      total: toNumber(json.total) || 0,
      page: toNumber(json.page) || 1,
      pageSize: toNumber(json.pageSize) || 20,
    },
  };
}

function parseMeterGeo(json) {
  const raw = json?.data;
  if (!raw) return { latitude: null, longitude: null };

  return {
    latitude: toNumber(raw.latitude),
    longitude: toNumber(raw.longitude),
  };
}

function parseMeterEnergy(json) {
  const raw = json?.data;
  if (!Array.isArray(raw)) return [];

  return raw.map((r) => ({
    timestamp: r.timestamp || null,
    kwh: toNumber(r.kwh),
    kvah: toNumber(r.kvah),
    voltageR: toNumber(r.voltR),
  }));
}

function parseTransformerList(json) {
  const raw = json?.data;
  if (!Array.isArray(raw)) return { transformers: [], pagination: { total: 0, page: 1, pageSize: 20 } };

  const transformers = raw.map((t) => ({
    transformerId: t.transformerId || t.dtCode || null,
    name: t.name || null,
    feeder: t.feeder || null,
    capacityKva: toNumber(t.capacityKva || t.capacity),
  }));

  return {
    transformers,
    pagination: {
      total: toNumber(json.total) || 0,
      page: toNumber(json.page) || 1,
      pageSize: toNumber(json.pageSize) || 20,
    },
  };
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

module.exports = { parseMeterList, parseMeterGeo, parseMeterEnergy, parseTransformerList };
