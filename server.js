const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const puppeteerService = require('./puppeteer-service');
const cypressService = require('./cypress-service');
const cors = require('cors');

let apiKeyModule;
try {
    apiKeyModule = require('./src/auth/apiKeyService');
} catch (_e) {
    apiKeyModule = require('../enterprise-picard/deliverables/e2ebot/src/auth/apiKeyService');
}

let stripeModule;
try {
    stripeModule = require('./src/auth/stripeService');
} catch (_e) {
    stripeModule = require('../enterprise-picard/deliverables/e2ebot/src/auth/stripeService');
}

let portalModule;
try {
    portalModule = require('./src/gui/portalHtml');
} catch (_e) {
    portalModule = require('../enterprise-picard/deliverables/e2ebot/src/gui/portalHtml');
}

const { defaultApiKeyService, SubscriptionTier, TIER_LIMITS } = apiKeyModule;
const {
    createCheckoutSession,
    createCustomerPortalSession,
    handleStripeWebhookEvent,
    getFiduciaryAuditLedger
} = stripeModule;
const { renderPortalHtml, EPHEMERAL_EXECUTION_COVENANT } = portalModule;

const AUTHORIZED_TARGET_ATTESTATION =
    'AUTHORIZED TARGET ATTESTATION & SSRF PROHIBITION (18 U.S.C. § 1030): Customer represents, warrants, and covenants that it owns or possesses explicit written authorization from the system owner to execute automated browser tests against every target URL submitted to E2EBot. E2EBot enforces strict Server-Side Request Forgery (SSRF) network egress controls blocking RFC 1918 private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), loopback interfaces (127.0.0.0/8, ::1), link-local/cloud metadata endpoints (169.254.169.254), and non-HTTP(S) protocols. Unauthorized scanning, credential stuffing, denial-of-service testing, or probing of third-party infrastructure violates the Computer Fraud and Abuse Act (18 U.S.C. § 1030) and will result in immediate account termination.';

const CALIFORNIA_ARL_DISCLOSURE =
    "CALIFORNIA AUTOMATIC RENEWAL LAW (ARL) DISCLOSURE (CAL. BUS. & PROF. CODE § 17602): Paid E2EBot subscriptions automatically renew at the end of each monthly or annual billing cycle at the then-current tier rate unless cancelled prior to the renewal date. By checking the affirmative consent box at checkout, you authorize recurring charges to your payment method. You may cancel your subscription at any time with one click via Dashboard → Billing & Settings → Cancel Subscription (at least 24 hours before renewal to avoid the next period's charge).";

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Preserve raw Buffer body for strict Stripe webhook HMAC verification (SAAS-4)
app.use(
    express.json({
        limit: '10mb',
        verify: (req, _res, buf) => {
            req.rawBody = buf;
        }
    })
);
app.use(cors());

function extractToken(req) {
    const adminKey = req.headers['x-admin-key'] || req.headers['x-e2ebot-admin-key'];
    if (adminKey && typeof adminKey === 'string') {
        return adminKey.trim();
    }
    const headerKey = req.headers['x-e2ebot-api-key'] || req.headers['x-api-key'];
    if (headerKey && typeof headerKey === 'string') {
        return headerKey.trim();
    }
    const authHeader = req.headers['authorization'];
    if (authHeader && typeof authHeader === 'string') {
        return authHeader.replace(/^Bearer\s+/i, '').trim();
    }
    return '';
}

// SAAS-1 (P0-1): Multi-Tenant API Key Auth, Sliding-Window Rate Limit & Quota Middleware
const authMiddleware = (options = { checkExecutionQuota: false }) => (req, res, next) => {
    const token = extractToken(req);
    const validation = defaultApiKeyService.validateKey(token, options);

    if (!validation.valid || !validation.apiKey) {
        return res.status(validation.statusCode || 401).json({
            success: false,
            error: validation.error || 'Unauthorized: Valid e2e_live_ Bearer API key required',
            hint: 'Provide Authorization: Bearer e2e_live_<hex> or X-E2EBot-API-Key header'
        });
    }

    req.authenticated = true;
    req.apiKey = validation.apiKey;
    req.tenantId = validation.apiKey.tenantId;
    req.tierLimits = validation.limits;

    const requestedTenant = (req.query && req.query.tenantId) || (req.body && req.body.tenantId);
    if (requestedTenant && requestedTenant !== req.tenantId && requestedTenant !== 'public') {
        return res.status(403).json({
            success: false,
            error: `Tenant Isolation Violation (SAAS-1): Token scoped to '${req.tenantId}' cannot access '${requestedTenant}'`
        });
    }

    next();
};

// SAAS-3: Enterprise SLA & Uptime Health Probes
const healthHandler = (_req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'e2ebot',
        version: '1.2.0',
        uptime: process.uptime(),
        ready: true,
        slaTarget: '99.9%',
        browserConnected: puppeteerService.isBrowserConnected ? puppeteerService.isBrowserConnected() : true,
        ssrfProtectionEnabled: true,
        ephemeralContextIsolation: true,
        timestamp: new Date().toISOString()
    });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
app.get('/api/mcp/health', healthHandler);

app.get('/api/partner/info', (_req, res) => {
    res.json({
        partner: 'Netlify Partner Ecosystem',
        extension: 'e2ebot-testing',
        version: '1.2.0',
        capabilities: [
            'deploy-preview-smoke-test',
            'cypress-e2e-regression',
            'realtime-puppeteer-websocket',
            'model-context-protocol-mcp',
            'multi-tenant-ephemeral-browser-isolation'
        ],
        pricingTiers: ['STARTER', 'PRO', 'AGENCY', 'ENTERPRISE']
    });
});

// SAAS-5 & SAAS-6: Interactive Web Portal + Privacy, Terms & Compliance Routes
app.get('/', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderPortalHtml());
});

app.get('/api/compliance/policy', (_req, res) => {
    res.status(200).json({
        documentId: 'EPIC-E2EBOT-PRIVACY-09',
        effectiveDate: '2026-10-12',
        entity: 'Enterprise Picard LLC d/b/a E2EBot Cloud',
        ephemeralExecution: true,
        zeroCredentialRetention: true,
        modelTrainingExclusion: true,
        ssrfProtectionEnabled: true,
        cfaaAuthorizedTargetRequired: true,
        californiaArlCompliant: true,
        covenants: {
            ephemeralExecutionCovenant: EPHEMERAL_EXECUTION_COVENANT,
            authorizedTargetAttestation: AUTHORIZED_TARGET_ATTESTATION,
            californiaArlDisclosure: CALIFORNIA_ARL_DISCLOSURE
        },
        securityControls: {
            saas1_multiTenantAuth: 'SHA-256 hashed e2e_live_ API keys with constant-time verification, sliding-window rate limits, and monthly quota metering',
            saas2_browserAndSsrfIsolation: 'Ephemeral BrowserContext per tenant run with strict RFC1918, loopback, file://, and 169.254.169.254 SSRF blocking',
            saas3_cypressAndMcpHardening: 'Strict alphanumeric spec path-traversal sanitization and Bearer-authenticated HTTP MCP endpoint (/mcp, /api/mcp)',
            saas4_stripeHmacWebhooks: 'Fail-closed raw-body stripe.webhooks.constructEvent HMAC-SHA256 verification and processedWebhookEvents idempotency ledger'
        },
        retentionSchedule: {
            ephemeralBrowserContext: '0 seconds post-run (destroyed in finally block)',
            testCredentialsAndCookies: 'Volatile RAM only; redacted from logs and never stored at rest',
            apiKeys: 'Stored exclusively as SHA-256 hashes until revoked'
        },
        contactEmail: 'privacy@enterprisepicard.com'
    });
});

app.get('/privacy', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Privacy Policy &amp; Ephemeral Browser Covenant — E2EBot Cloud</title><style>body{background:#070b14;color:#f1f5f9;font-family:system-ui,sans-serif;max-width:880px;margin:2rem auto;padding:2rem;line-height:1.65;}h1,h2{color:#38bdf8;}blockquote{background:rgba(16,185,129,0.1);border-left:4px solid #10b981;padding:1rem;margin:1.5rem 0;border-radius:6px;}a{color:#38bdf8;}</style></head><body><h1>E2EBot Cloud: Privacy Policy &amp; Ephemeral Browser Execution Covenant</h1><p><strong>Effective Date:</strong> October 12, 2026 | <strong>Entity:</strong> Enterprise Picard LLC d/b/a E2EBot Cloud | <strong>Ref:</strong> EPIC-E2EBOT-PRIVACY-09</p><blockquote><strong>${EPHEMERAL_EXECUTION_COVENANT}</strong></blockquote><h2>1. Scope &amp; Ephemeral Architecture</h2><p>Every Puppeteer smoke test and Cypress regression run executes inside an isolated <code>BrowserContext</code> that is destroyed immediately upon test run completion. Cookies, <code>localStorage</code>, DOM snapshots, and auth headers are purged immediately (0 seconds post-run retention).</p><h2>2. Information Collected</h2><ul><li>Account &amp; Workspace metadata (email, <code>tenantId</code>, subscription tier, SHA-256 hashed <code>e2e_live_</code> API keys).</li><li>Billing identifiers processed via Stripe (no raw payment card numbers are stored on E2EBot servers).</li><li>Redacted execution telemetry (run counts and browser execution minutes for tier quota metering).</li></ul><h2>3. Zero AI Model Training</h2><p>Private staging URLs, deploy previews, DOM structures, and screenshots are <strong>never</strong> used to train, fine-tune, or evaluate any AI/ML models.</p><h2>4. GDPR &amp; CCPA/CPRA Rights</h2><p>Contact <a href="mailto:privacy@enterprisepicard.com">privacy@enterprisepicard.com</a> to exercise access, rectification, or immediate cryptographic erasure rights.</p><p><a href="/">← Return to E2EBot Cloud Portal</a></p></body></html>`);
});

app.get('/terms', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Terms of Service, SSRF Prohibition &amp; ARL — E2EBot Cloud</title><style>body{background:#070b14;color:#f1f5f9;font-family:system-ui,sans-serif;max-width:880px;margin:2rem auto;padding:2rem;line-height:1.65;}h1,h2{color:#38bdf8;}blockquote{background:rgba(245,158,11,0.12);border-left:4px solid #f59e0b;padding:1rem;margin:1.5rem 0;border-radius:6px;}a{color:#38bdf8;}</style></head><body><h1>E2EBot Cloud: Terms of Service &amp; Subscription Agreement</h1><p><strong>Effective Date:</strong> October 12, 2026 | <strong>Entity:</strong> Enterprise Picard LLC d/b/a E2EBot Cloud | <strong>Ref:</strong> EPIC-E2EBOT-TERMS-10</p><h2>1. Authorized Target Attestation &amp; SSRF / CFAA Prohibition (18 U.S.C. § 1030)</h2><blockquote><strong>${AUTHORIZED_TARGET_ATTESTATION}</strong></blockquote><h2>2. California Automatic Renewal Law (Cal. Bus. &amp; Prof. Code § 17602)</h2><blockquote><strong>${CALIFORNIA_ARL_DISCLOSURE}</strong></blockquote><h2>3. Ephemeral Browser Execution Covenant</h2><blockquote><strong>${EPHEMERAL_EXECUTION_COVENANT}</strong></blockquote><h2>4. Limitation of Liability &amp; Governing Law</h2><p>Service is provided "AS IS" with a 99.9% uptime SLA for Enterprise tier subscribers. Governed by the laws of the State of Delaware.</p><p><a href="/">← Return to E2EBot Cloud Portal</a></p></body></html>`);
});

// SAAS-1 & SAAS-4: Tiers, API Key Provisioning, Telemetry & Stripe Billing
app.get('/api/tiers', (_req, res) => {
    res.json({
        tiers: {
            STARTER: TIER_LIMITS.STARTER,
            PRO: TIER_LIMITS.PRO,
            AGENCY: TIER_LIMITS.AGENCY,
            ENTERPRISE: TIER_LIMITS.ENTERPRISE
        }
    });
});

// SEC-01: Secure POST /api/keys — Require master admin authentication before issuing new keys or upgrading tiers
app.post('/api/keys', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized: Master admin authentication required to issue API keys or upgrade tiers',
            hint: 'Provide master admin key via X-Admin-Key, Authorization: Bearer <master-admin-key>, or X-E2EBot-API-Key header'
        });
    }

    if (!defaultApiKeyService.isMasterAdmin(token)) {
        return res.status(403).json({
            success: false,
            error: 'Forbidden: Master admin credentials required to issue API keys or upgrade tiers'
        });
    }

    const { name, tier, tenantId, action, keyId } = req.body || {};

    // Support upgrading tiers on an existing key or tenant
    if (action === 'upgrade' || (keyId && tier)) {
        if (!tier) {
            return res.status(400).json({ success: false, error: 'Subscription tier is required for upgrade' });
        }
        let updatedKey = null;
        if (keyId) {
            updatedKey = defaultApiKeyService.updateKeyTier({ keyId, tier });
        }
        if (!updatedKey && tenantId) {
            const updated = defaultApiKeyService.updateTenantSubscription({ tenantId, tier });
            if (updated && updated.length > 0) {
                updatedKey = updated[0];
            }
        }
        if (!updatedKey) {
            return res.status(404).json({ success: false, error: 'Target API key or tenant not found for tier upgrade' });
        }
        return res.status(200).json({
            success: true,
            message: `Tier successfully updated to ${tier.toUpperCase()}`,
            apiKey: updatedKey
        });
    }

    if (!name || typeof name !== 'string') {
        return res.status(400).json({ success: false, error: 'Key name is required' });
    }

    const created = defaultApiKeyService.createKey({
        name: name.trim(),
        tier: tier || SubscriptionTier.STARTER,
        tenantId: tenantId || `tenant:${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
    });

    res.status(201).json({
        success: true,
        message: 'e2e_live_ API Key minted. Store raw secret securely; only its SHA-256 hash is persisted.',
        apiKey: created.apiKey,
        secret: created.rawSecret
    });
});

app.patch('/api/keys/:id', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized: Master admin authentication required to upgrade tiers'
        });
    }

    if (!defaultApiKeyService.isMasterAdmin(token)) {
        return res.status(403).json({
            success: false,
            error: 'Forbidden: Master admin credentials required to upgrade tiers'
        });
    }

    const { tier } = req.body || {};
    if (!tier) {
        return res.status(400).json({ success: false, error: 'Subscription tier is required for upgrade' });
    }

    const updatedKey = defaultApiKeyService.updateKeyTier({ keyId: req.params.id, tier });
    if (!updatedKey) {
        return res.status(404).json({ success: false, error: 'API key not found' });
    }

    res.status(200).json({
        success: true,
        message: `API Key tier upgraded to ${tier.toUpperCase()}`,
        apiKey: updatedKey
    });
});

app.get('/api/keys', (req, res) => {
    const token = extractToken(req);
    let tenantId = 'public';
    let isAdmin = false;
    if (token) {
        if (defaultApiKeyService.isMasterAdmin(token)) {
            isAdmin = true;
            tenantId = req.query.tenantId || null;
        } else {
            const validation = defaultApiKeyService.validateKey(token);
            if (validation.valid && validation.apiKey) {
                tenantId = validation.apiKey.tenantId;
            }
        }
    }
    res.json({
        success: true,
        tenantId: tenantId || 'all',
        keys: defaultApiKeyService.listKeys(isAdmin && !req.query.tenantId ? null : tenantId)
    });
});

app.get('/api/telemetry', (req, res) => {
    const token = extractToken(req);
    let tenantId = 'tenant:software_lab';
    if (token) {
        const validation = defaultApiKeyService.validateKey(token);
        if (validation.valid && validation.apiKey) {
            tenantId = validation.apiKey.tenantId;
        }
    }
    res.json(defaultApiKeyService.getTenantTelemetry(tenantId));
});

app.post('/api/billing/create-checkout-session', async (req, res) => {
    try {
        const { tier, email, tenantId, arlConsent, successUrl, cancelUrl } = req.body || {};
        const baseUrl = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : 'https://e2ebot.dev');
        const session = await createCheckoutSession({
            tier: tier || SubscriptionTier.PRO,
            customerEmail: email,
            tenantId,
            arlConsent: arlConsent === true,
            successUrl: successUrl || `${baseUrl}/?billing_status=success`,
            cancelUrl: cancelUrl || `${baseUrl}/?billing_status=cancelled`
        });
        res.status(200).json({ success: true, ...session });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.post('/api/billing/create-portal-session', async (req, res) => {
    try {
        const { customerId, returnUrl } = req.body || {};
        const baseUrl = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : 'https://e2ebot.dev');
        const portal = await createCustomerPortalSession({
            customerId: customerId || 'cus_self_serve',
            returnUrl: returnUrl || baseUrl
        });
        res.status(200).json({ success: true, ...portal });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// SAAS-4 (P0-4): Strict Raw-Body HMAC Stripe Webhook Handler
app.post('/api/billing/webhook', async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        return res.status(400).json({ success: false, error: 'Missing stripe-signature header' });
    }
    if (!req.rawBody) {
        return res.status(400).json({ success: false, error: 'Missing raw request body for strict HMAC verification' });
    }
    try {
        const result = await handleStripeWebhookEvent(req.rawBody, signature);
        return res.status(200).json(result);
    } catch (err) {
        const status = err.statusCode || 400;
        return res.status(status).json({ success: false, error: `Webhook Error: ${err.message}` });
    }
});

app.get('/api/billing/audit-ledger', authMiddleware(), (_req, res) => {
    res.json({ success: true, ledger: getFiduciaryAuditLedger() });
});

// SAAS-3: Bearer-Authenticated Hosted HTTP MCP Endpoint (POST /mcp & /api/mcp)
const mcpHttpHandler = async (req, res) => {
    const { method, params, id } = req.body || {};
    try {
        if (method === 'initialize') {
            return res.json({
                jsonrpc: '2.0',
                id: id ?? 1,
                result: {
                    protocolVersion: '2024-11-05',
                    serverInfo: { name: 'e2ebot-testing', version: '1.2.0' },
                    capabilities: { tools: {} }
                }
            });
        }

        if (method === 'ping') {
            return res.json({ jsonrpc: '2.0', id: id ?? 1, result: { ok: true } });
        }

        if (method === 'tools/list') {
            return res.json({
                jsonrpc: '2.0',
                id: id ?? 1,
                result: {
                    tools: [
                        { name: 'puppeteer_goto', description: 'Navigate isolated tenant BrowserContext to an authorized URL' },
                        { name: 'puppeteer_click', description: 'Click an element matching the CSS selector' },
                        { name: 'puppeteer_type', description: 'Type text into an element matching the CSS selector' },
                        { name: 'puppeteer_getText', description: 'Get inner text of an element' },
                        { name: 'puppeteer_getDOM', description: 'Get current redacted HTML content of the page' },
                        { name: 'puppeteer_smokeTest', description: 'Run an isolated ephemeral BrowserContext smoke test with SSRF protection' },
                        { name: 'cypress_run', description: 'Run a sanitized Cypress spec file against an authorized baseUrl' },
                        { name: 'e2ebot_health_check', description: 'Check E2EBot SLA health, SSRF protection, and browser readiness' }
                    ]
                }
            });
        }

        if (method === 'tools/call') {
            const toolName = params && params.name;
            const args = (params && params.arguments) || {};

            if (toolName === 'e2ebot_health_check') {
                return res.json({
                    jsonrpc: '2.0',
                    id: id ?? 1,
                    result: {
                        status: 'healthy',
                        service: 'e2ebot',
                        version: '1.2.0',
                        tenantId: req.tenantId,
                        ssrfProtectionEnabled: true,
                        ephemeralContextIsolation: true,
                        timestamp: new Date().toISOString()
                    }
                });
            }

            if (toolName === 'cypress_run') {
                const startTime = Date.now();
                const result = await cypressService.runSpec(args.spec, {
                    baseUrl: args.baseUrl,
                    tenantId: req.tenantId
                });
                defaultApiKeyService.recordUsage(req.apiKey, {
                    deployPreviewRuns: 1,
                    durationMs: Date.now() - startTime
                });
                return res.json({
                    jsonrpc: '2.0',
                    id: id ?? 1,
                    result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
                });
            }

            const actionMap = {
                puppeteer_goto: { type: 'goto', url: args.url },
                puppeteer_click: { type: 'click', selector: args.selector },
                puppeteer_type: { type: 'type', selector: args.selector, text: args.text },
                puppeteer_getText: { type: 'getText', selector: args.selector },
                puppeteer_getDOM: { type: 'getDOM' },
                puppeteer_smokeTest: {
                    type: 'smokeTest',
                    url: args.url,
                    captureScreenshot: !!args.captureScreenshot
                }
            };

            const mappedAction = actionMap[toolName];
            if (!mappedAction) {
                return res.status(400).json({
                    jsonrpc: '2.0',
                    id: id ?? null,
                    error: { code: -32601, message: `Unknown MCP tool: ${toolName}` }
                });
            }

            const result = await puppeteerService.executeAction(mappedAction, {
                tenantId: req.tenantId
            });
            defaultApiKeyService.recordUsage(req.apiKey, {
                deployPreviewRuns: toolName === 'puppeteer_smokeTest' ? 1 : 0,
                durationMs: result.durationMs || 500
            });

            return res.json({
                jsonrpc: '2.0',
                id: id ?? 1,
                result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
            });
        }

        return res.status(400).json({
            jsonrpc: '2.0',
            id: id ?? null,
            error: { code: -32601, message: `Unsupported MCP method: ${method}` }
        });
    } catch (err) {
        return res.status(500).json({
            jsonrpc: '2.0',
            id: id ?? null,
            error: { code: -32000, message: err.message }
        });
    }
};

app.post('/mcp', authMiddleware({ checkExecutionQuota: true }), mcpHttpHandler);
app.post('/api/mcp', authMiddleware({ checkExecutionQuota: true }), mcpHttpHandler);

// Protected Cypress, Puppeteer Smoke Test & Netlify Deploy Preview Endpoints
app.post('/api/cypress/run', authMiddleware({ checkExecutionQuota: true }), async (req, res) => {
    const { spec, baseUrl, env } = req.body || {};
    try {
        const results = await cypressService.runSpec(spec, {
            baseUrl,
            env,
            tenantId: req.tenantId
        });
        defaultApiKeyService.recordUsage(req.apiKey, {
            deployPreviewRuns: 1,
            durationMs: results.durationMs || 1000
        });
        res.json({ success: true, tenantId: req.tenantId, results });
    } catch (error) {
        const status = error.message && error.message.includes('Security Violation') ? 400 : 500;
        res.status(status).json({ success: false, error: error.message });
    }
});

app.post('/api/puppeteer/smoke', authMiddleware({ checkExecutionQuota: true }), async (req, res) => {
    const { url, captureScreenshot, timeout } = req.body || {};
    if (!url) {
        return res.status(400).json({ success: false, error: 'Target URL is required' });
    }
    try {
        const result = await puppeteerService.executeAction(
            {
                type: 'smokeTest',
                url,
                captureScreenshot: !!captureScreenshot,
                timeout
            },
            { tenantId: req.tenantId }
        );
        if (result.ssrfBlocked) {
            return res.status(400).json(result);
        }
        defaultApiKeyService.recordUsage(req.apiKey, {
            deployPreviewRuns: 1,
            durationMs: result.durationMs || 500
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/webhooks/netlify', authMiddleware({ checkExecutionQuota: true }), async (req, res) => {
    const event = req.headers['x-netlify-event'] || (req.body && req.body.event) || 'deploy-succeeded';
    const payload = req.body || {};
    const targetUrl = payload.deploy_ssl_url || payload.ssl_url || payload.url;
    const deployId = payload.id || payload.deploy_id;
    const context = payload.context || 'deploy-preview';
    const siteName = payload.name || payload.site_name || 'unknown-site';

    console.log(`[Netlify Webhook] Event: ${event}, Site: ${siteName}, Context: ${context}, URL: ${targetUrl}`);

    if (!targetUrl) {
        return res.status(200).json({
            received: true,
            message: 'Webhook received, but no target URL provided for testing.'
        });
    }

    const urlCheck = await puppeteerService.validateTargetUrl(targetUrl);
    if (!urlCheck.valid) {
        return res.status(400).json({
            success: false,
            error: `SSRF Protection: Blocked Netlify webhook targetUrl — ${urlCheck.error}`
        });
    }

    const runAsync = req.query.async === 'true';

    const executeTests = async () => {
        const startTime = Date.now();
        const report = {
            deployId,
            siteName,
            context,
            targetUrl,
            tenantId: req.tenantId,
            timestamp: new Date().toISOString()
        };

        try {
            report.smokeTest = await puppeteerService.executeAction(
                {
                    type: 'smokeTest',
                    url: targetUrl,
                    captureScreenshot: true
                },
                { tenantId: req.tenantId }
            );
        } catch (smokeErr) {
            report.smokeTest = { success: false, error: smokeErr.message };
        }

        if (payload.runCypress) {
            try {
                report.cypress = await cypressService.runSpec(payload.spec || 'sample', {
                    baseUrl: targetUrl,
                    tenantId: req.tenantId
                });
            } catch (cyErr) {
                report.cypress = { success: false, error: cyErr.message };
            }
        }

        defaultApiKeyService.recordUsage(req.apiKey, {
            deployPreviewRuns: 1,
            durationMs: Date.now() - startTime
        });

        return report;
    };

    if (runAsync) {
        executeTests().catch(err => console.error('[Netlify Webhook] Async test error:', err));
        return res.status(202).json({
            accepted: true,
            message: 'Test run initiated for Netlify deploy preview',
            deployId,
            targetUrl,
            tenantId: req.tenantId
        });
    } else {
        const report = await executeTests();
        return res.json({
            success: report.smokeTest?.success ?? false,
            report
        });
    }
});

// WebSocket for real-time Puppeteer control (Isolated by Tenant Session)
wss.on('connection', (ws, req) => {
    const token = extractToken(req || { headers: {} });
    const validation = token ? defaultApiKeyService.validateKey(token) : null;
    const tenantId = (validation && validation.valid && validation.apiKey)
        ? validation.apiKey.tenantId
        : `ws_anon_${Date.now().toString(36)}`;

    ws.on('message', async (message) => {
        try {
            const action = JSON.parse(message);
            const result = await puppeteerService.executeAction(action, { tenantId });
            if (validation && validation.apiKey) {
                defaultApiKeyService.recordUsage(validation.apiKey, {
                    deployPreviewRuns: action.type === 'smokeTest' ? 1 : 0,
                    durationMs: result.durationMs || 250
                });
            }
            ws.send(
                JSON.stringify({
                    actionId: action.id,
                    ...result
                })
            );
        } catch (_error) {
            ws.send(JSON.stringify({ success: false, error: 'Failed to process message' }));
        }
    });

    ws.on('close', () => {
        puppeteerService.closeTenantSession(`${tenantId}:default`).catch(() => {});
    });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    server.listen(PORT, async () => {
        console.log(`E2EBot Multi-Tenant SaaS Server running on port ${PORT}`);
        try {
            await puppeteerService.initBrowser();
            console.log('Puppeteer browser initialized with Ephemeral BrowserContext isolation');
        } catch (err) {
            console.error('Failed to initialize Puppeteer on startup:', err);
        }
    });

    process.on('SIGINT', async () => {
        console.log('Shutting down server and browser...');
        await puppeteerService.closeBrowser();
        process.exit();
    });
}

module.exports = {
    app,
    server,
    wss
};
