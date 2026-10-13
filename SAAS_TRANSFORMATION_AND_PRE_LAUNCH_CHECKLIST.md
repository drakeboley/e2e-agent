# E2EBot (`e2e-agent`): Crystal-Model SaaS Transformation & Pre-Launch Checklist

> **Application:** [E2EBot](file:///home/drake/e2ebot) (`/home/drake/e2ebot`)  
> **SaaS Architecture Blueprint:** Crystal Space Multi-Protocol Open-Core SaaS Model  
> **Target Positioning:** Autonomous Cloud Browser QA, Deploy-Preview Inspector & Multi-Tenant MCP Testing Fabric  
> **Engaged Enterprise Picard Labs:** Software Lab, Accounting & Fiduciary Lab, Venture & Legal Lab, Marketing & GTM Lab, Research & AI Lab

---

## Part I: Current Codebase Evaluation (`/home/drake/e2ebot`)

### Existing Assets
- **Express + WebSocket Server ([`server.js`](file:///home/drake/e2ebot/server.js)):** Exposes `/api/health`, `/api/partner/info`, `/api/cypress/run`, `/api/puppeteer/smoke`, `/api/webhooks/netlify`, and WebSocket server (`wss`).
- **Puppeteer Controller ([`puppeteer-service.js`](file:///home/drake/e2ebot/puppeteer-service.js)):** Supports `goto`, `click`, `type`, `getText`, `screenshot`, `getDOM`, and `smokeTest`.
- **Cypress Runner ([`cypress-service.js`](file:///home/drake/e2ebot/cypress-service.js)):** Programmatic `cypress.run()` wrapper.
- **MCP Server ([`mcp-server.js`](file:///home/drake/e2ebot/mcp-server.js)):** Stdio MCP server exposing `puppeteer_goto`, `puppeteer_click`, `puppeteer_type`, `puppeteer_getText`, `puppeteer_getDOM`, `puppeteer_smokeTest`, and `cypress_run`.
- **Netlify Partner Manifest ([`netlify-partner-manifest.json`](file:///home/drake/e2ebot/netlify-partner-manifest.json)):** Defines 4 pricing tiers (`Starter` $0/mo, `Pro` $49/mo, `Agency` $199/mo, `Enterprise` $899/mo).

### SaaS & Security Gaps to Remediate (Learned from Portfolio P0s & Crystal Space)
1. **Single-Key / Open-Mode Auth (`server.js#L16-27`):** Currently uses a single static `E2EBOT_API_KEY` env var and defaults to unauthenticated open mode if unset. Lacks hashed multi-tenant API keys (`e2e_live_...`), tier quota tracking (monthly deploy runs & browser execution minutes), and sliding-window rate limiting.
2. **Shared Global Browser Page (`puppeteer-service.js#L3-21`):** Uses a single global `let page` across all requests, leaking cookies, `localStorage`, and DOM state across tenants and failing under concurrent runs.
3. **SSRF (Server-Side Request Forgery) Vulnerability (`puppeteer-service.js#L28-30`):** `page.goto(action.url)` allows arbitrary `file://`, `127.0.0.1`, `localhost`, and cloud metadata (`169.254.169.254`) navigation in hosted multi-tenant mode.
4. **Cypress Spec Path Traversal (`cypress-service.js`):** Unsanitized `spec` parameter could allow path traversal outside `cypress/e2e/`.
5. **Missing Stripe Subscription & Webhook Engine:** Tiers are defined in `netlify-partner-manifest.json`, but there is no `stripeService.js` for checkout sessions, customer portal, strict HMAC webhook verification (`stripe.webhooks.constructEvent`), or auto-provisioning of API keys.
6. **Missing Interactive Web Portal (`GET /`) & Legal/Compliance Routes (`/privacy`, `/terms`, `/api/compliance/policy`):** No self-serve developer dashboard, live smoke-test playground, California ARL subscription disclosures, or Zero-Retention Ephemeral Browser Privacy Policy.

---

## Part II: SaaS Transformation & P0 Launch Readiness Action Matrix

| ID | Lab Authority | Area | Task Description | Target File / Location | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **SAAS-1 (P0-1)** | Software Lab | Multi-Tenant Auth & Quotas | Implement **`ApiKeyService`** (`src/auth/apiKeyService.js`) with SHA-256 hashed keys (`e2e_live_<hex>`), `tenantId` isolation, sliding-window rate limits, and monthly browser execution minute / run metering across `STARTER` ($0), `PRO` ($49), `AGENCY` ($199), and `ENTERPRISE` ($899) tiers. | [`src/auth/apiKeyService.js`](file:///home/drake/enterprise-picard/deliverables/e2ebot/src/auth/apiKeyService.js) & [`server.js`](file:///home/drake/e2ebot/server.js) | ✅ REMEDIATED |
| **SAAS-2 (P0-2)** | Software Lab | SSRF & Browser Isolation | Harden **`puppeteer-service.js`** to: (a) isolate each tenant session inside an ephemeral `browser.createBrowserContext()` with guaranteed cleanup, and (b) block SSRF targets (`file://`, `169.254.169.254`, private RFC1918/loopback IPs when `E2EBOT_HOSTED_MODE=true`). | [`puppeteer-service.js`](file:///home/drake/e2ebot/puppeteer-service.js) | ✅ REMEDIATED |
| **SAAS-3 (P0-3)** | Software Lab | Cypress Spec Sanitization & Hosted MCP | Sanitize `spec` names in **`cypress-service.js`** against path traversal (`^[a-zA-Z0-9_-]+$`), and expose a Bearer-authenticated HTTP MCP endpoint (`POST /mcp` & `POST /api/mcp`) + `e2ebot_health_check` tool alongside stdio `mcp-server.js`. | [`cypress-service.js`](file:///home/drake/e2ebot/cypress-service.js), [`mcp-server.js`](file:///home/drake/enterprise-picard/deliverables/e2ebot/mcp-server.js), [`server.js`](file:///home/drake/e2ebot/server.js) | ✅ REMEDIATED |
| **SAAS-4 (P0-4)** | Accounting Lab | Stripe Billing & Strict HMAC Webhooks | Implement **`src/auth/stripeService.js`** (`createCheckoutSession`, `createCustomerPortalSession`, `handleStripeWebhookEvent`) with strict raw-body `stripe.webhooks.constructEvent` HMAC verification, event idempotency guard, and automatic `e2e_live_` API key provisioning. | [`src/auth/stripeService.js`](file:///home/drake/enterprise-picard/deliverables/e2ebot/src/auth/stripeService.js) & [`server.js`](file:///home/drake/e2ebot/server.js) | ✅ REMEDIATED |
| **SAAS-5 (P0-5)** | Marketing & Software Labs | Interactive Web GUI Portal & AEO/SEO | Create **`src/gui/portalHtml.js`** served at `GET /` featuring an interactive Smoke-Test Inspector, API Key generator, usage telemetry dashboard, Pricing Tier checkout with California ARL disclosures, OpenGraph/Twitter cards, and `JSON-LD SoftwareApplication` schema. | [`src/gui/portalHtml.js`](file:///home/drake/enterprise-picard/deliverables/e2ebot/src/gui/portalHtml.js) & [`server.js`](file:///home/drake/e2ebot/server.js) | ✅ REMEDIATED |
| **SAAS-6 (P0-6)** | Venture & Legal Lab | Ephemeral Browser Privacy & Legal Routes | Publish `/privacy`, `/terms`, and `/api/compliance/policy` enforcing the **Ephemeral Browser Execution & Zero-Credential-Retention Covenant** (cookies, DOM snapshots, and session storage purged immediately after test completion; zero AI model training on private staging URLs). | [`server.js`](file:///home/drake/e2ebot/server.js), [`PRIVACY_POLICY.md`](file:///home/drake/enterprise-picard/deliverables/e2ebot/PRIVACY_POLICY.md), [`TERMS_OF_SERVICE.md`](file:///home/drake/enterprise-picard/deliverables/e2ebot/TERMS_OF_SERVICE.md) | ✅ REMEDIATED |
