'use strict';

const axios = require('axios');
const config = require('../config/env');
const { getSessionCookie, refreshSession } = require('./portal.auth');

async function portalGet(path, params = {}) {
  const cookie = await getSessionCookie();
  let response;

  try {
    response = await makeRequest(path, params, cookie);
  } catch (err) {
    throw portalUnavailableError(err);
  }

  if (response.status === 401 || response.status === 403) {
    let freshCookie;
    try {
      freshCookie = await refreshSession();
    } catch (err) {
      throw err;
    }

    try {
      response = await makeRequest(path, params, freshCookie);
    } catch (err) {
      throw portalUnavailableError(err);
    }
  }

  if (response.status === 404) {
    throw createOperationalError(404, 'PORTAL_NOT_FOUND', `Portal resource not found: ${path}`);
  }

  if (response.status >= 400) {
    throw createOperationalError(502, 'PORTAL_ERROR', `Portal returned status ${response.status} for ${path}`);
  }

  return response.data;
}

// OBSERVED: GET /portal/meters/search?q=&page=
// Returns JSON: { data: [...], total, page, pageSize }
async function fetchMeterList(page = 1, search = null) {
  return portalGet('/portal/meters/search', { q: search || '', page });
}

// OBSERVED: GET /portal/meters/:meterId/geo
// Returns JSON: { data: { latitude: string, longitude: string } }
async function fetchMeterGeo(meterId) {
  return portalGet(`/portal/meters/${meterId}/geo`);
}

// OBSERVED: GET /portal/meters/:meterId/energy
// Returns JSON array of { timestamp, kwh, kvah, voltR } — all strings
async function fetchMeterEnergy(meterId) {
  return portalGet(`/portal/meters/${meterId}/energy`);
}

// OBSERVED: transformer list at /portal/dts?page=1 (seen in DevTools as 'dts?page=1')
async function fetchTransformerList(page = 1) {
  return portalGet('/portal/dts', { page });
}

async function makeRequest(path, params, cookie) {
  return axios.get(`${config.portal.baseUrl}${path}`, {
    params,
    timeout: config.portal.timeoutMs,
    headers: { Cookie: cookie },
    validateStatus: () => true,
    responseType: 'json',
  });
}

function portalUnavailableError(cause) {
  return createOperationalError(502, 'PORTAL_UNAVAILABLE', `Portal unavailable: ${cause.message}`);
}

function createOperationalError(statusCode, code, message) {
  const err = new Error(message);
  err.isOperational = true;
  err.statusCode = statusCode;
  err.code = code;
  err.details = [];
  return err;
}

module.exports = { fetchMeterList, fetchMeterGeo, fetchMeterEnergy, fetchTransformerList };
