'use strict';

const request = require('supertest');
const app = require('../../src/app');

jest.mock('../../src/portal/portal.client');
const portalClient = require('../../src/portal/portal.client');

const METER_LIST_JSON = {
  data: [
    { meterId: 'J100000', serialNo: 'SE33962', make: 'HPL', phaseType: 'Single', installStatus: 'Active', dtCode: 'DT-001' },
    { meterId: 'J100001', serialNo: 'SE33963', make: 'L&T', phaseType: 'Three', installStatus: 'Inactive', dtCode: 'DT-002' },
  ],
  total: 40,
  page: 1,
  pageSize: 20,
};

const METER_SEARCH_J100000_JSON = {
  data: [
    { meterId: 'J100000', serialNo: 'SE33962', make: 'HPL', phaseType: 'Single', installStatus: 'Active', dtCode: 'DT-001' },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

const GEO_JSON = {
  data: { latitude: '26.938961002479868', longitude: '75.83095696146852' },
};

const ENERGY_JSON = {
  data: [
    { timestamp: '23/06/2026 23:30', kwh: '48438.74', kvah: '52313.84', voltR: '226' },
    { timestamp: '23/06/2026 23:00', kwh: '48430.10', kvah: '52300.00', voltR: '225' },
  ],
};

describe('GET /api/v1/meters', () => {
  beforeEach(() => {
    portalClient.fetchMeterList.mockResolvedValue(METER_LIST_JSON);
  });

  it('returns 200 with meter list and pagination', async () => {
    const res = await request(app).get('/api/v1/meters');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].meterId).toBe('J100000');
    expect(res.body.pagination).toMatchObject({ total: 40, page: 1, pageSize: 20 });
  });

  it('maps portal field names to clean API field names', async () => {
    const res = await request(app).get('/api/v1/meters');
    expect(res.body.data[0].serialNumber).toBe('SE33962');
    expect(res.body.data[0].installationStatus).toBe('Active');
    expect(res.body.data[0].transformerCode).toBe('DT-001');
  });

  it('passes page param to portal client', async () => {
    await request(app).get('/api/v1/meters?page=2');
    expect(portalClient.fetchMeterList).toHaveBeenCalledWith(2, null);
  });

  it('passes q param to portal client', async () => {
    await request(app).get('/api/v1/meters?q=J100000');
    expect(portalClient.fetchMeterList).toHaveBeenCalledWith(1, 'J100000');
  });

  it('returns 400 for invalid page param', async () => {
    const res = await request(app).get('/api/v1/meters?page=abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 502 when portal is unavailable', async () => {
    const err = new Error('connect ECONNREFUSED');
    err.isOperational = true;
    err.statusCode = 502;
    err.code = 'PORTAL_UNAVAILABLE';
    err.details = [];
    portalClient.fetchMeterList.mockRejectedValue(err);

    const res = await request(app).get('/api/v1/meters');
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('PORTAL_UNAVAILABLE');
  });
});

describe('GET /api/v1/meters/:meterId', () => {
  beforeEach(() => {
    portalClient.fetchMeterList.mockResolvedValue(METER_SEARCH_J100000_JSON);
    portalClient.fetchMeterGeo.mockResolvedValue(GEO_JSON);
    portalClient.fetchMeterEnergy.mockResolvedValue(ENERGY_JSON);
  });

  it('returns 200 with meter detail including location and consumption', async () => {
    const res = await request(app).get('/api/v1/meters/J100000');
    expect(res.status).toBe(200);
    expect(res.body.data.meterId).toBe('J100000');
    expect(res.body.data.serialNumber).toBe('SE33962');
    expect(res.body.data.location.latitude).toBe(26.938961002479868);
    expect(res.body.data.consumption).toHaveLength(2);
  });

  it('parses string coordinates to numbers', async () => {
    const res = await request(app).get('/api/v1/meters/J100000');
    expect(typeof res.body.data.location.latitude).toBe('number');
    expect(typeof res.body.data.location.longitude).toBe('number');
  });

  it('returns 404 when meter not found in search results', async () => {
    portalClient.fetchMeterList.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 });
    const res = await request(app).get('/api/v1/meters/INVALID');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('METER_NOT_FOUND');
  });
});

describe('GET /api/v1/meters/:meterId/location', () => {
  beforeEach(() => {
    portalClient.fetchMeterGeo.mockResolvedValue(GEO_JSON);
  });

  it('returns 200 with coordinates parsed to numbers', async () => {
    const res = await request(app).get('/api/v1/meters/J100000/location');
    expect(res.status).toBe(200);
    expect(res.body.data.latitude).toBe(26.938961002479868);
    expect(res.body.data.longitude).toBe(75.83095696146852);
    expect(typeof res.body.data.latitude).toBe('number');
  });

  it('returns 502 when portal is unavailable', async () => {
    const err = new Error('timeout');
    err.isOperational = true;
    err.statusCode = 502;
    err.code = 'PORTAL_UNAVAILABLE';
    err.details = [];
    portalClient.fetchMeterGeo.mockRejectedValue(err);

    const res = await request(app).get('/api/v1/meters/J100000/location');
    expect(res.status).toBe(502);
  });
});

describe('GET /api/v1/meters/:meterId/consumption', () => {
  beforeEach(() => {
    portalClient.fetchMeterEnergy.mockResolvedValue(ENERGY_JSON);
  });

  it('returns 200 with consumption readings parsed to numbers', async () => {
    const res = await request(app).get('/api/v1/meters/J100000/consumption');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.meterId).toBe('J100000');
    expect(res.body.meta.count).toBe(2);
    expect(typeof res.body.data[0].kwh).toBe('number');
    expect(typeof res.body.data[0].voltageR).toBe('number');
  });

  it('respects limit param', async () => {
    const res = await request(app).get('/api/v1/meters/J100000/consumption?limit=1');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 400 for invalid limit param', async () => {
    const res = await request(app).get('/api/v1/meters/J100000/consumption?limit=abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
