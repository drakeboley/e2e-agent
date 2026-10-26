const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { app } = require('../server');
const {
    createCheckoutSession,
    createCustomerPortalSession,
    handleStripeWebhookEvent,
    verifyStripeSignatureStrict,
    getFiduciaryAuditLedger
} = require('../src/auth/stripeService');
const { SubscriptionTier, defaultApiKeyService } = require('../src/auth/apiKeyService');

describe('Stripe Billing & Dynamic Payment Methods Audit', () => {
    let testServer;
    let baseUrl;

    before((t, done) => {
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

    it('createCheckoutSession enforces California ARL affirmative consent', async () => {
        await assert.rejects(
            async () => {
                await createCheckoutSession({
                    tier: SubscriptionTier.PRO,
                    customerEmail: 'test@example.com',
                    arlConsent: false
                });
            },
            /California ARL Compliance/
        );
    });

    it('createCheckoutSession rejects Starter tier ($0/mo)', async () => {
        await assert.rejects(
            async () => {
                await createCheckoutSession({
                    tier: SubscriptionTier.STARTER,
                    arlConsent: true
                });
            },
            /Starter.*does not require a paid Stripe checkout session/
        );
    });

    it('createCheckoutSession creates session without deprecated payment_method_types (Dynamic Payment Methods)', async () => {
        const session = await createCheckoutSession({
            tier: SubscriptionTier.PRO,
            customerEmail: 'pro-user@example.com',
            arlConsent: true,
            successUrl: 'https://e2e-agent.com/?billing_status=success',
            cancelUrl: 'https://e2e-agent.com/?billing_status=cancelled'
        });

        assert.ok(session.sessionId, 'Session should have a sessionId');
        assert.ok(session.url, 'Session should return a valid checkout URL');
        assert.strictEqual(session.tier, 'PRO');
        assert.strictEqual(session.priceMonthly, 49);
        assert.strictEqual(session.arlConsentVerified, true);
    });

    it('POST /api/billing/create-checkout-session returns 200 with checkout URL', async () => {
        const res = await fetch(`${baseUrl}/api/billing/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tier: 'ENTERPRISE',
                email: 'lead@enterprise.com',
                arlConsent: true
            })
        });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.strictEqual(data.tier, 'ENTERPRISE');
        assert.strictEqual(data.priceMonthly, 899);
        assert.ok(data.url.includes('session_id='));
    });

    it('POST /api/billing/create-checkout-session rejects unconsented request with 400', async () => {
        const res = await fetch(`${baseUrl}/api/billing/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tier: 'PRO',
                email: 'test@example.com',
                arlConsent: false
            })
        });

        assert.strictEqual(res.status, 400);
        const data = await res.json();
        assert.strictEqual(data.success, false);
        assert.match(data.error, /California ARL Compliance/);
    });

    it('POST /api/billing/webhook rejects requests missing stripe-signature header', async () => {
        const res = await fetch(`${baseUrl}/api/billing/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'test' })
        });

        assert.strictEqual(res.status, 400);
        const data = await res.json();
        assert.strictEqual(data.success, false);
        assert.match(data.error, /Missing stripe-signature header/);
    });

    it('handleStripeWebhookEvent performs strict HMAC-SHA256 signature verification', async () => {
        const secret = 'whsec_test_secret_abc123';
        process.env.STRIPE_WEBHOOK_SECRET = secret;

        const payload = JSON.stringify({
            id: 'evt_test_checkout_' + Date.now(),
            type: 'checkout.session.completed',
            data: {
                object: {
                    customer: 'cus_test_123',
                    subscription: 'sub_test_123',
                    metadata: {
                        tenantId: 'tenant:test_webhook',
                        tier: 'AGENCY'
                    }
                }
            }
        });
        const rawBuffer = Buffer.from(payload, 'utf8');
        const timestamp = Math.floor(Date.now() / 1000);
        const signedPayload = `${timestamp}.${payload}`;
        const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
        const header = `t=${timestamp},v1=${signature}`;

        // Verify valid signature
        const result = await handleStripeWebhookEvent(rawBuffer, header);
        assert.strictEqual(result.received, true);
        assert.strictEqual(result.action, 'PROVISIONED');

        // Test idempotency: second call with same event id is a duplicate
        const dupResult = await handleStripeWebhookEvent(rawBuffer, header);
        assert.strictEqual(dupResult.received, true);
        assert.strictEqual(dupResult.duplicate, true);

        // Test forged signature rejection
        const badHeader = `t=${timestamp},v1=badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbad`;
        await assert.rejects(
            async () => {
                await handleStripeWebhookEvent(rawBuffer, badHeader);
            },
            /HMAC-SHA256 signature verification failed/
        );
    });
});
