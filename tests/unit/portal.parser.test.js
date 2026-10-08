'use strict';

const {
  parseMeterList,
  parseMeterGeo,
  parseMeterEnergy,
  parseTransformerList,
} = require('../../src/portal/portal.parser');

// ---------------------------------------------------------------------------
// parseMeterList
// ---------------------------------------------------------------------------

describe('parseMeterList', () => {
  const json = {
    data: [
      { meterId: 'J100000', serialNo: 'SE33962', make: 'HPL', phaseType: 'Single', installStatus: 'Active', dtCode: 'DT-001' },
      { meterId: 'J100001', serialNo: 'SE33963', make: 'L&T', phaseType: 'Three', installStatus: 'Inactive', dtCode: 'DT-002' },
    ],
    total: 40,
    page: 1,
    pageSize: 20,
  };

  it('maps portal field names to clean API field names', () => {
    const { meters } = parseMeterList(json);
    expect(meters).toHaveLength(2);
    expect(meters[0]).toMatchObject({
      meterId: 'J100000',
      serialNumber: 'SE33962',
      make: 'HPL',
      phaseType: 'Single',
      installationStatus: 'Active',
      transformerCode: 'DT-001',
    });
  });

  it('calculates totalPages from total and pageSize', () => {
    const { pagination } = parseMeterList(json);
    expect(pagination.page).toBe(1);
    expect(pagination.total).toBe(40);
    expect(pagination.pageSize).toBe(20);
  });

  it('returns empty meters array when data is missing', () => {
    const { meters } = parseMeterList({});
    expect(meters).toHaveLength(0);
  });

  it('returns empty meters array when data is empty', () => {
    const { meters } = parseMeterList({ data: [], total: 0, page: 1, pageSize: 20 });
    expect(meters).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// parseMeterGeo
// ---------------------------------------------------------------------------

describe('parseMeterGeo', () => {
  it('converts string coordinates to numbers', () => {
    const json = { data: { latitude: '26.938961002479868', longitude: '75.83095696146852' } };
    const geo = parseMeterGeo(json);
    expect(geo.latitude).toBe(26.938961002479868);
    expect(geo.longitude).toBe(75.83095696146852);
    expect(typeof geo.latitude).toBe('number');
    expect(typeof geo.longitude).toBe('number');
  });

  it('returns null coordinates when data is missing', () => {
    const geo = parseMeterGeo({});
    expect(geo.latitude).toBeNull();
    expect(geo.longitude).toBeNull();
  });

  it('returns null for unparseable coordinate values', () => {
    const json = { data: { latitude: 'unknown', longitude: '' } };
    const geo = parseMeterGeo(json);
    expect(geo.latitude).toBeNull();
    expect(geo.longitude).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseMeterEnergy
// ---------------------------------------------------------------------------

describe('parseMeterEnergy', () => {
  const json = {
    data: [
      { timestamp: '23/06/2026 23:30', kwh: '48438.74', kvah: '52313.84', voltR: '226' },
      { timestamp: '23/06/2026 23:00', kwh: '48430.10', kvah: '52300.00', voltR: '225' },
    ],
  };

  it('converts string energy values to numbers', () => {
    const readings = parseMeterEnergy(json);
    expect(readings).toHaveLength(2);
    expect(readings[0]).toMatchObject({
      timestamp: '23/06/2026 23:30',
      kwh: 48438.74,
      kvah: 52313.84,
      voltageR: 226,
    });
    expect(typeof readings[0].kwh).toBe('number');
    expect(typeof readings[0].voltageR).toBe('number');
  });

  it('maps voltR to voltageR', () => {
    const readings = parseMeterEnergy(json);
    expect(readings[0].voltageR).toBeDefined();
    expect(readings[0].voltR).toBeUndefined();
  });

  it('returns empty array when data is missing', () => {
    expect(parseMeterEnergy({})).toHaveLength(0);
  });

  it('returns null for unparseable numeric fields', () => {
    const bad = { data: [{ timestamp: '23/06/2026 00:00', kwh: '', kvah: null, voltR: 'N/A' }] };
    const readings = parseMeterEnergy(bad);
    expect(readings[0].kwh).toBeNull();
    expect(readings[0].kvah).toBeNull();
    expect(readings[0].voltageR).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseTransformerList
// ---------------------------------------------------------------------------

describe('parseTransformerList', () => {
  const json = {
    data: [
      { transformerId: 'DT-001', name: 'Malviya Nagar DT 1', feeder: 'F-001', capacityKva: '100' },
      { transformerId: 'DT-002', name: 'Malviya Nagar DT 2', feeder: 'F-001', capacityKva: '200' },
    ],
    total: 2,
    page: 1,
    pageSize: 20,
  };

  it('parses transformer rows correctly', () => {
    const { transformers } = parseTransformerList(json);
    expect(transformers).toHaveLength(2);
    expect(transformers[0]).toMatchObject({
      transformerId: 'DT-001',
      name: 'Malviya Nagar DT 1',
      feeder: 'F-001',
      capacityKva: 100,
    });
  });

  it('converts string capacity to number', () => {
    const { transformers } = parseTransformerList(json);
    expect(typeof transformers[0].capacityKva).toBe('number');
  });

  it('returns empty array when data is missing', () => {
    const { transformers } = parseTransformerList({});
    expect(transformers).toHaveLength(0);
  });

  it('calculates totalPages correctly', () => {
    const { pagination } = parseTransformerList(json);
    expect(pagination.page).toBe(1);
    expect(pagination.total).toBe(2);
    expect(pagination.pageSize).toBe(20);
  });
});
