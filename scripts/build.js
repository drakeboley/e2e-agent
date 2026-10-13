const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Ensure output directories exist
const dirsToCreate = [
    distDir,
    path.join(distDir, 'privacy'),
    path.join(distDir, 'terms'),
    path.join(distDir, 'api')
];

for (const dir of dirsToCreate) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// 1. Render Portal HTML (index.html)
let portalModule;
try {
    portalModule = require('../src/gui/portalHtml');
} catch (_e) {
    portalModule = require('../../enterprise-picard/deliverables/e2ebot/src/gui/portalHtml');
}
const { renderPortalHtml, EPHEMERAL_EXECUTION_COVENANT } = portalModule;
fs.writeFileSync(path.join(distDir, 'index.html'), renderPortalHtml(), 'utf8');

// 2. Privacy Policy (privacy/index.html)
const privacyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy &amp; Ephemeral Browser Covenant — E2EBot Cloud</title>
  <style>
    body { background: #070b14; color: #f1f5f9; font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 880px; margin: 2rem auto; padding: 2rem; line-height: 1.65; }
    h1, h2 { color: #38bdf8; margin-top: 1.5rem; margin-bottom: 0.75rem; }
    blockquote { background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; padding: 1rem; margin: 1.5rem 0; border-radius: 6px; }
    a { color: #38bdf8; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul { margin: 1rem 0 1rem 1.5rem; }
    code { background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>E2EBot Cloud: Privacy Policy &amp; Ephemeral Browser Execution Covenant</h1>
  <p><strong>Effective Date:</strong> October 12, 2026 | <strong>Entity:</strong> Enterprise Picard LLC d/b/a E2EBot Cloud | <strong>Ref:</strong> EPIC-E2EBOT-PRIVACY-09</p>
  <blockquote><strong>${EPHEMERAL_EXECUTION_COVENANT}</strong></blockquote>
  <h2>1. Scope &amp; Ephemeral Architecture</h2>
  <p>Every Puppeteer smoke test and Cypress regression run executes inside an isolated <code>BrowserContext</code> that is destroyed immediately upon test run completion. Cookies, <code>localStorage</code>, DOM snapshots, and auth headers are purged immediately (0 seconds post-run retention).</p>
  <h2>2. Information Collected</h2>
  <ul>
    <li>Account &amp; Workspace metadata (email, <code>tenantId</code>, subscription tier, SHA-256 hashed <code>e2e_live_</code> API keys).</li>
    <li>Billing identifiers processed via Stripe (no raw payment card numbers are stored on E2EBot servers).</li>
    <li>Redacted execution telemetry (run counts and browser execution minutes for tier quota metering).</li>
  </ul>
  <h2>3. Zero AI Model Training</h2>
  <p>Private staging URLs, deploy previews, DOM structures, and screenshots are <strong>never</strong> used to train, fine-tune, or evaluate any AI/ML models.</p>
  <h2>4. GDPR &amp; CCPA/CPRA Rights</h2>
  <p>Contact <a href="mailto:privacy@enterprisepicard.com">privacy@enterprisepicard.com</a> to exercise access, rectification, or immediate cryptographic erasure rights.</p>
  <p style="margin-top:2rem;"><a href="/">← Return to E2EBot Cloud Portal</a></p>
</body>
</html>`;
fs.writeFileSync(path.join(distDir, 'privacy', 'index.html'), privacyHtml, 'utf8');

// 3. Terms of Service (terms/index.html)
const AUTHORIZED_TARGET_ATTESTATION =
    'AUTHORIZED TARGET ATTESTATION & SSRF PROHIBITION (18 U.S.C. § 1030): Customer represents, warrants, and covenants that it owns or possesses explicit written authorization from the system owner to execute automated browser tests against every target URL submitted to E2EBot. E2EBot enforces strict Server-Side Request Forgery (SSRF) network egress controls blocking RFC 1918 private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), loopback interfaces (127.0.0.0/8, ::1), link-local/cloud metadata endpoints (169.254.169.254), and non-HTTP(S) protocols. Unauthorized scanning, credential stuffing, denial-of-service testing, or probing of third-party infrastructure violates the Computer Fraud and Abuse Act (18 U.S.C. § 1030) and will result in immediate account termination.';

const CALIFORNIA_ARL_DISCLOSURE =
    "CALIFORNIA AUTOMATIC RENEWAL LAW (ARL) DISCLOSURE (CAL. BUS. & PROF. CODE § 17602): Paid E2EBot subscriptions automatically renew at the end of each monthly or annual billing cycle at the then-current tier rate unless cancelled prior to the renewal date. By checking the affirmative consent box at checkout, you authorize recurring charges to your payment method. You may cancel your subscription at any time with one click via Dashboard → Billing & Settings → Cancel Subscription (at least 24 hours before renewal to avoid the next period's charge).";

const termsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service, SSRF Prohibition &amp; ARL — E2EBot Cloud</title>
  <style>
    body { background: #070b14; color: #f1f5f9; font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 880px; margin: 2rem auto; padding: 2rem; line-height: 1.65; }
    h1, h2 { color: #38bdf8; margin-top: 1.5rem; margin-bottom: 0.75rem; }
    blockquote { background: rgba(245, 158, 11, 0.12); border-left: 4px solid #f59e0b; padding: 1rem; margin: 1.5rem 0; border-radius: 6px; }
    a { color: #38bdf8; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code { background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>E2EBot Cloud: Terms of Service &amp; Subscription Agreement</h1>
  <p><strong>Effective Date:</strong> October 12, 2026 | <strong>Entity:</strong> Enterprise Picard LLC d/b/a E2EBot Cloud | <strong>Ref:</strong> EPIC-E2EBOT-TERMS-10</p>
  <h2>1. Authorized Target Attestation &amp; SSRF / CFAA Prohibition (18 U.S.C. § 1030)</h2>
  <blockquote><strong>${AUTHORIZED_TARGET_ATTESTATION}</strong></blockquote>
  <h2>2. California Automatic Renewal Law (Cal. Bus. &amp; Prof. Code § 17602)</h2>
  <blockquote><strong>${CALIFORNIA_ARL_DISCLOSURE}</strong></blockquote>
  <h2>3. Ephemeral Browser Execution Covenant</h2>
  <blockquote><strong>${EPHEMERAL_EXECUTION_COVENANT}</strong></blockquote>
  <h2>4. Limitation of Liability &amp; Governing Law</h2>
  <p>Service is provided "AS IS" with a 99.9% uptime SLA for Enterprise tier subscribers. Governed by the laws of the State of Delaware.</p>
  <p style="margin-top:2rem;"><a href="/">← Return to E2EBot Cloud Portal</a></p>
</body>
</html>`;
fs.writeFileSync(path.join(distDir, 'terms', 'index.html'), termsHtml, 'utf8');

// 4. Netlify _redirects
const redirectsContent = `# Netlify Redirects for e2ebot
/api/*  /.netlify/functions/api/api/:splat  200
/health /.netlify/functions/api/health      200
/privacy /privacy/index.html 200
/terms /terms/index.html 200
`;
fs.writeFileSync(path.join(distDir, '_redirects'), redirectsContent, 'utf8');

console.log('✓ E2EBot build completed successfully. Output in dist/');
