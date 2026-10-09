'use strict';

const axios = require('axios');
const config = require('../config/env');

const SESSION_COOKIE_NAME = '__Secure-better-auth.session_token';
const LOGIN_PATH = '/login';

let sessionCookie = null;

async function login() {
  const url = `${config.portal.baseUrl}${LOGIN_PATH}`;

  let response;
  try {
    response = await axios.post(
      url,
      new URLSearchParams({ email: config.portal.email, password: config.portal.password }).toString(),
      {
        timeout: config.portal.timeoutMs,
        validateStatus: (status) => status < 500,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'x-sveltekit-action': 'true',
          'Origin': config.portal.baseUrl,
          'Referer': `${config.portal.baseUrl}/login`,
        },
      }
    );
  } catch (err) {
    throw portalUnavailableError(err);
  }

  if (response.status === 401 || response.status === 403) {
    throw new AuthenticationError('Portal login failed: invalid credentials');
  }

  if (response.status !== 200) {
    throw new AuthenticationError(
      `Portal login failed: unexpected status ${response.status}`
    );
  }

  const cookie = extractSessionCookie(response.headers['set-cookie']);
  if (!cookie) {
    throw new AuthenticationError(
      'Portal login succeeded but no session cookie was returned'
    );
  }

  sessionCookie = cookie;
}

async function getSessionCookie() {
  if (!sessionCookie) {
    await login();
  }
  return sessionCookie;
}

async function refreshSession() {
  sessionCookie = null;
  await login();
  return sessionCookie;
}

function clearSession() {
  sessionCookie = null;
}

function extractSessionCookie(setCookieHeaders) {
  if (!setCookieHeaders || !Array.isArray(setCookieHeaders)) return null;

  for (const header of setCookieHeaders) {
    const [nameValue] = header.split(';');
    if (nameValue && nameValue.trim().startsWith(SESSION_COOKIE_NAME)) {
      return nameValue.trim();
    }
  }

  return null;
}

function portalUnavailableError(cause) {
  const err = new Error(`Portal unavailable: ${cause.message}`);
  err.isOperational = true;
  err.statusCode = 502;
  err.code = 'PORTAL_UNAVAILABLE';
  err.details = [];
  return err;
}

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.isOperational = true;
    this.statusCode = 502;
    this.code = 'PORTAL_AUTH_FAILED';
    this.details = [];
  }
}

module.exports = { getSessionCookie, refreshSession, clearSession };
