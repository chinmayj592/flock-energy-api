'use strict';

const cheerio = require('cheerio');

function parseMeterList(html) {
  const $ = cheerio.load(html);
  const meters = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length === 0) return;

    const meterId = text($, cells.eq(0));
    if (!meterId) return;

    meters.push({
      meterId,
      serialNumber: text($, cells.eq(1)),
      make: text($, cells.eq(2)),
      phaseType: text($, cells.eq(3)),
      installationStatus: text($, cells.eq(4)),
      transformerCode: text($, cells.eq(5)),
    });
  });

  return { meters, pagination: parsePagination($) };
}

function parseMeterDetail(html) {
  const $ = cheerio.load(html);
  const fields = extractKeyValuePairs($);

  return {
    meterId: fields['Meter ID'] || fields['Meter No'] || null,
    serialNumber: fields['Serial No'] || fields['Serial Number'] || null,
    make: fields['Make'] || null,
    phaseType: fields['Phase Type'] || fields['Phase'] || null,
    installationStatus: fields['Installation Status'] || null,
    installationType: fields['Installation Type'] || null,
    location: {
      latitude: parseCoordinate(fields['Latitude'] || fields['Location']),
      longitude: parseCoordinate(fields['Longitude']),
    },
    network: {
      zone: fields['Zone'] || null,
      circle: fields['Circle'] || null,
      division: fields['Division'] || null,
      subdivision: fields['Subdivision'] || null,
      substation: fields['Substation'] || null,
      feeder: fields['Feeder'] || null,
      transformerCode: fields['Distribution Transformer'] || fields['DT'] || null,
      transformerName: fields['Transformer Name'] || null,
    },
    consumption: parseConsumptionTable($),
  };
}

function parseConsumptionTable($) {
  const readings = [];

  $('table').each((_, table) => {
    const headers = $(table)
      .find('thead th, thead td')
      .map((_, th) => $(th).text().trim().toLowerCase())
      .get();

    const isConsumptionTable = headers.some(
      (h) => h.includes('kwh') || h.includes('timestamp')
    );

    if (!isConsumptionTable) return;

    $(table)
      .find('tbody tr')
      .each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 3) return;

        const timestamp = text($, cells.eq(0));
        if (!timestamp) return;

        readings.push({
          timestamp,
          kwh: parseNumber(text($, cells.eq(1))),
          kvah: parseNumber(text($, cells.eq(2))),
          voltageR: parseNumber(text($, cells.eq(3))),
        });
      });

    return false;
  });

  return readings;
}

function parseTransformerList(html) {
  const $ = cheerio.load(html);
  const transformers = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length === 0) return;

    const transformerId = text($, cells.eq(0));
    if (!transformerId) return;

    transformers.push({
      transformerId,
      name: text($, cells.eq(1)),
      feeder: text($, cells.eq(2)),
      capacityKva: parseNumber(text($, cells.eq(3))),
    });
  });

  return { transformers, pagination: parsePagination($) };
}

function parsePagination($) {
  const activePage = $('.pagination .active, [aria-current="page"]').first();
  const currentPage = parseNumber(activePage.text()) || 1;

  const allPageLinks = $('.pagination a, .pagination button')
    .map((_, el) => parseNumber($(el).text()))
    .get()
    .filter((n) => n !== null && !isNaN(n));

  const totalPages =
    allPageLinks.length > 0 ? Math.max(...allPageLinks) : currentPage;

  return { currentPage, totalPages };
}

function extractKeyValuePairs($) {
  const fields = {};

  $('tr').each((_, row) => {
    const label = $(row).find('th').first().text().trim();
    const value = $(row).find('td').first().text().trim();
    if (label && value) fields[label] = value;
  });

  $('dt').each((_, dt) => {
    const label = $(dt).text().trim();
    const value = $(dt).next('dd').text().trim();
    if (label && value) fields[label] = value;
  });

  return fields;
}

function text($, el) {
  const t = $(el).text().trim();
  return t || null;
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseCoordinate(value) {
  if (!value) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

module.exports = {
  parseMeterList,
  parseMeterDetail,
  parseConsumptionTable,
  parseTransformerList,
};
