# PROTOCOL.md — Urja Meter Ops Portal Protocol

This document describes the observed and assumed behavior of the legacy portal at:

```
https://urja-ops.flockenergy.tech
```

Each item is explicitly labeled:

- **OBSERVED FACT** — confirmed from actual portal behavior or assignment description
- **ASSUMPTION** — reasonable inference, not directly verified
- **DESIGN DECISION** — choice made in our implementation

---

## Base URL

**OBSERVED FACT**
```
https://urja-ops.flockenergy.tech
```

---

## Authentication

### Session Cookie

**OBSERVED FACT**

The portal sets a session cookie named:

```
__Secure-better-auth.session_token
```

This was observed during portal investigation as described in the assignment.

### Login Endpoint

**ASSUMPTION**

The cookie name `__Secure-better-auth.session_token` identifies the portal as using the `better-auth` Node.js authentication library.

The default `better-auth` email/password sign-in endpoint is:

```
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "<email>",
  "password": "<password>"
}
```

This endpoint has not been directly verified by inspecting a live network request. It is inferred from the library's documented default behavior.

If the portal has customized the auth path, this assumption will fail and `LOGIN_PATH` in `src/portal/portal.auth.js` must be updated.

### Session Mechanism

**ASSUMPTION**

The session token is returned in the `Set-Cookie` response header after a successful login. All subsequent requests must include the cookie in the `Cookie` request header.

**DESIGN DECISION**

The session cookie is stored in process memory. It is:
- Never logged
- Never returned to API clients
- Never written to disk
- Refreshed automatically when a 401 or 403 is received from the portal

---

## Meters

### Meter List URL

**ASSUMPTION**
```
GET /meters
```

Inferred from the assignment description: "The meters page is: GET /meters".

### Meter List Pagination

**ASSUMPTION**

Pagination is controlled by a `page` query parameter:

```
GET /meters?page=2
```

The parameter name `page` is a common convention but has not been verified against the real portal.

### Meter List Search

**ASSUMPTION**

Search is passed as a `search` query parameter:

```
GET /meters?search=J100000
```

The parameter name is unverified. It is isolated in `buildMeterListUrl()` in `src/portal/portal.client.js` and can be changed in one place.

### Meter List Response Format

**ASSUMPTION**

The portal returns HTML. The meter list is rendered as an HTML `<table>` with one row per meter.

**OBSERVED FACT** (from assignment)

Observed columns include:
- Meter Number / Meter ID
- Serial Number
- Make
- Phase
- Installation Status
- DT / transformer relationship

### Meter Detail URL

**ASSUMPTION**
```
GET /meters/:meterId
```

Inferred from the assignment example: meter `J100000` has an individual detail page. The URL pattern `/meters/J100000` is assumed.

### Meter Detail Response Format

**ASSUMPTION**

The portal returns HTML. Detail fields are rendered as key-value pairs in a table or definition list.

**OBSERVED FACT** (from assignment)

The detail page contains:
- Meter ID
- Serial No
- Make
- Phase Type
- Installation Status
- Installation Type
- Location
- Network hierarchy (Zone, Circle, Division, Subdivision, Substation, Feeder, Distribution Transformer)
- Consumption readings

### Consumption Data

**OBSERVED FACT** (from assignment)

Consumption readings are half-hourly.

Observed columns:
- Timestamp
- kWh
- kVAh
- V(R)

**ASSUMPTION**

Consumption data is rendered in a second HTML `<table>` on the meter detail page, identifiable by its column headers.

---

## Transformers

### Transformer List URL

**ASSUMPTION**
```
GET /transformers
```

Inferred from the assignment: "The portal has: GET /transformers".

### Transformer List Pagination

**ASSUMPTION**

Same `page` query parameter convention as meters:

```
GET /transformers?page=2
```

### Transformer List Response Format

**OBSERVED FACT** (from assignment)

The page contains:
- Transformer Code
- Transformer Name
- Feeder
- Capacity (kVA)

Example observed:
```
DT-001
Malviya Nagar DT 1
F-001
100 kVA
```

**ASSUMPTION**

Data is rendered as an HTML `<table>`.

---

## Export Endpoint

**NOT VERIFIED**

The assignment mentions an "Export all meters" capability visible on the portal.

The assignment explicitly states:
> Do NOT invent the export endpoint. Investigate the actual request if needed.

This endpoint has not been investigated. It is not implemented. It should be discovered by inspecting the actual network request made when the export button is clicked in the portal.

---

## Response Format

**ASSUMPTION**

All portal pages return HTML. No verified JSON API endpoints exist beyond the authentication endpoint.

**DESIGN DECISION**

All portal responses are fetched with `responseType: 'text'` and parsed with Cheerio. If a verified JSON endpoint is discovered, the portal client can be updated to handle it directly.

---

## Important Headers

**DESIGN DECISION**

Our portal requests include:

```
Cookie: __Secure-better-auth.session_token=<value>
```

No other custom headers have been identified as required. Standard axios defaults are used for all other headers.

---

## Known Unknowns

| Item | Status |
|------|--------|
| Login endpoint URL | ASSUMPTION — inferred from cookie name |
| Login payload field names | ASSUMPTION — inferred from better-auth defaults |
| Meter list pagination param name | ASSUMPTION — `page` is unverified |
| Meter search param name | ASSUMPTION — `search` is unverified |
| Meter detail URL pattern | ASSUMPTION — `/meters/:id` inferred from example |
| Transformer pagination param name | ASSUMPTION — `page` is unverified |
| Export endpoint | NOT VERIFIED — not implemented |
| Whether any endpoint returns JSON | NOT VERIFIED — assumed HTML only |
| Exact HTML table structure | NOT VERIFIED — selectors are assumed |
