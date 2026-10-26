let _cypress = null;
function getCypress() {
    if (!_cypress) {
        _cypress = require('cypress');
    }
    return _cypress;
}
const path = require('path');
const { validateTargetUrl } = require('./puppeteer-service');

const E2E_ROOT = path.resolve(__dirname, 'cypress', 'e2e');
const SPEC_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * SAAS-3 (P0-3): Strict Cypress spec name sanitization against path traversal.
 */
function sanitizeSpecName(specName) {
    if (!specName) return undefined;
    if (typeof specName !== 'string') {
        throw new Error('Invalid spec name: must be a string');
    }
    const trimmed = specName.trim().replace(/\.cy\.(js|ts|jsx|tsx)$/i, '');
    if (
        !trimmed ||
        trimmed.includes('..') ||
        trimmed.includes('/') ||
        trimmed.includes('\\') ||
        trimmed.includes('\0') ||
        !SPEC_NAME_REGEX.test(trimmed)
    ) {
        throw new Error(`Security Violation (SAAS-3): Invalid or disallowed Cypress spec name '${specName}'. Only alphanumeric, underscore, and hyphen characters are permitted.`);
    }

    const resolvedPath = path.resolve(E2E_ROOT, `${trimmed}.cy.js`);
    if (!resolvedPath.startsWith(E2E_ROOT + path.sep)) {
        throw new Error(`Security Violation (SAAS-3): Path traversal detected in Cypress spec '${specName}'.`);
    }

    return `cypress/e2e/${trimmed}.cy.js`;
}

async function runSpec(specName, options = {}) {
    const safeSpec = sanitizeSpecName(specName);

    if (options.baseUrl) {
        const urlCheck = await validateTargetUrl(options.baseUrl, {
            allowLocalhost: options.allowLocalhost
        });
        if (!urlCheck.valid) {
            throw new Error(`SSRF Protection (SAAS-2/SAAS-3): Blocked Cypress baseUrl — ${urlCheck.error}`);
        }
    }

    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const startTime = Date.now();
    try {
        console.error(`[E2EBot Cypress] Running spec: ${safeSpec || 'all'} (tenant: ${options.tenantId || 'public'}) with baseUrl: ${options.baseUrl || 'default'}`);
        process.stdout.write = process.stderr.write.bind(process.stderr);

        const runConfig = {
            spec: safeSpec,
            quiet: true,
            config: {},
            env: {
                ...(options.env || {}),
                E2EBOT_TENANT_ID: options.tenantId || 'public'
            }
        };

        if (options.baseUrl) {
            runConfig.config.baseUrl = options.baseUrl;
        }

        const cypress = getCypress();
        const results = await cypress.run(runConfig);
        return {
            ...results,
            durationMs: Date.now() - startTime,
            tenantId: options.tenantId || 'public'
        };
    } catch (error) {
        console.error('Cypress run failed:', error);
        throw error;
    } finally {
        process.stdout.write = originalStdoutWrite;
    }
}

module.exports = {
    runSpec,
    sanitizeSpecName
};
