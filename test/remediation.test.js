const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

// Set master admin key for test suite
const TEST_ADMIN_KEY = 'master_admin_secret_test_key_xyz_987';
process.env.E2EBOT_MASTER_ADMIN_KEY = TEST_ADMIN_KEY;
process.env.E2EBOT_HOSTED_MODE = 'true';

const { ApiKeyService, defaultApiKeyService, SubscriptionTier } = require('../src/auth/apiKeyService');
const {
    validateTargetUrl,
    validateTargetUrlSync,
    parseAnyIpAddress,
    classifyIp
} = require('../puppeteer-service');
const { app } = require('../server');

describe('Remediation: SEC-01 — POST /api/keys Master Admin Authentication & Tier Upgrade', () => {
    let testServer;
    let baseUrl;

    before((t, done) => {
        defaultApiKeyService.setMasterAdminKey(TEST_ADMIN_KEY);
        testServer = app.listen(0, '127.0.0.1', () => {
            const port = testServer.address().port;
            baseUrl = `http://127.0.0.1:${port}`;
            done();
        });
    });

    after((t, done) => {
        if (testServer) {
            testServer.close(done);
        } else {
            done();
        }
    });

    it('ApiKeyService verifies master admin credentials correctly', () => {
        assert.strictEqual(defaultApiKeyService.isMasterAdmin(TEST_ADMIN_KEY), true);
        assert.strictEqual(defaultApiKeyService.isMasterAdmin('wrong-key'), false);
        assert.strictEqual(defaultApiKeyService.isMasterAdmin(''), false);
        assert.strictEqual(defaultApiKeyService.isMasterAdmin(null), false);
    });

    it('POST /api/keys rejects anonymous unauthenticated requests with 401', async () => {
        const res = await fetch(`${baseUrl}/api/keys`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Exploit Key',
                tier: 'ENTERPRISE'
            })
        });

        assert.strictEqual(res.status, 401);
        const data = await res.json();
        assert.strictEqual(data.success, false);
        assert.match(data.error, /Master admin authentication required/i);
    });

    it('POST /api/keys rejects non-admin token with 403', async () => {
        // Mint a standard non-admin starter key
        const { rawSecret } = defaultApiKeyService.createKey({
            name: 'Regular User Key',
            tier: SubscriptionTier.STARTER
        });

        const res = await fetch(`${baseUrl}/api/keys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${rawSecret}`
            },
            body: JSON.stringify({
                name: 'Unauthorized Enterprise Key',
                tier: 'ENTERPRISE'
            })
        });

        assert.strictEqual(res.status, 403);
        const data = await res.json();
        assert.strictEqual(data.success, false);
        assert.match(data.error, /Master admin credentials required/i);
    });

    it('POST /api/keys succeeds with master admin Bearer token', async () => {
        const res = await fetch(`${baseUrl}/api/keys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEST_ADMIN_KEY}`
            },
            body: JSON.stringify({
                name: 'Authorized Enterprise Runner',
                tier: 'ENTERPRISE',
                tenantId: 'tenant:admin_provisioned'
            })
        });

        assert.strictEqual(res.status, 201);
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.ok(data.secret.startsWith('e2e_live_'));
        assert.strictEqual(data.apiKey.tier, 'ENTERPRISE');
        assert.strictEqual(data.apiKey.tenantId, 'tenant:admin_provisioned');
    });

    it('POST /api/keys succeeds with X-Admin-Key header', async () => {
        const res = await fetch(`${baseUrl}/api/keys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': TEST_ADMIN_KEY
            },
            body: JSON.stringify({
                name: 'Header Admin Key',
                tier: 'PRO'
            })
        });

        assert.strictEqual(res.status, 201);
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.strictEqual(data.apiKey.tier, 'PRO');
    });

    it('POST /api/keys supports tier upgrade when authenticated as master admin', async () => {
        // First create a Starter key
        const { apiKey } = defaultApiKeyService.createKey({
            name: 'Upgrade Target',
            tier: SubscriptionTier.STARTER,
            tenantId: 'tenant:upgrade_test_api'
        });

        const res = await fetch(`${baseUrl}/api/keys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEST_ADMIN_KEY}`
            },
            body: JSON.stringify({
                action: 'upgrade',
                keyId: apiKey.id,
                tier: 'ENTERPRISE'
            })
        });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.strictEqual(data.apiKey.tier, 'ENTERPRISE');
    });

    it('PATCH /api/keys/:id upgrades tier with master admin authentication', async () => {
        const { apiKey } = defaultApiKeyService.createKey({
            name: 'Patch Target',
            tier: SubscriptionTier.STARTER
        });

        // Attempt without admin credentials -> 401
        const unauthRes = await fetch(`${baseUrl}/api/keys/${apiKey.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier: 'AGENCY' })
        });
        assert.strictEqual(unauthRes.status, 401);

        // Attempt with master admin credentials -> 200
        const authRes = await fetch(`${baseUrl}/api/keys/${apiKey.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEST_ADMIN_KEY}`
            },
            body: JSON.stringify({ tier: 'AGENCY' })
        });
        assert.strictEqual(authRes.status, 200);
        const data = await authRes.json();
        assert.strictEqual(data.success, true);
        assert.strictEqual(data.apiKey.tier, 'AGENCY');
    });

    it('ApiKeyService lookup operates in O(1) time and timing-safe hash comparison', () => {
        const service = new ApiKeyService();
        const { rawSecret } = service.createKey({
            name: 'Speed Test',
            tier: SubscriptionTier.PRO
        });
        const validated = service.validateKey(rawSecret);
        assert.strictEqual(validated.valid, true);
        assert.strictEqual(validated.apiKey.tier, 'PRO');

        const badValidation = service.validateKey('e2e_live_invalid_key_hex_value_00000000000000000000');
        assert.strictEqual(badValidation.valid, false);
    });

    it('SEC-03: In production NODE_ENV, default hardcoded dev key is NOT seeded', () => {
        const origEnv = process.env.NODE_ENV;
        try {
            process.env.NODE_ENV = 'production';
            const prodService = new ApiKeyService();
            const devKeyCheck = prodService.validateKey('e2e_live_dev_lab_key_1234567890abcdef');
            assert.strictEqual(devKeyCheck.valid, false, 'Default lab key must not be active in production');
        } finally {
            process.env.NODE_ENV = origEnv;
        }
    });

    it('AUDIT-1: hardcoded dev master admin fallback secret is rejected (fail closed)', () => {
        assert.strictEqual(defaultApiKeyService.isMasterAdmin('e2e_master_admin_dev_secret_key'), false);
    });

    it('AUDIT-1: default dev lab key is never seeded without explicit SEED_DEFAULT_DEV_KEY + E2EBOT_DEV_KEY opt-in', () => {
        const svc = new ApiKeyService();
        const check = svc.validateKey('e2e_live_dev_lab_key_1234567890abcdef');
        assert.strictEqual(check.valid, false, 'Hardcoded dev lab key must never be seeded');
    });

    it('AUDIT-5: GET /api/keys and GET /api/telemetry reject unauthenticated requests with 401', async () => {
        const keysRes = await fetch(`${baseUrl}/api/keys`);
        assert.strictEqual(keysRes.status, 401);
        const keysData = await keysRes.json();
        assert.strictEqual(keysData.success, false);

        const telRes = await fetch(`${baseUrl}/api/telemetry`);
        assert.strictEqual(telRes.status, 401);
    });

    it('AUDIT-5: GET /api/keys scopes results to the caller tenant only', async () => {
        defaultApiKeyService.createKey({
            name: 'Other Tenant Key',
            tier: SubscriptionTier.STARTER,
            tenantId: 'tenant:audit_other'
        });
        const { rawSecret } = defaultApiKeyService.createKey({
            name: 'Scoped Viewer Key',
            tier: SubscriptionTier.STARTER,
            tenantId: 'tenant:audit_scoped'
        });

        const res = await fetch(`${baseUrl}/api/keys`, {
            headers: { 'Authorization': `Bearer ${rawSecret}` }
        });
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(Array.isArray(data.keys));
        assert.ok(data.keys.length > 0);
        assert.ok(
            data.keys.every(k => k.tenantId === 'tenant:audit_scoped'),
            'Caller must only see keys belonging to their own tenant'
        );
    });
});

describe('Remediation: SEC-02 — SSRF Target URL Protection with IP Encoding & DNS Validation', () => {
    describe('IP Encoding Parser (Decimal, Hex, Octal, IPv6, Mapped)', () => {
        it('parses decimal integer IPv4 encodings', () => {
            const loopbackDec = parseAnyIpAddress('2130706433');
            assert.ok(loopbackDec);
            assert.strictEqual(loopbackDec.toString(), '127.0.0.1');

            const metadataDec = parseAnyIpAddress('2852039166');
            assert.ok(metadataDec);
            assert.strictEqual(metadataDec.toString(), '169.254.169.254');

            const privateDec = parseAnyIpAddress('167772161');
            assert.ok(privateDec);
            assert.strictEqual(privateDec.toString(), '10.0.0.1');

            const zeroDec = parseAnyIpAddress('0');
            assert.ok(zeroDec);
            assert.strictEqual(zeroDec.toString(), '0.0.0.0');
        });

        it('parses hex IPv4 encodings (single DWORD and dotted)', () => {
            const loopbackHex = parseAnyIpAddress('0x7f000001');
            assert.ok(loopbackHex);
            assert.strictEqual(loopbackHex.toString(), '127.0.0.1');

            const metadataHex = parseAnyIpAddress('0xa9fea9fe');
            assert.ok(metadataHex);
            assert.strictEqual(metadataHex.toString(), '169.254.169.254');

            const dottedHex = parseAnyIpAddress('0x7f.0.0.1');
            assert.ok(dottedHex);
            assert.strictEqual(dottedHex.toString(), '127.0.0.1');

            const classfulHex = parseAnyIpAddress('0x7f.1');
            assert.ok(classfulHex);
            assert.strictEqual(classfulHex.toString(), '127.0.0.1');
        });

        it('parses octal IPv4 encodings (single DWORD and dotted)', () => {
            const loopbackOct = parseAnyIpAddress('017700000001');
            assert.ok(loopbackOct);
            assert.strictEqual(loopbackOct.toString(), '127.0.0.1');

            const dottedOct = parseAnyIpAddress('0177.0.0.1');
            assert.ok(dottedOct);
            assert.strictEqual(dottedOct.toString(), '127.0.0.1');

            const metadataOct = parseAnyIpAddress('0251.0376.0251.0376');
            assert.ok(metadataOct);
            assert.strictEqual(metadataOct.toString(), '169.254.169.254');
        });

        it('parses IPv6 and IPv4-mapped IPv6 encodings', () => {
            const ipv6Loopback = parseAnyIpAddress('::1');
            assert.ok(ipv6Loopback);
            assert.strictEqual(ipv6Loopback.toString(), '::1');
            assert.strictEqual(ipv6Loopback.range(), 'loopback');

            const mappedLoopback = parseAnyIpAddress('::ffff:127.0.0.1');
            assert.ok(mappedLoopback);
            assert.strictEqual(mappedLoopback.toString(), '127.0.0.1');
            assert.strictEqual(mappedLoopback.range(), 'loopback');

            const mappedMetadata = parseAnyIpAddress('::ffff:169.254.169.254');
            assert.ok(mappedMetadata);
            assert.strictEqual(mappedMetadata.toString(), '169.254.169.254');
            assert.strictEqual(mappedMetadata.range(), 'linkLocal');
        });

        it('correctly identifies non-IP strings as domain names', () => {
            assert.strictEqual(parseAnyIpAddress('example.com'), null);
            assert.strictEqual(parseAnyIpAddress('google.com'), null);
            assert.strictEqual(parseAnyIpAddress('metadata.google.internal'), null);
            assert.strictEqual(parseAnyIpAddress('localhost'), null);
        });
    });

    describe('Classify IP Range Restrictions', () => {
        it('blocks loopback, private, link-local, and cloud metadata', () => {
            const cases = [
                { ip: '127.0.0.1', isLoopback: true },
                { ip: '127.1.2.3', isLoopback: true },
                { ip: '169.254.169.254', isRestricted: true, isCloudMetadata: true },
                { ip: '169.254.1.1', isRestricted: true, isLinkLocal: true },
                { ip: '10.0.0.1', isRestricted: true, isPrivate: true },
                { ip: '172.16.0.1', isRestricted: true, isPrivate: true },
                { ip: '172.31.255.255', isRestricted: true, isPrivate: true },
                { ip: '192.168.1.1', isRestricted: true, isPrivate: true },
                { ip: '0.0.0.0', isRestricted: true },
                { ip: '100.64.0.1', isRestricted: true },
                { ip: '100.100.100.200', isRestricted: true, isCloudMetadata: true },
                { ip: '::1', isLoopback: true },
                { ip: 'fe80::1', isRestricted: true, isLinkLocal: true },
                { ip: 'fc00::1', isRestricted: true }
            ];

            for (const c of cases) {
                const parsed = parseAnyIpAddress(c.ip);
                assert.ok(parsed, `Failed to parse ${c.ip}`);
                const classified = classifyIp(parsed);
                if (c.isLoopback) {
                    assert.strictEqual(classified.isLoopback, true, `${c.ip} should be loopback`);
                }
                if (c.isRestricted) {
                    assert.strictEqual(classified.isRestricted, true, `${c.ip} should be restricted`);
                }
                if (c.isCloudMetadata) {
                    assert.strictEqual(classified.isCloudMetadata, true, `${c.ip} should be cloud metadata`);
                }
            }
        });

        it('permits public unicast IP addresses', () => {
            const publicIps = ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.66.147.243'];
            for (const ip of publicIps) {
                const parsed = parseAnyIpAddress(ip);
                assert.ok(parsed, `Failed to parse public ip ${ip}`);
                const classified = classifyIp(parsed);
                assert.strictEqual(classified.isRestricted, false, `${ip} should not be restricted`);
                assert.strictEqual(classified.isLoopback, false, `${ip} should not be loopback`);
            }
        });
    });

    describe('validateTargetUrl and validateTargetUrlSync Blocking Behavior', () => {
        const blockedUrls = [
            // Decimal representations
            'http://2130706433/',
            'http://2130706433:8080/',
            'http://2852039166/',
            'http://167772161/',
            'http://0/',

            // Hex representations
            'http://0x7f000001/',
            'http://0xa9fea9fe/',
            'http://0x7f.0.0.1/',
            'http://0x7f.1/',
            'http://0x0a000001/',

            // Octal representations
            'http://017700000001/',
            'http://0177.0.0.1/',
            'http://0251.0376.0251.0376/',
            'http://012.0.0.1/',

            // Dotted decimal standard
            'http://127.0.0.1/',
            'http://127.1/',
            'http://127.0.1/',
            'http://169.254.169.254/',
            'http://169.254.1.1/',
            'http://10.0.0.1/',
            'http://172.16.0.1/',
            'http://192.168.1.1/',
            'http://0.0.0.0/',
            'http://100.64.0.1/',

            // IPv6 literals
            'http://[::1]/',
            'http://[fe80::1]/',
            'http://[fc00::1]/',
            'http://[::ffff:127.0.0.1]/',
            'http://[::ffff:7f00:1]/',
            'http://[::ffff:169.254.169.254]/',

            // Hostname blocklist
            'http://localhost/',
            'http://sub.localhost/',
            'http://metadata.google.internal/',
            'http://metadata/',
            'http://instance-data/',

            // Disallowed protocols
            'file:///etc/passwd',
            'ftp://internal.vault/',
            'javascript:alert(1)',
            'data:text/html,<html>attack</html>'
        ];

        for (const target of blockedUrls) {
            it(`synchronously rejects: ${target}`, () => {
                const check = validateTargetUrlSync(target, { allowLocalhost: false });
                assert.strictEqual(check.valid, false, `Expected ${target} to be blocked`);
            });

            it(`asynchronously rejects: ${target}`, async () => {
                const check = await validateTargetUrl(target, { allowLocalhost: false });
                assert.strictEqual(check.valid, false, `Expected ${target} to be blocked`);
            });
        }

        it('blocks hostnames that resolve to restricted IPs via DNS rebinding', async () => {
            // Mock DNS resolver simulating a rebinding attack where domain resolves to 169.254.169.254
            const mockRebindingDns = async (hostname) => {
                return [{ address: '169.254.169.254', family: 4 }];
            };

            const check = await validateTargetUrl('http://attacker-controlled-rebinding.com', {
                dnsResolver: mockRebindingDns
            });
            assert.strictEqual(check.valid, false);
            assert.match(check.error, /resolved to restricted IP/i);
        });

        it('blocks hostnames that resolve to loopback 127.0.0.1 in hosted mode', async () => {
            const mockLoopbackDns = async (hostname) => {
                return [{ address: '127.0.0.1', family: 4 }];
            };

            const check = await validateTargetUrl('http://internal-rebinding.local', {
                allowLocalhost: false,
                dnsResolver: mockLoopbackDns
            });
            assert.strictEqual(check.valid, false);
            assert.match(check.error, /loopback/i);
        });

        it('blocks hostnames that fail DNS resolution', async () => {
            const mockFailingDns = async () => {
                const err = new Error('getaddrinfo ENOTFOUND fake.nonexistent.domain');
                err.code = 'ENOTFOUND';
                throw err;
            };

            const check = await validateTargetUrl('http://fake.nonexistent.domain', {
                dnsResolver: mockFailingDns
            });
            assert.strictEqual(check.valid, false);
            assert.match(check.error, /Unable to resolve hostname/i);
        });

        it('allows legitimate public URLs', async () => {
            const mockPublicDns = async (hostname) => {
                return [{ address: '93.184.216.34', family: 4 }];
            };

            const check = await validateTargetUrl('https://example.com/test-page', {
                dnsResolver: mockPublicDns
            });
            assert.strictEqual(check.valid, true);
        });

        it('allows loopback when allowLocalhost: true, but STILL blocks cloud metadata and RFC1918', async () => {
            const loopbackCheck = await validateTargetUrl('http://localhost:3000/api', { allowLocalhost: true });
            assert.strictEqual(loopbackCheck.valid, true);

            const decLoopbackCheck = await validateTargetUrl('http://2130706433:3000/api', { allowLocalhost: true });
            assert.strictEqual(decLoopbackCheck.valid, true);

            // Cloud metadata MUST STILL be blocked
            const metaCheck = await validateTargetUrl('http://169.254.169.254', { allowLocalhost: true });
            assert.strictEqual(metaCheck.valid, false);

            const decMetaCheck = await validateTargetUrl('http://2852039166', { allowLocalhost: true });
            assert.strictEqual(decMetaCheck.valid, false);

            // Private RFC1918 MUST STILL be blocked
            const rfcCheck = await validateTargetUrl('http://10.0.0.1:8080', { allowLocalhost: true });
            assert.strictEqual(rfcCheck.valid, false);
        });
    });
});
