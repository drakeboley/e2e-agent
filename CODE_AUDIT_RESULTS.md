# CODE_AUDIT_RESULTS — e2ebot
- Path: /home/drake/enterprise-picard/ventures/e2ebot/projects/e2ebot
- Audited: 2026-10-19
- Scope: JavaScript (CommonJS), Express, Puppeteer, Cypress, Netlify Functions/Plugins. 18 files (~3,100 LOC excluding lockfile/node_modules/dist). Excluded: `node_modules`, `dist`, `.git`.
- Commands run:
  - `node scripts/build.js`: Pass (rendered static HTML to `dist/`)
  - `npx cypress --version`: Pass (Cypress package 16.1.1 installed; binary reported as `not installed`)
  - `node --check server.js puppeteer-service.js cypress-service.js mcp-server.js test-client.js src/auth/apiKeyService.js src/auth/stripeService.js src/gui/portalHtml.js`: Pass (syntax check valid)
  - `npm test`: Pass (`node scripts/build.js` executed; build succeeded, but zero test assertions run)

## 0. Executive Summary
The `e2ebot` codebase presents itself as an enterprise-grade, multi-tenant SaaS browser automation platform, Model Context Protocol (MCP) server, and Netlify Deploy Preview verification agent complete with tiered API key rate-limiting, SOC2/CFAA compliance covenants, and automated Stripe billing. In reality, the codebase is a single-node Express server wrapping headless Puppeteer and a local Cypress runner, augmented by an in-memory billing and authentication stub. The core Puppeteer execution engine functions locally, but the multi-tenant SaaS layer contains critical security flaws: unauthenticated endpoints allow anyone to mint free unlimited Enterprise API keys, WebSocket browser control is unauthenticated by default, and target URL SSRF protection relies on superficial hostname regexes that are trivial to bypass with decimal IPs or DNS rebinding. Furthermore, the repository's Netlify serverless deployment architecture is fundamentally broken because `netlify.toml` explicitly disables Chromium and Cypress installations, ensuring any cloud function invocation fails. The top three risks are: (1) an unauthenticated key generation endpoint permitting arbitrary creation of top-tier Enterprise API keys, (2) an SSRF bypass vulnerability exposing internal infrastructure and cloud metadata services to arbitrary browser navigation, and (3) a hardcoded active development API key embedded in production code.

Overall ratings (1-5): Architecture 2 | Security 1 | Performance 2 | Accuracy 2

## 1. Architecture Audit
- **Structure & Module Boundaries**: The project is organized around Express/WebSocket entrypoints (`server.js`), browser automation controllers (`puppeteer-service.js`, `cypress-service.js`), an MCP stdio server (`mcp-server.js`), and helper modules in `src/auth/` and `src/gui/`. While module concerns appear partitioned on the surface, boundary coupling is brittle: `server.js` and `scripts/build.js` contain duplicate fallback `require` paths referencing external directories (`../../enterprise-picard/deliverables/...`), indicating unstable workspace scoping.
- **State & Persistence**: All authentication state (`keysByHash`), tenant quotas, rate-limiting windows (`requestTimestamps`), and billing audit trails (`fiduciaryAuditLedger`, `processedWebhookEvents`) reside strictly in volatile Node.js process memory. Server restarts immediately wipe all provisioned customer keys and usage metrics, violating persistence and SLA claims.
- **Configuration & Secrets Management**: Secrets like `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `E2EBOT_API_KEY` are read from `process.env`. However, `src/auth/apiKeyService.js:105` embeds a hardcoded active development key (`e2e_live_dev_lab_key_1234567890abcdef`) into the live key registry upon instantiation.
- **Build & Deploy Story**: The build script `scripts/build.js` simply outputs static HTML files into `dist/`. The project claims Netlify serverless deployment readiness via `netlify/functions/api.js`, but `netlify.toml:7-9` explicitly sets `CYPRESS_INSTALL_BINARY=0` and `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`. Standard Netlify Functions cannot run headless Chromium or Cypress due to execution limits and missing system libraries, rendering the serverless story non-functional.
- **Dependency Hygiene**: `stripe` is referenced and required dynamically in `src/auth/stripeService.js:22` (`require('stripe')`), but it is not listed in `package.json` dependencies. When omitted, the service falls back to a mocked checkout generator without throwing a build-time dependency error.
- **Concurrency & Process Safety**: `cypress-service.js:48, 52, 78` globally redirects `process.stdout.write` to `process.stderr.write`. Under concurrent web requests, this alters process-level standard I/O for all running operations.

## 2. Cybersecurity Audit
- **Authentication & Authorization**:
  - `server.js:195-211` exposes `POST /api/keys` without any authentication middleware. Any anonymous user can supply `{ "name": "exploit", "tier": "ENTERPRISE" }` and receive an active, unthrottled Enterprise API key with 600 req/min and 25,000 runs/month.
  - `server.js:562-568` allows anonymous WebSocket clients to connect and execute arbitrary browser automation commands (`goto`, `click`, `type`, `screenshot`, `getDOM`) without an API key, defaulting to `ws_anon_<timestamp>`.
  - `src/auth/apiKeyService.js:101-106` hardcodes a live PRO key (`e2e_live_dev_lab_key_1234567890abcdef`) active on all server instances.
- **Server-Side Request Forgery (SSRF)**:
  - `puppeteer-service.js:31-79` implements `validateTargetUrl` using regex pattern matching on the URL hostname string (e.g. `^169\.254\.`, `^127\.`, `^10\.`). The implementation does NOT resolve DNS hostnames before validation. An attacker can supply a domain that resolves to internal IPs (`127.0.0.1` or `169.254.169.254`) via DNS rebinding.
  - The regex checks do not account for non-standard IP notations such as decimal IPs (`http://2130706433/` for loopback, `http://2852039166/` for metadata) or octal/hex representations, completely bypassing SSRF controls and allowing Chromium to access internal cloud instance metadata.
- **Sandbox Escapes & Chromium Hardening**:
  - `puppeteer-service.js:87-88` launches Chromium with `--no-sandbox` and `--disable-setuid-sandbox`. Because the service is designed to navigate to arbitrary, untrusted customer URLs, disabling the sandbox leaves the host server vulnerable to remote code execution (RCE) via Chromium zero-days.
- **Cypress Security**:
  - `cypress.config.js:11` sets `chromeWebSecurity: false`, disabling browser same-origin policy enforcement across Cypress runs.
- **Sensitive Data Handling**:
  - `puppeteer-service.js:167-173` implements basic regex redaction (`redactSensitiveText`) for bearer tokens and passwords, which is positive, but session cookies and DOM contents are captured in full before redaction is applied to error traces.

## 3. Performance Audit
- **Memory Growth & Resource Leaks**:
  - `puppeteer-service.js:4, 133-145`: Stateful browser sessions (`tenantSessions = new Map()`) created via REST or MCP actions (`puppeteer_goto`, etc.) are retained in memory indefinitely. The code never prunes idle sessions or enforces an eviction TTL unless an explicit `closeSession` action or WebSocket disconnect occurs. Because REST and MCP do not call `closeSession`, every unique `tenantId:sessionId` leaks a `BrowserContext` and Chromium page.
  - `src/auth/stripeService.js:10, 13`: `processedWebhookEvents` is an unbounded `Set` and `fiduciaryAuditLedger` is an unbounded `Array`. In a production environment receiving periodic webhooks or health checks, memory consumption grows monotonically.
- **Algorithmic Complexity**:
  - `src/auth/apiKeyService.js:167-173`: For every authenticated request, `validateKey` iterates through all stored keys in `this.keysByHash.entries()` and executes `crypto.timingSafeEqual` sequentially ($O(N)$ linear scan) instead of performing an $O(1)$ hash map lookup `this.keysByHash.get(computedHash)`. This adds CPU overhead as keys accumulate.
- **Concurrency & Blocking Operations**:
  - Cypress executions (`cypress-service.js:68`) invoke `cypress.run()` directly within the Node.js process. Cypress is CPU- and memory-intensive; executing multiple concurrent specs will starve the Node.js event loop and exhaust host memory.

## 4. Accuracy Audit
| Claim (source:line) | Reality (evidence) | Verdict |
|:---|:---|:---:|
| "Strict SSRF network egress controls blocking RFC 1918... loopback... and cloud metadata" (`server.js:39`, `01_codebase_analysis.md:31-33`) | Regex string matching without DNS resolution (`puppeteer-service.js:31-79`); bypassed by decimal IPs (`http://2130706433/`) and DNS rebinding. | Inaccurate |
| "Multi-Tenant API Key Auth... & Quota Middleware" (`server.js:71-98`, `README.md:12-14`) | Key minting endpoint `POST /api/keys` (`server.js:195`) requires no auth and permits arbitrary ENTERPRISE tier creation; WebSocket (`server.js:562`) allows anonymous unmetered access. | Inaccurate |
| "Ephemeral BrowserContext per tenant run... 0 seconds post-run retention" (`server.js:160, 165`, `01_codebase_analysis.md:28`) | Interactive sessions in `puppeteer-service.js:133-145` persist in `tenantSessions` map indefinitely and are never cleaned up on REST/MCP flows. | Partially |
| "Stripe SDK v23 integration with Customer Portal" (`01_codebase_analysis.md:38`, `src/auth/stripeService.js:22`) | `stripe` is not in `package.json:15-24`. Checkout session generator catches missing module and returns mock URLs (`src/auth/stripeService.js:153-163`). | Inaccurate |
| "Repeatable Regression Testing (Cypress)" (`README.md:10`, `cypress-service.js:1`) | Cypress binary is not installed in the environment (`npx cypress --version` reports `binary: not installed`). Test spec `franchise-exchange.cy.js` targets an unrelated Heroku app. | Partially |
| "npm test / test suite" (`package.json:9`) | `"test": "node scripts/build.js"` executes the static HTML page compiler. There are zero unit or integration test assertions in `npm test`. | Inaccurate |
| "99.9% uptime SLA" (`server.js:108`, `src/auth/apiKeyService.js:81`) | Hardcoded JSON response string; all state is volatile in-memory with zero persistent database or clustering. | Inaccurate |

## 5. Findings Register
| ID | Category | Severity | Location | Finding | Recommended Fix |
|:---|:---|:---:|:---|:---|:---|
| SEC-01 | Cybersecurity | CRITICAL | `server.js:195-211` | `POST /api/keys` is unauthenticated and allows arbitrary minting of ENTERPRISE tier API keys. | Guard `/api/keys` with administrative authentication and restrict tier self-assignment to verified Stripe webhook callbacks. |
| SEC-02 | Cybersecurity | CRITICAL | `puppeteer-service.js:31-79` | SSRF validator uses hostname regex without DNS resolution, allowing bypasses via decimal IPs and DNS rebinding to access metadata and intranet. | Resolve DNS addresses before validation, validate resolved IP against CIDR ranges, and reject decimal/octal notations. |
| SEC-03 | Cybersecurity | CRITICAL | `src/auth/apiKeyService.js:101-106` | Hardcoded active PRO development API key (`e2e_live_dev_lab_key_1234567890abcdef`) present in production constructor. | Remove hardcoded credentials; only provision initial keys via secure environment variables or explicit administrative seeds. |
| SEC-04 | Cybersecurity | HIGH | `server.js:562-568` | WebSocket server allows anonymous unauthenticated clients to issue arbitrary browser actions without rate-limiting or API keys. | Enforce mandatory API key authentication during WebSocket upgrade (`server.on('upgrade')`) and terminate unauthenticated sockets. |
| SEC-05 | Cybersecurity | HIGH | `puppeteer-service.js:87-88` | Puppeteer launches Chromium with `--no-sandbox` and `--disable-setuid-sandbox` for untrusted web browsing. | Run Chromium in a secure, containerized sandbox environment with seccomp/apparmor rather than disabling the browser sandbox. |
| ARCH-01 | Architecture | HIGH | `netlify.toml:7-9`, `netlify/functions/api.js:1-32` | Netlify function deployment is non-functional because Chromium/Cypress binary downloads are disabled and Lambda cannot host Cypress/WS. | Decouple the marketing/portal static build from the backend; deploy backend server onto dedicated container infrastructure (Docker/ECS/Fly.io). |
| ACC-01 | Accuracy | HIGH | `src/auth/stripeService.js:17-34`, `package.json:15-24` | `stripe` dependency is missing from `package.json`; checkout sessions generate mock URLs; minted keys from webhooks are never delivered to customers. | Add `stripe` to `package.json` dependencies, wire genuine Stripe checkout sessions, and implement customer secret delivery. |
| PERF-01 | Performance | HIGH | `puppeteer-service.js:4, 133-145`, `src/auth/stripeService.js:10, 13` | Unbounded memory growth: `tenantSessions` leaks `BrowserContext` instances; `processedWebhookEvents` and audit ledgers grow without eviction. | Add idle TTL timeouts and LRU eviction to `tenantSessions`; use bounded caches (e.g. Redis or LRU sets) for webhook deduplication. |
| PERF-02 | Performance | MEDIUM | `src/auth/apiKeyService.js:167-173` | Key validation executes an $O(N)$ linear loop over all keys calling `timingSafeEqual` sequentially on every request. | Store keys by SHA-256 hash and perform an $O(1)$ `this.keysByHash.get(computedHash)` lookup. |
| ARCH-02 | Architecture | MEDIUM | `cypress-service.js:48, 52, 78` | Test runner mutates global `process.stdout.write` to point to `stderr`, polluting stream I/O for concurrent HTTP requests. | Capture Cypress output using Cypress's programmatic reporter options rather than monkey-patching global process streams. |
| ACC-02 | Accuracy | MEDIUM | `package.json:9`, `cypress.config.js:9` | `npm test` runs static build script rather than tests; Cypress binary is missing; tests point to external "Franchise Exchange" app. | Implement real test suites (e.g. Jest/Mocha for unit testing auth and SSRF); remove external venture references. |
| SEC-06 | Cybersecurity | LOW | `cypress.config.js:11` | `chromeWebSecurity: false` disables same-origin security enforcement across Cypress test executions. | Enable `chromeWebSecurity: true` or isolate Cypress tests in clean, dedicated test domains. |

## 6. Remediation Priorities
1. **Lock Down API Key Generation (SEC-01)**: Restrict `POST /api/keys` to authenticated administrators and remove client ability to select arbitrary tiers. *(Effort: S)*
2. **Harden SSRF Protection with DNS Resolution (SEC-02)**: Rewrite `validateTargetUrl` to resolve target hostnames to IP addresses before checking against private RFC1918, link-local, and loopback CIDRs. *(Effort: M)*
3. **Purge Hardcoded Secrets & Enforce WebSocket Auth (SEC-03, SEC-04)**: Remove `e2e_live_dev_lab_key_1234567890abcdef` from `apiKeyService.js` and require valid Bearer tokens on WebSocket connection upgrades. *(Effort: S)*
4. **Implement Session TTL and Memory Eviction (PERF-01)**: Add automatic teardown of inactive `tenantSessions` (e.g. 10-minute idle TTL) and bound webhook deduplication sets. *(Effort: M)*
5. **Re-architect Deployment Model (ARCH-01)**: Remove serverless Netlify function wrapper for the browser engine; host the Express/Puppeteer service on dedicated Linux containers with proper sandboxing. *(Effort: L)*
6. **Normalize Stripe Integration and Quota Persistence (ACC-01, PERF-02)**: Add `stripe` to dependencies, integrate real Stripe checkout sessions, and migrate volatile Map storage to a persistent database (PostgreSQL/Redis). *(Effort: L)*
7. **Fix Test Infrastructure (ACC-02, ARCH-02)**: Install Cypress binary or replace `npm test` with actual unit and integration test runners that verify authentication, SSRF rejection, and browser session lifecycles. *(Effort: M)*
