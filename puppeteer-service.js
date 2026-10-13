const puppeteer = require('puppeteer');

let browser = null;
const tenantSessions = new Map(); // tenantKey -> { context, page, lastActiveAt }

const PRIVATE_HOST_PATTERNS = [
    /^169\.254\./,                         // Cloud metadata & link-local (AWS/GCP/Azure 169.254.169.254)
    /^10\./,                               // RFC1918 Class A private
    /^192\.168\./,                         // RFC1918 Class C private
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,      // RFC1918 Class B private
    /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // CGNAT / Alibaba metadata 100.100.100.200
    /^0\./,                                // 0.0.0.0/8
    /^\[?::1\]?$/i,                        // IPv6 loopback
    /^\[?fe80:/i,                          // IPv6 link-local
    /^\[?fc00:/i,                          // IPv6 unique local
    /^\[?fd[0-9a-f]{2}:/i,                 // IPv6 unique local
    /^metadata\.google\.internal$/i,
    /^metadata$/i
];

const LOOPBACK_PATTERNS = [
    /^localhost$/i,
    /^127\./
];

/**
 * SAAS-2 (P0-2): Strict SSRF Target URL Validator.
 * Blocks file://, javascript:, data:, cloud metadata (169.254.169.254), RFC1918 private networks,
 * and loopback interfaces when E2EBOT_HOSTED_MODE=true.
 */
function validateTargetUrl(rawUrl, options = {}) {
    if (!rawUrl || typeof rawUrl !== 'string') {
        return { valid: false, error: 'Target URL must be a non-empty string' };
    }

    let parsed;
    try {
        parsed = new URL(rawUrl.trim());
    } catch (_err) {
        return { valid: false, error: `Malformed URL: '${rawUrl}'` };
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return {
            valid: false,
            error: `Disallowed protocol '${parsed.protocol}'. Only http: and https: targets are permitted.`
        };
    }

    const hostname = (parsed.hostname || '').toLowerCase();
    if (!hostname) {
        return { valid: false, error: 'Target URL is missing a valid hostname' };
    }

    // Always block cloud metadata, link-local, and RFC1918 private ranges
    for (const pattern of PRIVATE_HOST_PATTERNS) {
        if (pattern.test(hostname)) {
            return {
                valid: false,
                error: `SSRF Protection: Target host '${hostname}' is restricted (private network or cloud metadata endpoint)`
            };
        }
    }

    // Block localhost/loopback in hosted SaaS mode (unless explicitly permitted for local dev)
    const hostedMode = process.env.E2EBOT_HOSTED_MODE !== 'false';
    const allowLocalhost = options.allowLocalhost === true || process.env.E2EBOT_ALLOW_LOCALHOST === 'true' || !hostedMode;
    if (!allowLocalhost) {
        for (const pattern of LOOPBACK_PATTERNS) {
            if (pattern.test(hostname)) {
                return {
                    valid: false,
                    error: `SSRF Protection: Loopback target '${hostname}' is blocked in hosted multi-tenant mode`
                };
            }
        }
    }

    return { valid: true, url: parsed.toString(), hostname };
}

async function initBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-crash-reporter'
            ]
        });
    }
    return browser;
}

/**
 * Creates an isolated ephemeral BrowserContext so cookies, localStorage, and DOM state
 * never bleed across tenants and are destroyed upon completion.
 */
async function createIsolatedContext() {
    const activeBrowser = await initBrowser();
    if (typeof activeBrowser.createBrowserContext === 'function') {
        return await activeBrowser.createBrowserContext();
    }
    if (typeof activeBrowser.createIncognitoBrowserContext === 'function') {
        return await activeBrowser.createIncognitoBrowserContext();
    }
    return activeBrowser.defaultBrowserContext();
}

/**
 * Configures SSRF request interception on a Puppeteer page to block mid-flight HTTP redirects
 * to cloud metadata or internal RFC1918 endpoints.
 */
async function attachSsrfInterceptor(targetPage, options = {}) {
    await targetPage.setRequestInterception(true);
    targetPage.on('request', (req) => {
        const reqUrl = req.url();
        // Allow harmless inline data: images/fonts loaded by legitimate pages, but validate all network navigations/subresources
        if (reqUrl.startsWith('data:') && req.resourceType() !== 'document') {
            return req.continue();
        }
        const check = validateTargetUrl(reqUrl, options);
        if (!check.valid) {
            return req.abort('accessdenied');
        }
        return req.continue();
    });
}

async function getOrCreateTenantSession(tenantKey, options = {}) {
    const existing = tenantSessions.get(tenantKey);
    if (existing && existing.page && !existing.page.isClosed()) {
        existing.lastActiveAt = Date.now();
        return existing;
    }
    const context = await createIsolatedContext();
    const page = await context.newPage();
    await attachSsrfInterceptor(page, options);
    const session = { context, page, tenantKey, createdAt: Date.now(), lastActiveAt: Date.now() };
    tenantSessions.set(tenantKey, session);
    return session;
}

async function closeTenantSession(tenantKey) {
    const session = tenantSessions.get(tenantKey);
    if (session) {
        tenantSessions.delete(tenantKey);
        try {
            if (session.context && typeof session.context.close === 'function') {
                await session.context.close();
            } else if (session.page && !session.page.isClosed()) {
                await session.page.close();
            }
        } catch (_err) {
            // Ignore cleanup errors on already closed contexts
        }
    }
}

/**
 * Redacts sensitive tokens, passwords, or authorization secrets from logs/errors
 * in compliance with SAAS-6 Zero-Credential-Retention Covenant.
 */
function redactSensitiveText(text) {
    if (!text || typeof text !== 'string') return text;
    return text
        .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[REDACTED]')
        .replace(/(e2e_live_)[a-f0-9]+/gi, '$1[REDACTED]')
        .replace(/(password|secret|token|api[_-]?key)=([^&\s]+)/gi, '$1=[REDACTED]');
}

async function executeAction(action = {}, contextOptions = {}) {
    const startTime = Date.now();
    const tenantId = contextOptions.tenantId || action.tenantId || 'public';
    const sessionId = contextOptions.sessionId || action.sessionId || 'default';
    const tenantKey = `${tenantId}:${sessionId}`;
    const allowLocalhost = contextOptions.allowLocalhost ?? action.allowLocalhost;

    // Validate URL upfront for navigation actions
    if (action.type === 'goto' || action.type === 'smokeTest') {
        const urlCheck = validateTargetUrl(action.url, { allowLocalhost });
        if (!urlCheck.valid) {
            return {
                success: false,
                url: action.url,
                error: urlCheck.error,
                ssrfBlocked: true,
                tenantId,
                durationMs: Date.now() - startTime
            };
        }
    }

    // SAAS-2 & SAAS-6: Smoke tests and ephemeral actions run in a dedicated, single-use BrowserContext
    // that is immediately destroyed in `finally` to guarantee zero credential or cookie retention.
    if (action.type === 'smokeTest' || action.ephemeral === true) {
        let ephemeralContext = null;
        let ephemeralPage = null;
        try {
            ephemeralContext = await createIsolatedContext();
            ephemeralPage = await ephemeralContext.newPage();
            await attachSsrfInterceptor(ephemeralPage, { allowLocalhost });

            const errors = [];
            const warnings = [];
            const failedRequests = [];

            const onConsole = (msg) => {
                if (msg.type() === 'error') errors.push(redactSensitiveText(msg.text()));
                if (msg.type() === 'warning') warnings.push(redactSensitiveText(msg.text()));
            };
            const onRequestFailed = (req) => {
                failedRequests.push({
                    url: redactSensitiveText(req.url()),
                    failure: req.failure() ? req.failure().errorText : 'unknown'
                });
            };

            ephemeralPage.on('console', onConsole);
            ephemeralPage.on('requestfailed', onRequestFailed);

            let response;
            try {
                response = await ephemeralPage.goto(action.url, {
                    waitUntil: 'networkidle2',
                    timeout: Math.min(Number(action.timeout) || 30000, 60000)
                });
            } catch (navErr) {
                ephemeralPage.off('console', onConsole);
                ephemeralPage.off('requestfailed', onRequestFailed);
                return {
                    success: false,
                    url: action.url,
                    error: redactSensitiveText(navErr.message),
                    tenantId,
                    ephemeralContextPurged: true,
                    durationMs: Date.now() - startTime
                };
            }

            const title = await ephemeralPage.title();
            const status = response ? response.status() : null;
            const screenshot = action.captureScreenshot
                ? await ephemeralPage.screenshot({ encoding: 'base64' })
                : null;

            ephemeralPage.off('console', onConsole);
            ephemeralPage.off('requestfailed', onRequestFailed);

            return {
                success: status !== null && status < 400 && errors.length === 0,
                url: action.url,
                title,
                status,
                errors,
                warnings,
                failedRequests,
                screenshot,
                tenantId,
                ephemeralContextPurged: true,
                durationMs: Date.now() - startTime
            };
        } catch (error) {
            return {
                success: false,
                error: redactSensitiveText(error.message),
                tenantId,
                ephemeralContextPurged: true,
                durationMs: Date.now() - startTime
            };
        } finally {
            if (ephemeralContext && typeof ephemeralContext.close === 'function') {
                await ephemeralContext.close().catch(() => {});
            } else if (ephemeralPage && !ephemeralPage.isClosed()) {
                await ephemeralPage.close().catch(() => {});
            }
        }
    }

    // Interactive stateful actions scoped strictly to the tenant's isolated BrowserContext
    try {
        const { page } = await getOrCreateTenantSession(tenantKey, { allowLocalhost });

        switch (action.type) {
            case 'goto':
                await page.goto(action.url, {
                    waitUntil: 'networkidle2',
                    timeout: Math.min(Number(action.timeout) || 30000, 60000)
                });
                return { success: true, url: action.url, tenantId, durationMs: Date.now() - startTime };
            case 'click':
                await page.waitForSelector(action.selector, { timeout: 15000 });
                await page.click(action.selector);
                return { success: true, tenantId, durationMs: Date.now() - startTime };
            case 'type':
                await page.waitForSelector(action.selector, { timeout: 15000 });
                await page.type(action.selector, action.text);
                return { success: true, tenantId, durationMs: Date.now() - startTime };
            case 'getText': {
                await page.waitForSelector(action.selector, { timeout: 15000 });
                const text = await page.$eval(action.selector, el => el.innerText);
                return { success: true, text: redactSensitiveText(text), tenantId, durationMs: Date.now() - startTime };
            }
            case 'screenshot': {
                const screenshot = await page.screenshot({ encoding: 'base64' });
                return { success: true, screenshot, tenantId, durationMs: Date.now() - startTime };
            }
            case 'getDOM': {
                const html = await page.content();
                return { success: true, html: redactSensitiveText(html), tenantId, durationMs: Date.now() - startTime };
            }
            case 'closeSession':
                await closeTenantSession(tenantKey);
                return { success: true, tenantId, ephemeralContextPurged: true, durationMs: Date.now() - startTime };
            default:
                return { success: false, error: 'Unknown action type: ' + action.type, tenantId };
        }
    } catch (error) {
        return {
            success: false,
            error: redactSensitiveText(error.message),
            tenantId,
            durationMs: Date.now() - startTime
        };
    }
}

function isBrowserConnected() {
    return !!(browser && browser.connected);
}

async function closeBrowser() {
    for (const key of tenantSessions.keys()) {
        await closeTenantSession(key);
    }
    if (browser) {
        await browser.close();
        browser = null;
    }
}

module.exports = {
    initBrowser,
    executeAction,
    closeBrowser,
    closeTenantSession,
    validateTargetUrl,
    redactSensitiveText,
    isBrowserConnected
};
