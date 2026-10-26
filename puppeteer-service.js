let _puppeteer = null;
async function getPuppeteer() {
    if (!_puppeteer) {
        try {
            const mod = await import('puppeteer');
            _puppeteer = mod.default || mod;
        } catch (_esmErr) {
            _puppeteer = require('puppeteer');
        }
    }
    return _puppeteer;
}

const dns = require('dns').promises;
const ipaddr = require('ipaddr.js');

let browser = null;
const tenantSessions = new Map(); // tenantKey -> { context, page, lastActiveAt }

const HOSTNAME_BLOCKLIST = [
    /^localhost$/i,
    /^.*\.localhost$/i,
    /^metadata\.google\.internal$/i,
    /^metadata$/i,
    /^instance-data$/i
];

/**
 * Parses any valid IPv4 or IPv6 string representation into an ipaddr.js address instance.
 * Supports:
 *  - Standard dotted decimal (e.g. 127.0.0.1, 169.254.169.254, 10.0.0.1)
 *  - Single integer decimal representation (e.g. 2130706433, 2852039166, 167772161, 0)
 *  - Single integer hex representation (e.g. 0x7f000001, 0xa9fea9fe)
 *  - Single integer octal representation (e.g. 017700000001)
 *  - Dotted hex (e.g. 0x7f.0.0.1, 0xa9.0xfe.0xa9.0xfe)
 *  - Dotted octal (e.g. 0177.0.0.1, 0251.0376.0251.0376)
 *  - Truncated classful notations (e.g. 127.1, 127.0.1, 0x7f.1)
 *  - IPv6 literals (e.g. ::1, fe80::1, fc00::1)
 *  - IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1, ::ffff:7f00:1, ::ffff:169.254.169.254)
 * Returns null if the input is not an IP address (e.g. domain name).
 */
function parseAnyIpAddress(input) {
    if (!input || typeof input !== 'string') return null;
    let s = input.trim().replace(/^\[|\]$/g, '').toLowerCase();

    // Strip port if formatted as host:port without IPv6 multiple colons
    if (s.includes(':') && !s.includes('::')) {
        const parts = s.split(':');
        if (parts.length === 2 && !parts[0].includes(':') && !parts[1].includes(':')) {
            s = parts[0];
        }
    }

    // Try IPv6
    if (s.includes(':')) {
        try {
            let addr = ipaddr.parse(s);
            if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) {
                addr = addr.toIPv4Address();
            }
            return addr;
        } catch (_e) {
            return null;
        }
    }

    // Single DWORD hex: 0x7f000001
    if (/^0x[0-9a-f]+$/i.test(s)) {
        const num = parseInt(s, 16);
        if (!Number.isNaN(num) && num >= 0 && num <= 0xffffffff) {
            const dotted = [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
            return ipaddr.parse(dotted);
        }
        return null;
    }

    // Single DWORD octal (starts with 0 and all digits <= 7) or decimal
    if (/^\d+$/.test(s)) {
        let num;
        if (s.startsWith('0') && s.length > 1 && !/[89]/.test(s)) {
            num = parseInt(s, 8);
        } else {
            num = parseInt(s, 10);
        }
        if (!Number.isNaN(num) && num >= 0 && num <= 0xffffffff) {
            const dotted = [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
            return ipaddr.parse(dotted);
        }
        return null;
    }

    // Dotted notations: 1 to 4 parts, where parts can be decimal, octal, or hex
    const parts = s.split('.');
    if (parts.length >= 1 && parts.length <= 4 && parts.every(p => p.length > 0)) {
        const parsedParts = [];
        for (const p of parts) {
            let val;
            if (/^0x[0-9a-f]+$/i.test(p)) {
                val = parseInt(p, 16);
            } else if (/^0[0-7]+$/.test(p)) {
                val = parseInt(p, 8);
            } else if (/^\d+$/.test(p)) {
                val = parseInt(p, 10);
            } else {
                return null;
            }
            if (Number.isNaN(val) || val < 0) return null;
            parsedParts.push(val);
        }

        let dotted = null;
        if (parsedParts.length === 4) {
            if (parsedParts.every(v => v <= 255)) {
                dotted = parsedParts.join('.');
            }
        } else if (parsedParts.length === 3) {
            // A.B.C -> C is 16-bit
            if (parsedParts[0] <= 255 && parsedParts[1] <= 255 && parsedParts[2] <= 65535) {
                dotted = [parsedParts[0], parsedParts[1], (parsedParts[2] >>> 8) & 255, parsedParts[2] & 255].join('.');
            }
        } else if (parsedParts.length === 2) {
            // A.B -> B is 24-bit
            if (parsedParts[0] <= 255 && parsedParts[1] <= 0xffffff) {
                dotted = [parsedParts[0], (parsedParts[1] >>> 16) & 255, (parsedParts[1] >>> 8) & 255, parsedParts[1] & 255].join('.');
            }
        } else if (parsedParts.length === 1) {
            if (parsedParts[0] <= 0xffffffff) {
                dotted = [(parsedParts[0] >>> 24) & 255, (parsedParts[0] >>> 16) & 255, (parsedParts[0] >>> 8) & 255, parsedParts[0] & 255].join('.');
            }
        }

        if (dotted) {
            try {
                return ipaddr.parse(dotted);
            } catch (_e) {
                return null;
            }
        }
    }

    return null;
}

/**
 * Classifies an ipaddr.js instance against restricted ranges:
 * Loopback, private RFC1918, link-local, cloud metadata, broadcast, CGNAT, etc.
 */
function classifyIp(addr) {
    if (!addr) return null;
    let target = addr;
    if (target.kind() === 'ipv6' && target.isIPv4MappedAddress()) {
        target = target.toIPv4Address();
    }
    const ipStr = target.toString();
    const range = target.range();

    const isLoopback = range === 'loopback';
    const isLinkLocal = range === 'linkLocal';
    const isPrivate = range === 'private';
    const isUniqueLocal = range === 'uniqueLocal';
    const isCarrierGradeNat = range === 'carrierGradeNat';
    const isUnspecified = range === 'unspecified';
    const isBroadcast = range === 'broadcast';

    // Cloud metadata specific checks (169.254.169.254 or Alibaba 100.100.100.200)
    const isCloudMetadata = ipStr === '169.254.169.254' || ipStr === '100.100.100.200';

    const isRestricted = isLinkLocal || isPrivate || isUniqueLocal || isCarrierGradeNat ||
                         isUnspecified || isBroadcast || isCloudMetadata;

    return {
        ip: ipStr,
        range,
        isLoopback,
        isLinkLocal,
        isPrivate,
        isCloudMetadata,
        isRestricted
    };
}

/**
 * Synchronous SSRF validator.
 * Validates protocol, parses URL, checks blocklisted hostnames and detects IP literals in any representation.
 */
function validateTargetUrlSync(rawUrl, options = {}) {
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

    // Extract raw host before WHATWG URL normalization (e.g. for decimal or octal IPs)
    let rawHost = '';
    const match = rawUrl.trim().match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/?#:]+)/);
    if (match) {
        rawHost = match[1].toLowerCase();
    }

    const hostedMode = process.env.E2EBOT_HOSTED_MODE !== 'false';
    const allowLocalhost = options.allowLocalhost === true || process.env.E2EBOT_ALLOW_LOCALHOST === 'true' || !hostedMode;

    // Check hostname blocklist (localhost, metadata.google.internal, etc.)
    for (const pattern of HOSTNAME_BLOCKLIST) {
        if (pattern.test(hostname) || (rawHost && pattern.test(rawHost))) {
            if (/localhost/i.test(hostname) && allowLocalhost) {
                // Allowed explicitly in local dev mode
                continue;
            }
            return {
                valid: false,
                error: `SSRF Protection: Target host '${hostname}' is restricted (private network or cloud metadata endpoint)`
            };
        }
    }

    // Check if either rawHost or parsed hostname is an IP address in ANY representation
    const parsedIp = parseAnyIpAddress(rawHost) || parseAnyIpAddress(hostname);
    if (parsedIp) {
        const classified = classifyIp(parsedIp);
        if (classified.isLoopback) {
            if (!allowLocalhost) {
                return {
                    valid: false,
                    error: `SSRF Protection: Loopback target '${rawHost || hostname}' (${classified.ip}) is blocked in hosted multi-tenant mode`
                };
            }
            return { valid: true, url: parsed.toString(), hostname, ip: classified.ip, needsDns: false };
        }

        if (classified.isRestricted) {
            return {
                valid: false,
                error: `SSRF Protection: Target host '${rawHost || hostname}' (${classified.ip}) is restricted (${classified.range} / private network or cloud metadata endpoint)`
            };
        }

        return { valid: true, url: parsed.toString(), hostname, ip: classified.ip, needsDns: false };
    }

    return { valid: true, url: parsed.toString(), hostname, needsDns: true };
}

/**
 * SAAS-2 (P0-2 / SEC-02): Strict SSRF Target URL Validator with DNS Resolution.
 * Blocks file://, javascript:, data:, cloud metadata (169.254.169.254), RFC1918 private networks,
 * loopback interfaces (even encoded in decimal, octal, or hex), and hostnames that resolve to restricted IPs via DNS rebinding.
 */
async function validateTargetUrl(rawUrl, options = {}) {
    const syncResult = validateTargetUrlSync(rawUrl, options);
    if (!syncResult.valid) {
        return syncResult;
    }

    // If already validated as IP literal (or if DNS check skipped), return
    if (!syncResult.needsDns || options.skipDns === true) {
        return syncResult;
    }

    const hostname = syncResult.hostname;
    const hostedMode = process.env.E2EBOT_HOSTED_MODE !== 'false';
    const allowLocalhost = options.allowLocalhost === true || process.env.E2EBOT_ALLOW_LOCALHOST === 'true' || !hostedMode;
    const lookupFn = options.dnsResolver || dns.lookup;

    try {
        const records = await lookupFn(hostname, { all: true });
        const addresses = Array.isArray(records) ? records : [records];

        for (const entry of addresses) {
            const ipStr = typeof entry === 'string' ? entry : entry.address;
            const parsedIp = parseAnyIpAddress(ipStr);
            if (!parsedIp) continue;

            const classified = classifyIp(parsedIp);
            if (classified.isLoopback) {
                if (!allowLocalhost) {
                    return {
                        valid: false,
                        error: `SSRF Protection: Hostname '${hostname}' resolved to loopback IP '${classified.ip}' which is blocked in hosted multi-tenant mode`
                    };
                }
            } else if (classified.isRestricted) {
                return {
                    valid: false,
                    error: `SSRF Protection: Hostname '${hostname}' resolved to restricted IP '${classified.ip}' (${classified.range} / private network or cloud metadata endpoint)`
                };
            }
        }

        return { valid: true, url: syncResult.url, hostname };
    } catch (dnsErr) {
        return {
            valid: false,
            error: `SSRF Protection: Unable to resolve hostname '${hostname}' via DNS (${dnsErr.message || 'ENOTFOUND'})`
        };
    }
}

async function initBrowser() {
    if (!browser) {
        const puppeteer = await getPuppeteer();
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
    targetPage.on('request', async (req) => {
        try {
            const reqUrl = req.url();
            // Allow harmless inline data: images/fonts loaded by legitimate pages, but validate all network navigations/subresources
            if (reqUrl.startsWith('data:') && req.resourceType() !== 'document') {
                return req.continue();
            }
            const check = await validateTargetUrl(reqUrl, options);
            if (!check.valid) {
                return req.abort('accessdenied');
            }
            return req.continue();
        } catch (_err) {
            return req.abort('failed');
        }
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
        const urlCheck = await validateTargetUrl(action.url, { allowLocalhost });
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
    validateTargetUrlSync,
    parseAnyIpAddress,
    classifyIp,
    redactSensitiveText,
    isBrowserConnected
};
