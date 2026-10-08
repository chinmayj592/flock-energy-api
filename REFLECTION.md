# REFLECTION.md

## How the Legacy Portal Was Investigated

The assignment provided the following observed facts:

- Portal URL: `https://urja-ops.flockenergy.tech`
- Session cookie name: `__Secure-better-auth.session_token`
- Meter list page: `GET /meters`
- Transformer list page: `GET /transformers`
- Example meter ID: `J100000`
- Observed meter detail fields: Meter ID, Serial No, Make, Phase Type, Installation Status, Installation Type, Location, Network hierarchy
- Observed consumption columns: Timestamp, kWh, kVAh, V(R), half-hourly readings
- Observed transformer fields: Transformer Code, Name, Feeder, Capacity (kVA)

The session cookie name `__Secure-better-auth.session_token` was the most useful signal. It directly identifies the authentication library (`better-auth`) and its default login endpoint. This allowed a reasonable inference about the login mechanism without guessing blindly.

No live network traffic was captured beyond what the assignment described. All other portal behavior (HTML structure, pagination params, search params) is assumed based on common patterns for this type of portal UI.

---

## What Was Discovered

- The portal is a server-rendered web application, not a JSON API
- Authentication uses `better-auth`, a Node.js auth library with a known default endpoint
- Data is likely rendered as HTML tables — a very common pattern for legacy utility portals
- The portal has pagination on both meters and transformers
- Consumption data is half-hourly and lives on the meter detail page
- There is an export capability on the portal that was not investigated

---

## Architecture Decisions

### Why no database

The assignment suggested a local database as a cache. After discussion, it was dropped because:

- The portal is the authoritative source of truth
- A pure proxy is simpler, more honest, and easier to explain
- Without seeing real portal data volumes, adding a cache layer would be premature optimization
- The proxy architecture is easier to test — no DB setup, no migration state

If caching becomes necessary (e.g. portal is slow or rate-limited), an in-memory TTL cache can be added to the service layer without changing any other layer.

### Why the API is separated from the portal

The public API is deliberately decoupled from the portal's implementation:

- The portal's URLs, HTML structure, and session mechanism are internal details
- If the portal changes its HTML, only `portal.parser.js` needs updating
- If the portal changes its URL structure, only `portal.client.js` needs updating
- API clients never see portal URLs, cookies, or HTML

This separation means the public API can remain stable even as the legacy portal evolves.

### Why Cheerio over a headless browser

Cheerio parses static HTML server-side. It is:
- Fast
- Lightweight
- No browser overhead
- Sufficient for server-rendered HTML pages

A headless browser (Puppeteer, Playwright) would only be needed if the portal renders content via JavaScript after page load. There is no evidence of that based on the assignment description.

### Why Zod for validation

Zod provides schema-based validation with clear error messages. It integrates cleanly with the centralized error handler — a `ZodError` is caught and formatted into the standard error response shape automatically.

### Why better-sqlite3 was not used

Dropped from scope. See "Why no database" above.

---

## Trade-offs

| Decision | Trade-off |
|----------|-----------|
| No database | Simpler architecture, but no historical data accumulation and no offline fallback |
| In-memory session | Simple and fast, but session is lost on server restart |
| Single retry on 401 | Prevents infinite loops, but won't recover from repeated auth failures |
| Local filter for transformer meters | Correct results, but limited to page 1 of the meter list |
| Assumed HTML selectors | Parser works against fixture HTML, but may need updates for real portal HTML |

---

## Limitations

1. **Parser selectors are unverified** — the HTML fixtures used in tests are synthetic. The real portal HTML may use different element structures, class names, or layouts. The parser will need to be updated once real HTML is observed.

2. **Transformer meters are incomplete** — `GET /api/v1/transformers/:transformerId/meters` only searches page 1 of the meter list. If a transformer has meters spread across multiple pages, they will not all be returned. A full implementation would paginate through all pages.

3. **No caching** — every API request triggers a portal request. If the portal is slow or has rate limits, this will be a problem under any meaningful load.

4. **Login endpoint is assumed** — if the portal has customized the `better-auth` login path, authentication will fail. The fix is a one-line change in `portal.auth.js`.

5. **Search parameter is unverified** — the `search` query parameter forwarded to the portal may be ignored. Local filtering is not applied on the meter list (unlike transformer meters), so search results depend entirely on the portal.

6. **Export endpoint not implemented** — the portal has an export capability that was not investigated or implemented.

---

## Skipped Optional Work

- **Bulk/export path** — not implemented, export endpoint not verified
- **Caching layer** — not implemented, would add complexity without verified need
- **Full pagination for transformer meters** — not implemented, documented as a known limitation
- **Web client** — not implemented, backend was the priority

---

## What Would Be Improved With More Time

1. Capture real portal HTML and update all parser selectors to match
2. Verify the login endpoint by inspecting a real network request
3. Verify pagination and search parameter names
4. Investigate the export endpoint
5. Add an in-memory cache with TTL to the service layer
6. Paginate through all meter pages in `getMetersByTransformer`
7. Add request logging middleware
8. Add rate limiting to avoid hammering the portal

---

## Reliability Concerns

- The portal is a legacy system — it may be slow, unreliable, or have undocumented rate limits
- Session expiry handling covers the common case (one refresh on 401/403) but not repeated failures
- If the portal changes its HTML structure, the parser will silently return null fields rather than crashing — this is intentional but means degraded data quality rather than a hard error

---

## Security Considerations

- Credentials are environment variables only — never hardcoded, never logged
- Session cookie is stored in process memory only — never written to disk, never returned to clients
- Stack traces are never exposed in API error responses
- The `.env` file is gitignored
- No secrets appear in any documentation, comments, or test fixtures
