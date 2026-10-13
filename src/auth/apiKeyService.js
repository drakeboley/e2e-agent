/**
 * E2EBot — Multi-Tenant API Key, Rate Limiting & Execution Quota Service (SAAS-1 / P0-1)
 * Modeled after Crystal Space Open-Core SaaS Architecture.
 * Incorporates Software Lab (EPIC-SL-ARCH-E2EBOT) & Accounting Lab (SAAS-4) specifications.
 */

const crypto = require('crypto');

const SubscriptionTier = {
    STARTER: 'STARTER',
    COMMUNITY: 'STARTER', // Alias for portfolio compatibility
    PRO: 'PRO',
    AGENCY: 'AGENCY',
    ENTERPRISE: 'ENTERPRISE'
};

const TIER_LIMITS = {
    STARTER: {
        id: 'STARTER',
        name: 'Starter (Community)',
        priceMonthly: 0,
        requestsPerMinute: 20,
        maxRequestsPerMinute: 20,
        monthlyDeployPreviewRuns: 50,
        monthlyDeployRuns: 100,
        monthlyBrowserMinutes: 100,
        maxConcurrentSessions: 1,
        maxSites: 1,
        supportLevel: 'Community'
    },
    COMMUNITY: {
        id: 'STARTER',
        name: 'Starter (Community)',
        priceMonthly: 0,
        requestsPerMinute: 20,
        maxRequestsPerMinute: 20,
        monthlyDeployPreviewRuns: 50,
        monthlyDeployRuns: 100,
        monthlyBrowserMinutes: 100,
        maxConcurrentSessions: 1,
        maxSites: 1,
        supportLevel: 'Community'
    },
    PRO: {
        id: 'PRO',
        name: 'Pro (Growth)',
        priceMonthly: 49,
        requestsPerMinute: 60,
        maxRequestsPerMinute: 60,
        monthlyDeployPreviewRuns: 500,
        monthlyDeployRuns: 500,
        monthlyBrowserMinutes: 1500,
        maxConcurrentSessions: 3,
        maxSites: 5,
        supportLevel: 'Standard Email'
    },
    AGENCY: {
        id: 'AGENCY',
        name: 'Agency (Multi-Site)',
        priceMonthly: 199,
        requestsPerMinute: 180,
        maxRequestsPerMinute: 180,
        monthlyDeployPreviewRuns: 2500,
        monthlyDeployRuns: 2500,
        monthlyBrowserMinutes: 10000,
        maxConcurrentSessions: 10,
        maxSites: 25,
        supportLevel: 'Priority Queue & White-Label'
    },
    ENTERPRISE: {
        id: 'ENTERPRISE',
        name: 'Enterprise Dedicated',
        priceMonthly: 899,
        requestsPerMinute: 600,
        maxRequestsPerMinute: 600,
        monthlyDeployPreviewRuns: 25000,
        monthlyDeployRuns: 25000,
        monthlyBrowserMinutes: 100000,
        maxConcurrentSessions: 50,
        maxSites: 1000,
        supportLevel: 'Dedicated 99.9% SLA & VPC'
    }
};

function sha256(input) {
    return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function normalizeTier(tier) {
    const upper = String(tier || 'STARTER').toUpperCase();
    if (upper === 'COMMUNITY') return 'STARTER';
    return TIER_LIMITS[upper] ? upper : 'STARTER';
}

class ApiKeyService {
    constructor() {
        this.keysByHash = new Map();
        this.requestTimestamps = new Map(); // keyId -> number[] for 60s sliding window

        // Mint a default Software Lab development key for out-of-the-box evaluation
        this.createKey({
            tenantId: 'tenant:software_lab',
            name: 'Default Lab Dev Runner Key',
            tier: SubscriptionTier.PRO,
            secretOverride: 'e2e_live_dev_lab_key_1234567890abcdef'
        });

        // Preserve backward compatibility with legacy E2EBOT_API_KEY if configured in environment
        if (process.env.E2EBOT_API_KEY) {
            this.createKey({
                tenantId: 'tenant:env_configured',
                name: 'Environment Configured Primary Key',
                tier: SubscriptionTier.ENTERPRISE,
                secretOverride: process.env.E2EBOT_API_KEY
            });
        }
    }

    /**
     * Mint a new SHA-256 hashed e2e_live_<48-hex-chars> API key scoped to a tenantId and tier.
     * Plaintext secret is returned ONLY once on creation and never stored at rest.
     */
    createKey(params = {}) {
        const tier = normalizeTier(params.tier);
        const tenantId = params.tenantId || `tenant_${crypto.randomBytes(6).toString('hex')}`;
        const name = params.name || `${tier} Runner Key`;
        const rawSecret = params.secretOverride || `e2e_live_${crypto.randomBytes(24).toString('hex')}`;
        const keyHash = sha256(rawSecret);
        const keyPrefix = rawSecret.slice(0, 15) + '...';

        const apiKey = {
            id: `key_${crypto.randomBytes(8).toString('hex')}`,
            name,
            keyPrefix,
            keyHash,
            tenantId,
            tier,
            status: 'ACTIVE',
            stripeCustomerId: params.stripeCustomerId || null,
            stripeSubscriptionId: params.stripeSubscriptionId || null,
            requestsUsed: 0,
            deployRunsUsed: 0,
            browserMinutesUsed: 0,
            billingCycleStart: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            lastUsedAt: null,
            active: true
        };

        this.keysByHash.set(keyHash, apiKey);
        return { apiKey, rawSecret };
    }

    /**
     * Validate a raw Bearer/API key using constant-time SHA-256 comparison,
     * enforce sliding-window rate limits, and verify monthly execution quotas.
     */
    validateKey(rawSecret, options = { checkExecutionQuota: false }) {
        if (!rawSecret || typeof rawSecret !== 'string') {
            return { valid: false, statusCode: 401, error: 'Missing API Key' };
        }

        const computedHash = sha256(rawSecret.trim());
        const computedBuf = Buffer.from(computedHash, 'hex');

        let matchedKey = null;
        for (const [storedHash, candidate] of this.keysByHash.entries()) {
            const storedBuf = Buffer.from(storedHash, 'hex');
            if (storedBuf.length === computedBuf.length && crypto.timingSafeEqual(computedBuf, storedBuf)) {
                matchedKey = candidate;
                break;
            }
        }

        if (!matchedKey) {
            return { valid: false, statusCode: 401, error: 'Invalid API Key' };
        }
        if (!matchedKey.active || matchedKey.status !== 'ACTIVE') {
            return {
                valid: false,
                statusCode: 403,
                error: 'API Key is suspended or revoked due to subscription status'
            };
        }

        const limits = TIER_LIMITS[matchedKey.tier] || TIER_LIMITS.STARTER;

        // 1. Sliding 60-second window rate limit check
        const now = Date.now();
        const timestamps = this.requestTimestamps.get(matchedKey.id) || [];
        const validTimestamps = timestamps.filter(t => now - t < 60000);

        if (validTimestamps.length >= limits.requestsPerMinute) {
            this.requestTimestamps.set(matchedKey.id, validTimestamps);
            return {
                valid: false,
                statusCode: 429,
                error: `Rate limit exceeded (${limits.requestsPerMinute} req/min for ${matchedKey.tier} tier)`
            };
        }

        // 2. Monthly execution quota check (when invoking browser / Cypress runs)
        if (options.checkExecutionQuota) {
            if (matchedKey.deployRunsUsed >= limits.monthlyDeployPreviewRuns) {
                return {
                    valid: false,
                    statusCode: 402,
                    error: `Quota Exceeded: Monthly deploy preview run limit reached (${matchedKey.deployRunsUsed}/${limits.monthlyDeployPreviewRuns} runs on ${matchedKey.tier} tier)`
                };
            }
            if (matchedKey.browserMinutesUsed >= limits.monthlyBrowserMinutes) {
                return {
                    valid: false,
                    statusCode: 402,
                    error: `Quota Exceeded: Monthly browser execution minutes limit reached (${matchedKey.browserMinutesUsed.toFixed(2)}/${limits.monthlyBrowserMinutes} mins on ${matchedKey.tier} tier)`
                };
            }
        }

        validTimestamps.push(now);
        this.requestTimestamps.set(matchedKey.id, validTimestamps);

        matchedKey.requestsUsed += 1;
        matchedKey.lastUsedAt = new Date().toISOString();

        return { valid: true, statusCode: 200, apiKey: matchedKey, limits };
    }

    /**
     * Meter deploy preview runs and browser execution minutes against the tenant's active key.
     */
    recordUsage(apiKeyOrId, { deployPreviewRuns = 1, durationMs = 0, browserMinutes } = {}) {
        let key = null;
        if (apiKeyOrId && typeof apiKeyOrId === 'object' && apiKeyOrId.keyHash) {
            key = this.keysByHash.get(apiKeyOrId.keyHash);
        } else if (typeof apiKeyOrId === 'string') {
            for (const candidate of this.keysByHash.values()) {
                if (candidate.id === apiKeyOrId || candidate.tenantId === apiKeyOrId) {
                    key = candidate;
                    break;
                }
            }
        }
        if (!key) return null;

        key.deployRunsUsed += Number(deployPreviewRuns) || 0;
        const addedMinutes = typeof browserMinutes === 'number'
            ? browserMinutes
            : Math.max(0.01, (Number(durationMs) || 500) / 60000);
        key.browserMinutesUsed = Number((key.browserMinutesUsed + addedMinutes).toFixed(4));
        key.lastUsedAt = new Date().toISOString();
        return key;
    }

    /**
     * Alias for recordUsage
     */
    recordExecutionUsage(apiKeyOrId, params = {}) {
        return this.recordUsage(apiKeyOrId, {
            deployPreviewRuns: params.deployRuns ?? params.deployPreviewRuns ?? 1,
            durationMs: params.durationMs,
            browserMinutes: params.browserMinutes
        });
    }

    /**
     * Synchronize tenant subscription tier or active state from Stripe webhook events.
     */
    updateTenantSubscription({ tenantId, stripeCustomerId, stripeSubscriptionId, tier, active, status }) {
        const updatedKeys = [];
        for (const key of this.keysByHash.values()) {
            const matchesTenant = tenantId && key.tenantId === tenantId;
            const matchesCustomer = stripeCustomerId && key.stripeCustomerId === stripeCustomerId;
            const matchesSub = stripeSubscriptionId && key.stripeSubscriptionId === stripeSubscriptionId;

            if (matchesTenant || matchesCustomer || matchesSub) {
                if (tier) key.tier = normalizeTier(tier);
                if (typeof active === 'boolean') {
                    key.active = active;
                    key.status = active ? 'ACTIVE' : (status || 'REVOKED');
                }
                if (status) key.status = status;
                if (stripeCustomerId) key.stripeCustomerId = stripeCustomerId;
                if (stripeSubscriptionId) key.stripeSubscriptionId = stripeSubscriptionId;
                updatedKeys.push(key);
            }
        }
        return updatedKeys;
    }

    revokeKey(keyId, tenantId) {
        for (const key of this.keysByHash.values()) {
            if (key.id === keyId && (!tenantId || tenantId === 'public' || key.tenantId === tenantId)) {
                key.active = false;
                key.status = 'REVOKED';
                return key;
            }
        }
        return null;
    }

    listKeys(tenantId) {
        const all = Array.from(this.keysByHash.values());
        const filtered = (!tenantId || tenantId === 'public')
            ? all
            : all.filter(k => k.tenantId === tenantId);

        return filtered.map(k => ({
            ...k,
            limits: TIER_LIMITS[k.tier] || TIER_LIMITS.STARTER
        }));
    }

    getTenantTelemetry(tenantId) {
        const keys = this.listKeys(tenantId);
        const primaryTier = keys[0]?.tier || SubscriptionTier.STARTER;
        const limits = TIER_LIMITS[primaryTier] || TIER_LIMITS.STARTER;
        const totals = keys.reduce(
            (acc, k) => {
                acc.requestsUsed += k.requestsUsed;
                acc.deployRunsUsed += k.deployRunsUsed;
                acc.browserMinutesUsed = Number((acc.browserMinutesUsed + k.browserMinutesUsed).toFixed(4));
                return acc;
            },
            { requestsUsed: 0, deployRunsUsed: 0, browserMinutesUsed: 0 }
        );

        return {
            tenantId: tenantId || 'public',
            tier: primaryTier,
            limits,
            usage: totals,
            activeKeys: keys.filter(k => k.active).length
        };
    }

    getTierInfo(tier) {
        return TIER_LIMITS[normalizeTier(tier)];
    }
}

const defaultApiKeyService = new ApiKeyService();

module.exports = {
    SubscriptionTier,
    TIER_LIMITS,
    ApiKeyService,
    defaultApiKeyService,
    sha256,
    normalizeTier
};
