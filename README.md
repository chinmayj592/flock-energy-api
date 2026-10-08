# Flock Energy API

A clean REST API built over the Urja Meter Ops legacy portal (`urja-ops.flockenergy.tech`). It authenticates with the portal, retrieves meter and transformer data, parses the HTML responses, and exposes stable normalized JSON endpoints.

---

## Project Overview

The legacy portal is a browser-based web application with no public API. This service acts as an API layer on top of it:

- Authenticates with the portal using a session cookie
- Fetches HTML pages from the portal
- Parses them into clean domain objects
- Exposes a versioned REST API under `/api/v1`

The public API never exposes the portal's internal structure, URLs, or session details.

---

## Architecture

```
Client
  ↓
Express Routes        — define HTTP endpoints, no logic
  ↓
Controllers           — validate input (Zod), format responses
  ↓
Services              — business logic, coordinate portal + parsing
  ↓
Portal Client         — authenticated HTTP requests to legacy portal
  ↓
Portal Auth           — login, session cookie management, refresh
  ↓
Portal Parser         — HTML → normalized JS objects (Cheerio)
  ↓
Legacy Portal         — urja-ops.flockenergy.tech
```

---

## Why This Architecture

- **Routes stay thin** — no logic bleeds into route definitions
- **Controllers handle HTTP concerns only** — validation in, response out
- **Services own business logic** — easy to test, easy to change
- **Portal client is isolated** — if the portal URL structure changes, only one file changes
- **Parser is isolated** — if the portal HTML changes, only one file changes
- **No database** — the portal is the source of truth; a proxy architecture is simpler, more honest, and easier to maintain for this use case

---

## Technology Stack

| Package | Purpose |
|---------|---------|
| `express` | HTTP server |
| `axios` | HTTP client for portal requests |
| `cheerio` | HTML parsing |
| `zod` | Request input validation |
| `dotenv` | Environment variable loading |
| `jest` | Test runner |
| `supertest` | HTTP integration testing |
| `nodemon` | Dev server auto-reload |

---

## Folder Structure

```
flock-energy-api/
├── src/
│   ├── app.js                        Express app setup
│   ├── server.js                     Entry point, binds port
│   ├── config/
│   │   └── env.js                    Reads + validates env vars
│   ├── routes/
│   │   ├── meter.routes.js           Meter URL definitions
│   │   └── transformer.routes.js     Transformer URL definitions
│   ├── controllers/
│   │   ├── meter.controller.js       Meter input validation + response
│   │   └── transformer.controller.js Transformer input validation + response
│   ├── services/
│   │   ├── meter.service.js          Meter business logic
│   │   └── transformer.service.js    Transformer business logic
│   ├── portal/
│   │   ├── portal.auth.js            Login + session cookie management
│   │   ├── portal.client.js          Authenticated HTTP requests
│   │   └── portal.parser.js          HTML → domain objects
│   └── middleware/
│       └── error.middleware.js       Centralized error handler
├── tests/
│   ├── unit/
│   │   └── portal.parser.test.js     Parser unit tests
│   └── integration/
│       ├── meter.routes.test.js      Meter API integration tests
│       └── transformer.routes.test.js Transformer API integration tests
├── docs/
│   └── openapi.json                  OpenAPI 3.0 specification
├── .env.example                      Environment variable template
└── package.json
```

---

## Setup Instructions

### 1. Clone and install

```bash
git clone <repo-url>
cd flock-energy-api
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your real portal credentials. See Environment Variables below.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Port to listen on. Defaults to `3000` |
| `PORTAL_BASE_URL` | Yes | Base URL of the legacy portal |
| `PORTAL_EMAIL` | Yes | Portal login email |
| `PORTAL_PASSWORD` | Yes | Portal login password |
| `PORTAL_TIMEOUT_MS` | No | Request timeout in ms. Defaults to `15000` |

Never commit `.env`. It is listed in `.gitignore`.

See `.env.example` for the template with placeholder values.

---

## How Authentication Works

The legacy portal uses the `better-auth` library, identified by the session cookie name `__Secure-better-auth.session_token`.

On the first request that requires portal data:

1. `portal.auth.js` sends `POST /api/auth/sign-in/email` with JSON credentials
2. The portal returns a `Set-Cookie` header containing the session token
3. The token is stored in memory (never logged, never returned to API clients)
4. All subsequent portal requests include the cookie in the `Cookie` header
5. If a portal request returns 401/403, the session is refreshed once automatically

Credentials are read exclusively from environment variables. They are never hardcoded, logged, or exposed.

---

## How to Run

### Development (auto-reload)

```bash
npm run dev
```

### Production

```bash
npm start
```

The server starts on the port defined in `.env` (default: 3000).

---

## How to Test

```bash
npm test
```

Tests do not require the real portal to be online. The portal client is fully mocked in all integration tests.

Current test coverage: **33 tests, 3 suites, all passing**.

---

## API Examples

### Health check

```
GET /health
```

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### List meters

```
GET /api/v1/meters
GET /api/v1/meters?page=2
GET /api/v1/meters?search=J100000
```

```json
{
  "data": [
    {
      "meterId": "J100000",
      "serialNumber": "SE33962",
      "make": "HPL",
      "phaseType": "Single",
      "installationStatus": "Active",
      "transformerCode": "DT-001"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5
  }
}
```

### Get meter detail

```
GET /api/v1/meters/J100000
```

```json
{
  "data": {
    "meterId": "J100000",
    "serialNumber": "SE33962",
    "make": "HPL",
    "phaseType": "Single Phase",
    "installationStatus": "Active",
    "installationType": "Residential",
    "location": {
      "latitude": 28.5355,
      "longitude": 77.391
    },
    "network": {
      "zone": "North",
      "circle": "Circle 1",
      "division": "Division A",
      "subdivision": "Sub A1",
      "substation": "SS-01",
      "feeder": "F-001",
      "transformerCode": "DT-001",
      "transformerName": null
    },
    "consumption": [
      {
        "timestamp": "2024-01-01 00:00",
        "kwh": 1.23,
        "kvah": 1.45,
        "voltageR": 230.5
      }
    ]
  }
}
```

### Get meter consumption

```
GET /api/v1/meters/J100000/consumption
GET /api/v1/meters/J100000/consumption?limit=48
```

```json
{
  "data": [
    {
      "timestamp": "2024-01-01 00:00",
      "kwh": 1.23,
      "kvah": 1.45,
      "voltageR": 230.5
    }
  ],
  "meta": {
    "meterId": "J100000",
    "count": 1
  }
}
```

### List transformers

```
GET /api/v1/transformers
GET /api/v1/transformers?page=2
```

```json
{
  "data": [
    {
      "transformerId": "DT-001",
      "name": "Malviya Nagar DT 1",
      "feeder": "F-001",
      "capacityKva": 100
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3
  }
}
```

### Get meters for a transformer

```
GET /api/v1/transformers/DT-001/meters
```

```json
{
  "data": [
    {
      "meterId": "J100000",
      "serialNumber": "SE33962",
      "make": "HPL",
      "phaseType": "Single",
      "installationStatus": "Active",
      "transformerCode": "DT-001"
    }
  ],
  "meta": {
    "transformerId": "DT-001",
    "count": 1
  }
}
```

### Error response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "page",
        "message": "page must be >= 1"
      }
    ]
  }
}
```

---

## Error Handling

All errors return consistent JSON. No stack traces or internal details are ever exposed.

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Invalid query parameters |
| `NOT_FOUND` | 404 | Route or resource not found |
| `METER_NOT_FOUND` | 404 | Meter ID not found on portal |
| `PORTAL_AUTH_FAILED` | 502 | Portal login failed |
| `PORTAL_UNAVAILABLE` | 502 | Portal unreachable or timed out |
| `PORTAL_ERROR` | 502 | Portal returned an unexpected HTTP error |
| `PARSE_ERROR` | 502 | Portal returned HTML that could not be parsed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Assumptions

1. The portal login endpoint is `POST /api/auth/sign-in/email` — inferred from the `better-auth` session cookie name. See `PROTOCOL.md`.
2. Meter detail pages are at `/meters/:meterId` — inferred from the `J100000` example in the assignment.
3. Pagination uses a `page` query parameter — common convention, unverified against the real portal.
4. The meter list search parameter is named `search` — unverified, isolated in `portal.client.js`.
5. Portal HTML uses standard table structures — selectors are assumptions until verified against real HTML.

---

## Limitations

1. Parser selectors are based on assumed HTML structure. They must be verified and updated against real portal HTML.
2. `GET /api/v1/transformers/:transformerId/meters` only searches page 1 of the meter list. If the portal has many meters across multiple pages, results may be incomplete.
3. No caching — every API request hits the portal. Under load this will be slow.
4. Session is stored in process memory — restarting the server forces a fresh login.
5. The portal's search parameter behavior is unverified — local filtering is applied as a safety net.

---

## Future Improvements

- Verify all parser selectors against real portal HTML and update them
- Add response caching (e.g. in-memory with TTL) to reduce portal load
- Paginate through all meter pages when fetching meters by transformer
- Add request logging middleware
- Add rate limiting to protect the portal from excessive requests
- Investigate and implement the portal's export endpoint for bulk data
