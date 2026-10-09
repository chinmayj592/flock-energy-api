'use strict';

const request = require('supertest');
const app = require('../../src/app');

jest.mock('../../src/portal/portal.client');
const portalClient = require('../../src/portal/portal.client');

const TRANSFORMER_LIST_JSON = {
  data: [
    { transformerId: 'DT-001', name: 'Malviya Nagar DT 1', feeder: 'F-001', capacityKva: '100' },
    { transformerId: 'DT-002', name: 'Malviya Nagar DT 2', feeder: 'F-001', capacityKva: '200' },
  ],
  total: 40,
  page: 1,
  pageSize: 20,
};

const METER_LIST_FOR_DT001_JSON = {
  data: [
    { meterId: 'J100000', serialNo: 'SE33962', make: 'HPL', phaseType: 'Single', installStatus: 'Active', dtCode: 'DT-001' },
    { meterId: 'J100001', serialNo: 'SE33963', make: 'L&T', phaseType: 'Three', installStatus: 'Active', dtCode: 'DT-001' },
    { meterId: 'J100002', serialNo: 'SE33964', make: 'HPL', phaseType: 'Single', installStatus: 'Active', dtCode: 'DT-002' },
  ],
  total: 3,
  page: 1,
  pageSize: 20,
};

describe('GET /api/v1/transformers', () => {
  beforeEach(() => {
    portalClient.fetchTransformerList.mockResolvedValue(TRANSFORMER_LIST_JSON);
  });

  it('returns 200 with transformer list and pagination', async () => {
    const res = await request(app).get('/api/v1/transformers');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({
      transformerId: 'DT-001',
      name: 'Malviya Nagar DT 1',
      feeder: 'F-001',
      capacityKva: 100,
    });
    expect(res.body.pagination).toMatchObject({ total: 40, page: 1, pageSize: 20 });
  });

  it('parses string capacity to number', async () => {
    const res = await request(app).get('/api/v1/transformers');
    expect(typeof res.body.data[0].capacityKva).toBe('number');
  });

  it('passes page param to portal client', async () => {
    await request(app).get('/api/v1/transformers?page=2');
    expect(portalClient.fetchTransformerList).toHaveBeenCalledWith(2);
  });

  it('returns 400 for invalid page param', async () => {
    const res = await request(app).get('/api/v1/transformers?page=0');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 502 when portal is unavailable', async () => {
    const err = new Error('connect ECONNREFUSED');
    err.isOperational = true;
    err.statusCode = 502;
    err.code = 'PORTAL_UNAVAILABLE';
    err.details = [];
    portalClient.fetchTransformerList.mockRejectedValue(err);

    const res = await request(app).get('/api/v1/transformers');
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('PORTAL_UNAVAILABLE');
  });
});

describe('GET /api/v1/transformers/:transformerId/meters', () => {
  beforeEach(() => {
    portalClient.fetchMeterList.mockResolvedValue(METER_LIST_FOR_DT001_JSON);
  });

  it('returns 200 with meters for the transformer', async () => {
    const res = await request(app).get('/api/v1/transformers/DT-001/meters');
    expect(res.status).toBe(200);
    expect(res.body.meta.transformerId).toBe('DT-001');
  });

  it('only returns meters matching the transformer ID', async () => {
    const res = await request(app).get('/api/v1/transformers/DT-001/meters');
    expect(res.body.data.every((m) => m.transformerCode === 'DT-001')).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it('returns empty array when no meters match transformer', async () => {
    const res = await request(app).get('/api/v1/transformers/DT-999/meters');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.meta.count).toBe(0);
  });

  it('returns 502 when portal is unavailable', async () => {
    const err = new Error('timeout');
    err.isOperational = true;
    err.statusCode = 502;
    err.code = 'PORTAL_UNAVAILABLE';
    err.details = [];
    portalClient.fetchMeterList.mockRejectedValue(err);

    const res = await request(app).get('/api/v1/transformers/DT-001/meters');
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('PORTAL_UNAVAILABLE');
  });
});
