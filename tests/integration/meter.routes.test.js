'use strict';

const request = require('supertest');
const app = require('../../src/app');

// Mock the portal client so tests never hit the real portal
jest.mock('../../src/portal/portal.client');
const portalClient = require('../../src/portal/portal.client');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const METER_LIST_HTML = `
  <html><body>
    <table>
      <thead><tr><th>Meter ID</th><th>Serial No</th><th>Make</th><th>Phase</th><th>Status</th><th>DT</th></tr></thead>
      <tbody>
        <tr><td>J100000</td><td>SE33962</td><td>HPL</td><td>Single</td><td>Active</td><td>DT-001</td></tr>
        <tr><td>J100001</td><td>SE33963</td><td>L&T</td><td>Three</td><td>Inactive</td><td>DT-002</td></tr>
      </tbody>
    </table>
    <ul class="pagination">
      <li class="active"><a>1</a></li>
      <li><a>2</a></li>
    </ul>
  </body></html>
`;

const METER_DETAIL_HTML = `
  <html><body>
    <table>
      <tr><th>Meter ID</th><td>J100000</td></tr>
      <tr><th>Serial No</th><td>SE33962</td></tr>
      <tr><th>Make</th><td>HPL</td></tr>
      <tr><th>Phase Type</th><td>Single Phase</td></tr>
      <tr><th>Installation Status</th><td>Active</td></tr>
      <tr><th>Installation Type</th><td>Residential</td></tr>
      <tr><th>Latitude</th><td>28.5355</td></tr>
      <tr><th>Longitude</th><td>77.3910</td></tr>
      <tr><th>Zone</th><td>North</td></tr>
      <tr><th>Circle</th><td>Circle 1</td></tr>
      <tr><th>Division</th><td>Division A</td></tr>
      <tr><th>Subdivision</th><td>Sub A1</td></tr>
      <tr><th>Substation</th><td>SS-01</td></tr>
      <tr><th>Feeder</th><td>F-001</td></tr>
      <tr><th>Distribution Transformer</th><td>DT-001</td></tr>
    </table>
    <table>
      <thead><tr><th>Timestamp</th><th>kWh</th><th>kVAh</th><th>V(R)</th></tr></thead>
      <tbody>
        <tr><td>2024-01-01 00:00</td><td>1.23</td><td>1.45</td><td>230.5</td></tr>
        <tr><td>2024-01-01 00:30</td><td>1.30</td><td>1.50</td><td>231.0</td></tr>
      </tbody>
    </table>
  </body></html>
`;

// ---------------------------------------------------------------------------
// GET /api/v1/meters
// ---------------------------------------------------------------------------

describe('GET /api/v1/meters', () => {
  beforeEach(() => {
    portalClient.fetchMeterList.mockResolvedValue(METER_LIST_HTML);
  });

  it('returns 200 with meter list and pagination', async () => {
    const res = await request(app).get('/api/v1/meters');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].meterId).toBe('J100000');
    expect(res.body.pagination).toMatchObject({ currentPage: 1, totalPages: 2 });
  });

  it('passes page query param to portal client', async () => {
    await request(app).get('/api/v1/meters?page=2');
    expect(portalClient.fetchMeterList).toHaveBeenCalledWith(2, null);
  });

  it('passes search query param to portal client', async () => {
    await request(app).get('/api/v1/meters?search=J100000');
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

// ---------------------------------------------------------------------------
// GET /api/v1/meters/:meterId
// ---------------------------------------------------------------------------

describe('GET /api/v1/meters/:meterId', () => {
  beforeEach(() => {
    portalClient.fetchMeterDetail.mockResolvedValue(METER_DETAIL_HTML);
  });

  it('returns 200 with full meter detail', async () => {
    const res = await request(app).get('/api/v1/meters/J100000');
    expect(res.status).toBe(200);
    expect(res.body.data.meterId).toBe('J100000');
    expect(res.body.data.serialNumber).toBe('SE33962');
    expect(res.body.data.network.zone).toBe('North');
    expect(res.body.data.location.latitude).toBe(28.5355);
  });

  it('returns consumption readings in detail response', async () => {
    const res = await request(app).get('/api/v1/meters/J100000');
    expect(res.body.data.consumption).toHaveLength(2);
  });

  it('returns 404 when portal returns empty meter page', async () => {
    portalClient.fetchMeterDetail.mockResolvedValue(
      '<html><body><table></table></body></html>'
    );
    const res = await request(app).get('/api/v1/meters/INVALID');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('METER_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/meters/:meterId/consumption
// ---------------------------------------------------------------------------

describe('GET /api/v1/meters/:meterId/consumption', () => {
  beforeEach(() => {
    portalClient.fetchMeterDetail.mockResolvedValue(METER_DETAIL_HTML);
  });

  it('returns 200 with consumption readings', async () => {
    const res = await request(app).get('/api/v1/meters/J100000/consumption');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.meterId).toBe('J100000');
    expect(res.body.meta.count).toBe(2);
  });

  it('respects limit query param', async () => {
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
