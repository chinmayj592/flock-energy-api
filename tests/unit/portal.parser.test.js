'use strict';

const {
  parseMeterList,
  parseMeterDetail,
  parseTransformerList,
} = require('../../src/portal/portal.parser');

// ---------------------------------------------------------------------------
// Meter List
// ---------------------------------------------------------------------------

describe('parseMeterList', () => {
  const html = `
    <html><body>
      <table>
        <thead><tr><th>Meter ID</th><th>Serial No</th><th>Make</th><th>Phase</th><th>Status</th><th>DT</th></tr></thead>
        <tbody>
          <tr><td>J100000</td><td>SE33962</td><td>HPL</td><td>Single</td><td>Active</td><td>DT-001</td></tr>
          <tr><td>J100001</td><td>SE33963</td><td>L&amp;T</td><td>Three</td><td>Inactive</td><td>DT-002</td></tr>
        </tbody>
      </table>
      <ul class="pagination">
        <li class="active"><a>1</a></li>
        <li><a>2</a></li>
      </ul>
    </body></html>
  `;

  it('parses meter rows correctly', () => {
    const { meters } = parseMeterList(html);
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

  it('parses pagination correctly', () => {
    const { pagination } = parseMeterList(html);
    expect(pagination.currentPage).toBe(1);
    expect(pagination.totalPages).toBe(2);
  });

  it('returns empty meters array for empty table', () => {
    const empty = `<html><body><table><tbody></tbody></table></body></html>`;
    const { meters } = parseMeterList(empty);
    expect(meters).toHaveLength(0);
  });

  it('skips rows with no meter ID', () => {
    const sparse = `
      <html><body><table><tbody>
        <tr><td></td><td>SE00000</td></tr>
        <tr><td>J100002</td><td>SE00001</td></tr>
      </tbody></table></body></html>
    `;
    const { meters } = parseMeterList(sparse);
    expect(meters).toHaveLength(1);
    expect(meters[0].meterId).toBe('J100002');
  });
});

// ---------------------------------------------------------------------------
// Meter Detail
// ---------------------------------------------------------------------------

describe('parseMeterDetail', () => {
  const html = `
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

  it('parses meter detail fields correctly', () => {
    const meter = parseMeterDetail(html);
    expect(meter.meterId).toBe('J100000');
    expect(meter.serialNumber).toBe('SE33962');
    expect(meter.make).toBe('HPL');
    expect(meter.phaseType).toBe('Single Phase');
    expect(meter.installationStatus).toBe('Active');
    expect(meter.installationType).toBe('Residential');
  });

  it('parses location coordinates', () => {
    const meter = parseMeterDetail(html);
    expect(meter.location.latitude).toBe(28.5355);
    expect(meter.location.longitude).toBe(77.391);
  });

  it('parses network hierarchy', () => {
    const meter = parseMeterDetail(html);
    expect(meter.network).toMatchObject({
      zone: 'North',
      circle: 'Circle 1',
      division: 'Division A',
      subdivision: 'Sub A1',
      substation: 'SS-01',
      feeder: 'F-001',
      transformerCode: 'DT-001',
    });
  });

  it('parses consumption readings', () => {
    const meter = parseMeterDetail(html);
    expect(meter.consumption).toHaveLength(2);
    expect(meter.consumption[0]).toMatchObject({
      timestamp: '2024-01-01 00:00',
      kwh: 1.23,
      kvah: 1.45,
      voltageR: 230.5,
    });
  });

  it('returns null for missing fields', () => {
    const minimal = `<html><body><table><tr><th>Meter ID</th><td>J100000</td></tr></table></body></html>`;
    const meter = parseMeterDetail(minimal);
    expect(meter.meterId).toBe('J100000');
    expect(meter.serialNumber).toBeNull();
    expect(meter.network.zone).toBeNull();
    expect(meter.location.latitude).toBeNull();
  });

  it('returns empty consumption array when no consumption table exists', () => {
    const minimal = `<html><body><table><tr><th>Meter ID</th><td>J100000</td></tr></table></body></html>`;
    const meter = parseMeterDetail(minimal);
    expect(meter.consumption).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Transformer List
// ---------------------------------------------------------------------------

describe('parseTransformerList', () => {
  const html = `
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
      </ul>
    </body></html>
  `;

  it('parses transformer rows correctly', () => {
    const { transformers } = parseTransformerList(html);
    expect(transformers).toHaveLength(2);
    expect(transformers[0]).toMatchObject({
      transformerId: 'DT-001',
      name: 'Malviya Nagar DT 1',
      feeder: 'F-001',
      capacityKva: 100,
    });
  });

  it('strips non-numeric characters from capacity', () => {
    const { transformers } = parseTransformerList(html);
    expect(transformers[1].capacityKva).toBe(200);
  });

  it('returns empty array for empty table', () => {
    const empty = `<html><body><table><tbody></tbody></table></body></html>`;
    const { transformers } = parseTransformerList(empty);
    expect(transformers).toHaveLength(0);
  });

  it('parses pagination correctly', () => {
    const { pagination } = parseTransformerList(html);
    expect(pagination.currentPage).toBe(1);
    expect(pagination.totalPages).toBe(1);
  });
});
