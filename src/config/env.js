'use strict';

require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  portal: {
    baseUrl: required('PORTAL_BASE_URL'),
    email: required('PORTAL_EMAIL'),
    password: required('PORTAL_PASSWORD'),
    timeoutMs: parseInt(process.env.PORTAL_TIMEOUT_MS || '15000', 10),
  },
};
