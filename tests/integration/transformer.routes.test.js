'use strict';

const request = require('supertest');
const app = require('../../src/app');

jest.mock('../../src/portal/portal.client');
const portalClient = require('../../src/portal/portal.client');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TRANSFORMER_LIST_HTML = `
  <html><body>
    <table>
      <thead><tr><th>Code</th><th>Name</th><th>Feeder</th><th>Capacity</th></tr></thead>
      <tbody>
        <tr><td>DT-001</td><td>Malviya Nagar DT 1</td><td>F-001</td><td>100 kVA</td></tr>
        <tr><td>DT-002</td><td>Malviya Nagar DT 2</td><td>F-001</td><td>200 kVA</td></tr>
      </tbody>
    </table>
    <ul class="pagination">
      <li class="active"><a>1</a></li>
      <li><a>2</a></li>
    </ul>
  </body></html>
`;

const METER_LIST_FOR_DT001_HTML = `
  <html><body>
    <table>
      <thead><tr><th>Meter ID</th><th>Serial No</th><th>Make</th><th>Phase</th><th>Status</th><th>DT</th></tr></thead>
      <tbody>
        <tr><td>J100000</td><td>SE33962</td><td>HPL</td><td>Single</td><td>Active</td><td>DT-001</td></tr>
        <tr><td>J100001</td><td>SE33963</td><td>L&T</td><td>Three</td><td>Active</td><td>DT-001</td></tr>
        <tr><td>J100002</td><td>SE33964</td><td>HPL</td><td>Single</td><td>Active</td><td>DT-002</td></tr>
      </tbody>
    </table>
    <ul class="pagination">
      <li class="active"><a>1</a></li>
    </ul>
  </body></html>
`;

// ---------------------------------------------------------------------------
// GET /api/v1/transformers
// ---------------------------------------------------------------------------

describe('GET /api/v1/transformers', () => {
  beforeEach(() => {
    portalClient.fetchTransformerList.mockResolvedValue(TRANSFORMER_LIST_HTML);
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
    expect(res.body.pagination).toMatchObject({ currentPage: 1, totalPages: 2 });
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

// ---------------------------------------------------------------------------
// GET /api/v1/transformers/:transformerId/meters
// ---------------------------------------------------------------------------

describe('GET /api/v1/transformers/:transformerId/meters', () => {
  beforeEach(() => {
    portalClient.fetchMeterList.mockResolvedValue(METER_LIST_FOR_DT001_HTML);
  });

  it('returns 200 with meters for the transformer', async () => {
    const res = await request(app).get('/api/v1/transformers/DT-001/meters');
    expect(res.status).toBe(200);
    expect(res.body.meta.transformerId).toBe('DT-001');
  });

  it('only returns meters matching the transformer ID', async () => {
    const res = await request(app).get('/api/v1/transformers/DT-001/meters');
    // Fixture has 3 meters: 2 for DT-001, 1 for DT-002
    // Local filter must exclude the DT-002 meter
    expect(res.body.data.every((m) => m.transformerCode === 'DT-001')).toBe(true);
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
