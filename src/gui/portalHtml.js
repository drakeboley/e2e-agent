/**
 * E2EBot — Interactive Cloud QA Portal, Smoke-Test Inspector, API Key Console & ARL Checkout GUI (SAAS-5 / P0-5)
 * Approved by Enterprise Picard Marketing & GTM Lab, Software Lab, and Venture & Legal Lab.
 */

const EPHEMERAL_EXECUTION_COVENANT =
    'EPHEMERAL BROWSER EXECUTION & ZERO-CREDENTIAL-RETENTION COVENANT: E2EBot executes automated browser sessions in isolated, ephemeral sandboxed containers that are destroyed immediately upon test run completion. Authentication secrets, session cookies, bearer tokens, and test credentials supplied during execution are processed strictly in volatile memory (RAM), are redacted from all execution logs, DOM snapshots, and telemetry traces, are never persisted in plain text at rest, and are strictly excluded from training, fine-tune, or improving any AI/ML models.';

function renderPortalHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>E2EBot Cloud — Deterministic Autonomous E2E Verification &amp; MCP Testing Fabric</title>
  <meta name="description" content="Execute deterministic browser and API smoke tests, provision scoped e2e_live_ API keys, and monitor real-time QA telemetry across Netlify deploy previews." />

  <!-- OpenGraph / Social Discovery (SAAS-5) -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="E2EBot Cloud" />
  <meta property="og:title" content="E2EBot — Autonomous E2E Smoke-Test &amp; Telemetry Platform" />
  <meta property="og:description" content="Execute deterministic browser and API smoke tests, provision scoped API keys, and monitor real-time QA telemetry." />
  <meta property="og:url" content="https://e2e-agent.com/" />
  <meta property="og:image" content="https://e2e-agent.com/assets/og-e2ebot-portal.png" />

  <!-- Twitter / X Card (SAAS-5) -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="E2EBot — Autonomous E2E Smoke-Test &amp; Telemetry Platform" />
  <meta name="twitter:description" content="Zero-flake E2E smoke testing, instant API key provisioning, and live execution telemetry for engineering teams." />
  <meta name="twitter:image" content="https://e2e-agent.com/assets/og-e2ebot-portal.png" />

  <!-- JSON-LD SoftwareApplication Structured Data (SAAS-5 AEO/SEO) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "E2EBot",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web, Linux, macOS, Windows",
    "description": "Autonomous end-to-end smoke-test execution, deploy-preview inspection, API key management, and real-time MCP QA telemetry platform.",
    "offers": [
      {
        "@type": "Offer",
        "name": "Starter (Community) Tier",
        "price": "0",
        "priceCurrency": "USD"
      },
      {
        "@type": "Offer",
        "name": "Pro (Growth) Automation Tier",
        "price": "49.00",
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "49.00",
          "priceCurrency": "USD",
          "billingDuration": "P1M"
        }
      },
      {
        "@type": "Offer",
        "name": "Agency (Multi-Site) Tier",
        "price": "199.00",
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "199.00",
          "priceCurrency": "USD",
          "billingDuration": "P1M"
        }
      },
      {
        "@type": "Offer",
        "name": "Enterprise Dedicated Tier",
        "price": "899.00",
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "899.00",
          "priceCurrency": "USD",
          "billingDuration": "P1M"
        }
      }
    ]
  }
  </script>

  <style>
    :root {
      --bg: #070b14;
      --card-bg: rgba(15, 23, 42, 0.85);
      --card-border: rgba(56, 189, 248, 0.25);
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --primary: #0ea5e9;
      --primary-hover: #0284c7;
      --accent: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-image:
        radial-gradient(circle at 12% 18%, rgba(14, 165, 233, 0.14) 0%, transparent 40%),
        radial-gradient(circle at 88% 82%, rgba(16, 185, 129, 0.12) 0%, transparent 40%);
    }
    header {
      border-bottom: 1px solid var(--card-border);
      background: rgba(7, 11, 20, 0.9);
      backdrop-filter: blur(12px);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 50;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: 0.03em;
    }
    .brand-badge {
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: #031525;
      font-weight: 800;
      font-size: 0.75rem;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
    }
    .nav-tabs {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .nav-tab {
      color: var(--text-muted);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0.45rem 0.9rem;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      transition: all 0.2s;
    }
    .nav-tab:hover, .nav-tab.active {
      color: #fff;
      background: rgba(14, 165, 233, 0.15);
      border-color: rgba(14, 165, 233, 0.4);
    }
    .nav-links {
      display: flex;
      gap: 1rem;
      font-size: 0.85rem;
      align-items: center;
    }
    .nav-links a {
      color: var(--text-muted);
      text-decoration: none;
    }
    .nav-links a:hover { color: var(--primary); }
    .covenant-banner {
      background: rgba(16, 185, 129, 0.09);
      border-bottom: 1px solid rgba(16, 185, 129, 0.3);
      padding: 0.65rem 2rem;
      font-size: 0.8rem;
      color: #d1fae5;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .container {
      max-width: 1360px;
      margin: 0 auto;
      padding: 2rem;
      width: 100%;
      flex: 1;
    }
    .view-panel { display: none; }
    .view-panel.active { display: block; }
    .hero {
      text-align: center;
      margin-bottom: 2rem;
    }
    .hero h1 {
      font-size: 2.25rem;
      margin-bottom: 0.6rem;
      background: linear-gradient(90deg, #fff, #38bdf8, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero p {
      color: var(--text-muted);
      max-width: 760px;
      margin: 0 auto;
      line-height: 1.6;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .form-row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    input[type="text"], input[type="url"], input[type="email"], select {
      background: #050811;
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 0.7rem 1rem;
      border-radius: 8px;
      font-size: 0.92rem;
      flex: 1;
      min-width: 220px;
    }
    .btn {
      padding: 0.7rem 1.3rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: var(--primary);
      color: #041322;
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--primary-hover);
      color: #fff;
    }
    .btn-primary:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .btn-outline {
      background: transparent;
      border: 1px solid var(--card-border);
      color: var(--text);
    }
    .btn-outline:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(265px, 1fr));
      gap: 1.25rem;
      margin-top: 1.25rem;
    }
    .pricing-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.6rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .pricing-card.featured {
      border-color: var(--accent);
      box-shadow: 0 0 24px rgba(16, 185, 129, 0.16);
    }
    .price-tag {
      font-size: 2.1rem;
      font-weight: 800;
    }
    .price-tag span {
      font-size: 0.9rem;
      color: var(--text-muted);
      font-weight: 400;
    }
    .feature-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.88rem;
      color: var(--text-muted);
    }
    .feature-list li::before {
      content: "✓ ";
      color: var(--accent);
      font-weight: bold;
    }
    .arl-box {
      background: rgba(245, 158, 11, 0.12);
      border: 2px solid rgba(245, 158, 11, 0.55);
      border-radius: 10px;
      padding: 1.2rem;
      margin: 1.25rem 0;
      color: #fef3c7;
      font-size: 0.9rem;
      line-height: 1.55;
    }
    .arl-consent-label {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-top: 0.85rem;
      cursor: pointer;
      font-weight: 500;
      color: #fff;
    }
    .arl-consent-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      margin-top: 0.15rem;
    }
    pre.console-out {
      background: #03060c;
      border: 1px solid rgba(255,255,255,0.1);
      padding: 1rem;
      border-radius: 8px;
      font-family: monospace;
      font-size: 0.84rem;
      color: #38bdf8;
      overflow-x: auto;
      max-height: 360px;
      margin-top: 1rem;
    }
    .telemetry-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat-box {
      background: #050914;
      border: 1px solid var(--card-border);
      padding: 1.2rem;
      border-radius: 10px;
    }
    .stat-label { font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; }
    .stat-value { font-size: 1.75rem; font-weight: 800; color: var(--primary); margin-top: 0.3rem; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>⚡ E2EBOT CLOUD</span>
      <span class="brand-badge">MCP + PUPPETEER + CYPRESS</span>
    </div>
    <div class="nav-tabs">
      <button class="nav-tab active" onclick="switchTab('inspectorTab', this)">Smoke-Test Inspector</button>
      <button class="nav-tab" onclick="switchTab('keysTab', this)">API Keys &amp; Auth</button>
      <button class="nav-tab" onclick="switchTab('telemetryTab', this)">Usage Telemetry</button>
      <button class="nav-tab" onclick="switchTab('pricingTab', this)">Pricing &amp; Billing</button>
    </div>
    <div class="nav-links">
      <a href="/health" target="_blank">SLA Health</a>
      <a href="/api/compliance/policy" target="_blank">Compliance JSON</a>
      <a href="/privacy" target="_blank">Privacy Policy</a>
      <a href="/terms" target="_blank">Terms of Service</a>
    </div>
  </header>

  <div class="covenant-banner">
    <div>
      <strong style="color:#34d399;">🛡️ EPHEMERAL BROWSER &amp; ZERO-CREDENTIAL-RETENTION COVENANT:</strong>
      Every test executes inside an isolated <code>BrowserContext</code> purged immediately after completion. Credentials &amp; cookies are never persisted at rest or used for AI model training.
    </div>
    <div style="display:flex; gap:1rem;">
      <a href="/privacy" style="color:#38bdf8; font-weight:700; text-decoration:none;">Privacy Covenant →</a>
      <a href="/terms" style="color:#38bdf8; font-weight:700; text-decoration:none;">SSRF &amp; CFAA Terms →</a>
    </div>
  </div>

  <div class="container">
    <div class="hero">
      <h1>Deterministic Autonomous E2E Verification — Zero Flake, Full Telemetry.</h1>
      <p>Run live smoke tests in an ephemeral sandboxed browser, provision SHA-256 scoped <code>e2e_live_</code> API keys in one click, and inspect real-time execution traces before deploying to CI/CD.</p>
    </div>

    <!-- TAB 1: Interactive Smoke-Test Inspector -->
    <section id="inspectorTab" class="view-panel active">
      <div class="card">
        <h2>Live Sandbox Smoke-Test Inspector</h2>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.3rem;">
          Trigger an end-to-end assertion suite and inspect DOM status, console errors, failed network requests, and SSRF verification in real time.
        </p>
        <div class="form-row">
          <input type="url" id="smokeUrl" placeholder="https://example.com or deploy-preview-42--site.netlify.app" value="https://example.com" />
          <input type="text" id="inspectorApiKey" placeholder="Bearer API Key (e.g. e2e_live_...)" />
          <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.88rem;">
            <input type="checkbox" id="captureScreenshot" /> Capture Screenshot
          </label>
          <button class="btn btn-primary" onclick="runSmokeTest()">Run Ephemeral Smoke Test</button>
        </div>
        <pre class="console-out" id="smokeOutput">// Ready. Ephemeral BrowserContext isolation &amp; SSRF protection active.</pre>
      </div>
    </section>

    <!-- TAB 2: API Key Generator -->
    <section id="keysTab" class="view-panel">
      <div class="card">
        <h2>Instant Scoped API Credentials (<code>e2e_live_</code>)</h2>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.3rem;">
          Generate SHA-256 hashed API keys with sliding-window rate limits, tenant isolation, and monthly deploy-preview run &amp; browser-minute quotas.
        </p>
        <div class="form-row">
          <input type="text" id="newKeyName" placeholder="Key Label (e.g., Netlify CI Deploy Preview Runner)" />
          <input type="text" id="newKeyTenant" placeholder="Tenant ID (e.g., tenant:acme_qa)" />
          <select id="newKeyTier">
            <option value="STARTER">STARTER ($0/mo — 50 runs / 100 mins)</option>
            <option value="PRO" selected>PRO ($49/mo — 500 runs / 1,500 mins)</option>
            <option value="AGENCY">AGENCY ($199/mo — 2,500 runs / 10,000 mins)</option>
            <option value="ENTERPRISE">ENTERPRISE ($899/mo — 25,000 runs / 100,000 mins)</option>
          </select>
          <input type="password" id="adminMasterKey" placeholder="Master Admin Key (Required for minting)" />
          <button class="btn btn-primary" onclick="generateApiKey()">Mint e2e_live_ API Key</button>
        </div>

        <div id="mintedSecretBanner" style="display:none; margin-top:1rem; padding:1rem; border-radius:8px; background:rgba(16,185,129,0.12); border:1px solid var(--accent);">
          <strong style="color:#34d399;">✦ New Live Secret Key Minted (Copy now — only SHA-256 hash is stored at rest):</strong>
          <div class="form-row" style="margin-top:0.5rem;">
            <input type="text" id="mintedSecretValue" readonly />
          </div>
        </div>

        <h3 style="margin-top:1.5rem;">Active Tenant API Keys</h3>
        <pre class="console-out" id="keysListOutput">Loading keys...</pre>
      </div>
    </section>

    <!-- TAB 3: Usage Telemetry Viewer -->
    <section id="telemetryTab" class="view-panel">
      <div class="card">
        <h2>Real-Time Quota &amp; Run Telemetry</h2>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.3rem; margin-bottom:1rem;">
          Monitor active test runs, deploy-preview consumption, and browser execution minutes for your tenant workspace.
        </p>
        <div class="telemetry-grid" id="telemetryCards">
          <div class="stat-box">
            <div class="stat-label">Active Tier</div>
            <div class="stat-value" id="statTier">PRO</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Deploy Preview Runs</div>
            <div class="stat-value" id="statRuns">0 / 500</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Browser Execution Minutes</div>
            <div class="stat-value" id="statMinutes">0.00 / 1500</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">API Requests Metered</div>
            <div class="stat-value" id="statRequests">0</div>
          </div>
        </div>
        <button class="btn btn-outline" onclick="loadTelemetry()">Refresh Telemetry</button>
        <pre class="console-out" id="telemetryRawOutput">// Telemetry snapshot will appear here.</pre>
      </div>
    </section>

    <!-- TAB 4: Pricing & California ARL Compliant Checkout -->
    <section id="pricingTab" class="view-panel">
      <div class="card">
        <h2>Multi-Tenant Cloud QA Subscription Tiers</h2>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.3rem;">
          Select a plan for autonomous Netlify deploy-preview inspection, parallel Cypress runners, and hosted MCP tool execution.
        </p>

        <!-- Mandatory California ARL (Cal. Bus. & Prof. Code § 17602) Disclosure & Unchecked Affirmative Consent -->
        <div class="arl-box">
          <div>
            <strong>CALIFORNIA AUTOMATIC RENEWAL LAW (ARL) DISCLOSURE (CAL. BUS. &amp; PROF. CODE § 17602):</strong>
            Your paid <strong>E2EBot (Pro $49/mo, Agency $199/mo, or Enterprise $899/mo)</strong> subscription will automatically renew at the end of each monthly billing cycle at the then-current tier rate (plus applicable taxes) unless cancelled prior to the renewal date. You may cancel your subscription at any time with one click via <strong>Developer Portal → Pricing &amp; Billing → Cancel Subscription (Self-Serve Billing Portal)</strong> or by emailing <a href="mailto:support@e2e-agent.com" style="color:#38bdf8;">support@e2e-agent.com</a> (at least 24 hours before renewal to avoid the next period's charge).
          </div>
          <label for="arl-affirmative-consent" class="arl-consent-label">
            <input type="checkbox" id="arl-affirmative-consent" name="arlConsent" onchange="toggleArlCheckoutButtons()" />
            <span>
              I have read and agree to the <strong>Automatic Renewal Terms (Cal. Bus. &amp; Prof. Code § 17602)</strong>, <a href="/terms" target="_blank" style="color:#38bdf8;">Terms of Service</a>, and <a href="/privacy" target="_blank" style="color:#38bdf8;">Privacy Policy</a>, and provide my affirmative consent to recurring monthly charges until I cancel.
            </span>
          </label>
        </div>

        <div class="form-row" style="margin-bottom:1rem;">
          <input type="email" id="checkoutEmail" placeholder="Subscriber billing email (e.g., qa-lead@company.com)" />
          <input type="text" id="checkoutTenant" placeholder="Tenant Workspace ID (e.g., tenant:acme_corp)" />
          <input type="text" id="billingCustomerId" placeholder="Stripe Customer ID (cus_... — from your receipt email)" />
          <button class="btn btn-outline" onclick="openCustomerPortal()">1-Click Cancel / Manage Billing Portal</button>
        </div>

        <div class="pricing-grid">
          <div class="pricing-card">
            <h3>Starter (Community)</h3>
            <div class="price-tag">$0 <span>/ month</span></div>
            <ul class="feature-list">
              <li>50 deploy preview runs / mo</li>
              <li>100 browser execution minutes</li>
              <li>20 req/min sliding-window limit</li>
              <li>Ephemeral Puppeteer smoke tests</li>
              <li>Community support</li>
            </ul>
            <button class="btn btn-outline" style="margin-top:auto;" onclick="switchTab('keysTab')">Start Free</button>
          </div>

          <div class="pricing-card featured">
            <h3>Pro (Growth)</h3>
            <div class="price-tag">$49 <span>/ month</span></div>
            <ul class="feature-list">
              <li>500 deploy preview runs / mo</li>
              <li>1,500 browser execution minutes</li>
              <li>60 req/min rate limit &amp; 3 parallel runners</li>
              <li>Hosted MCP HTTP &amp; WebSocket access</li>
              <li>Failure screenshot artifacts &amp; Email SLA</li>
            </ul>
            <button class="btn btn-primary arl-gated-btn" disabled style="margin-top:auto;" onclick="startCheckout('PRO')">Subscribe to Pro ($49/mo)</button>
          </div>

          <div class="pricing-card">
            <h3>Agency (Multi-Site)</h3>
            <div class="price-tag">$199 <span>/ month</span></div>
            <ul class="feature-list">
              <li>2,500 deploy preview runs / mo</li>
              <li>10,000 browser execution minutes</li>
              <li>180 req/min &amp; 10 parallel runners</li>
              <li>Up to 25 Netlify sites</li>
              <li>Priority queue &amp; white-label reports</li>
            </ul>
            <button class="btn btn-primary arl-gated-btn" disabled style="margin-top:auto;" onclick="startCheckout('AGENCY')">Subscribe to Agency ($199/mo)</button>
          </div>

          <div class="pricing-card">
            <h3>Enterprise</h3>
            <div class="price-tag">$899 <span>/ month</span></div>
            <ul class="feature-list">
              <li>25,000+ deploy preview runs / mo</li>
              <li>100,000+ browser execution minutes</li>
              <li>600 req/min &amp; 50 parallel runners</li>
              <li>Dedicated VPC runners &amp; SAML/SSO</li>
              <li>99.9% uptime SLA &amp; dedicated engineer</li>
            </ul>
            <button class="btn btn-primary arl-gated-btn" disabled style="margin-top:auto;" onclick="startCheckout('ENTERPRISE')">Subscribe to Enterprise ($899/mo)</button>
          </div>
        </div>

        <div style="margin-top:1.25rem; text-align:center; font-size:0.85rem; color:var(--text-muted);">
          ✓ 1-Click Self-Serve Cancellation &nbsp;•&nbsp; ✓ Instant <code>e2e_live_</code> API Key Provisioning &nbsp;•&nbsp; ✓ Zero-Retention Ephemeral Browser Isolation
        </div>

        <pre class="console-out" id="billingOutput" style="display:none;"></pre>
      </div>
    </section>
  </div>

  <script>
    function getSavedApiKey() {
      try {
        return localStorage.getItem('e2ebot_api_key') || '';
      } catch (_e) {
        return '';
      }
    }

    function saveApiKey(key) {
      try {
        if (key && key.trim()) {
          localStorage.setItem('e2ebot_api_key', key.trim());
        } else {
          localStorage.removeItem('e2ebot_api_key');
        }
      } catch (_e) {}
    }

    document.addEventListener('DOMContentLoaded', () => {
      handleBillingReturn();
      const saved = getSavedApiKey();
      const input = document.getElementById('inspectorApiKey');
      if (saved && input) {
        input.value = saved;
      }
      if (input) {
        input.addEventListener('input', (e) => saveApiKey(e.target.value));
      }
    });

    function switchTab(tabId, btnEl) {
      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      const panel = document.getElementById(tabId);
      if (panel) panel.classList.add('active');
      if (btnEl) btnEl.classList.add('active');
      if (tabId === 'keysTab') loadKeys();
      if (tabId === 'telemetryTab') loadTelemetry();
    }

    function toggleArlCheckoutButtons() {
      const checked = document.getElementById('arl-affirmative-consent').checked;
      document.querySelectorAll('.arl-gated-btn').forEach(btn => {
        btn.disabled = !checked;
      });
    }

    async function runSmokeTest() {
      const url = document.getElementById('smokeUrl').value.trim();
      const apiKey = (document.getElementById('inspectorApiKey')?.value || getSavedApiKey()).trim();
      const captureScreenshot = document.getElementById('captureScreenshot').checked;
      const out = document.getElementById('smokeOutput');
      if (!apiKey) {
        out.textContent = '// Authentication Error: Please provide an e2e_live_ API key above.';
        return;
      }
      saveApiKey(apiKey);
      out.textContent = 'Running isolated ephemeral BrowserContext smoke test against ' + url + '...';
      try {
        const res = await fetch('/api/puppeteer/smoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey
          },
          body: JSON.stringify({ url, captureScreenshot })
        });
        const data = await res.json();
        out.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        out.textContent = 'Error: ' + err.message;
      }
    }

    async function generateApiKey() {
      const name = document.getElementById('newKeyName').value.trim() || 'Portal Generated Runner Key';
      const tenantId = document.getElementById('newKeyTenant').value.trim() || undefined;
      const tier = document.getElementById('newKeyTier').value;
      const adminKey = (document.getElementById('adminMasterKey')?.value || '').trim();
      const headers = { 'Content-Type': 'application/json' };
      if (adminKey) {
        headers['Authorization'] = 'Bearer ' + adminKey;
      }
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, tenantId, tier })
      });
      const data = await res.json();
      if (data.secret) {
        document.getElementById('mintedSecretBanner').style.display = 'block';
        document.getElementById('mintedSecretValue').value = data.secret;
        const keyInput = document.getElementById('inspectorApiKey');
        if (keyInput) keyInput.value = data.secret;
        saveApiKey(data.secret);
      } else if (data.error) {
        alert('API Key Minting Error: ' + data.error);
      }
      await loadKeys();
    }

    async function loadKeys() {
      const apiKey = (document.getElementById('inspectorApiKey')?.value || getSavedApiKey()).trim();
      const output = document.getElementById('keysListOutput');
      if (!apiKey) {
        output.textContent = '// Authentication Required: Provide your e2e_live_ API key in the Inspector input above to view active workspace keys.';
        return;
      }
      saveApiKey(apiKey);
      output.textContent = '// Querying active tenant keys...';
      try {
        const res = await fetch('/api/keys', {
          headers: { 'Authorization': 'Bearer ' + apiKey }
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          output.textContent = '// Authentication Error (' + (res.status || 401) + '): ' + (data.error || 'Invalid or expired API key. Enter a valid e2e_live_ key.');
          return;
        }
        output.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        output.textContent = '// Network error loading keys: ' + err.message;
      }
    }

    async function loadTelemetry() {
      const apiKey = (document.getElementById('inspectorApiKey')?.value || getSavedApiKey()).trim();
      const output = document.getElementById('telemetryRawOutput');
      if (!apiKey) {
        output.textContent = '// Authentication Required: Provide your e2e_live_ API key in the Inspector input above to load real-time telemetry.';
        document.getElementById('statTier').textContent = '—';
        document.getElementById('statRuns').textContent = '—';
        document.getElementById('statMinutes').textContent = '—';
        document.getElementById('statRequests').textContent = '—';
        return;
      }
      saveApiKey(apiKey);
      output.textContent = '// Fetching real-time workspace telemetry...';
      try {
        const res = await fetch('/api/telemetry', {
          headers: { 'Authorization': 'Bearer ' + apiKey }
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          output.textContent = '// Authentication Error (' + (res.status || 401) + '): ' + (data.error || 'Invalid API key');
          return;
        }
        output.textContent = JSON.stringify(data, null, 2);
        if (data && data.limits && data.usage) {
          document.getElementById('statTier').textContent = data.tier || 'PRO';
          document.getElementById('statRuns').textContent = data.usage.deployRunsUsed + ' / ' + data.limits.monthlyDeployPreviewRuns;
          document.getElementById('statMinutes').textContent = (typeof data.usage.browserMinutesUsed === 'number' ? data.usage.browserMinutesUsed.toFixed(2) : data.usage.browserMinutesUsed) + ' / ' + data.limits.monthlyBrowserMinutes;
          document.getElementById('statRequests').textContent = data.usage.requestsUsed;
        }
      } catch (err) {
        output.textContent = '// Network error fetching telemetry: ' + err.message;
      }
    }

    async function startCheckout(tier) {
      const arlConsent = document.getElementById('arl-affirmative-consent').checked;
      const email = document.getElementById('checkoutEmail').value.trim() || 'developer@example.com';
      const tenantId = document.getElementById('checkoutTenant').value.trim() || undefined;
      const out = document.getElementById('billingOutput');
      out.style.display = 'block';
      out.textContent = '// Initiating secure Stripe Checkout for ' + tier + '...';
      try {
        const res = await fetch('/api/billing/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier, email, tenantId, arlConsent })
        });
        const data = await res.json();
        if (res.ok && data.url) {
          // Audit-4: redirect to hosted Stripe Checkout instead of dumping JSON into the console
          window.location.href = data.url;
          return;
        }
        out.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        out.textContent = '// Checkout Error: ' + err.message;
      }
    }

    // Audit-4: Post-checkout return handler — reads ?billing_status= & ?session_id= from Stripe success/cancel redirects
    function handleBillingReturn() {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('billing_status');
      const sessionId = params.get('session_id');
      const tier = params.get('tier');
      if (!status && !sessionId) return;

      const out = document.getElementById('billingOutput');
      if (out) {
        out.style.display = 'block';
        if (status === 'success' || sessionId) {
          out.textContent =
            '// PAYMENT RECEIVED — provisioning is automatic via Stripe webhook.\\n' +
            (tier ? '// Tier: ' + tier + '\\n' : '') +
            (sessionId ? '// Checkout session: ' + sessionId + '\\n' : '') +
            '// Your e2e_live_ API key is issued within moments of webhook confirmation. ' +
            'If you do not receive it, email support@e2e-agent.com with your tenant ID and checkout session ID.\\n' +
            '// (No checkout-status API is exposed; webhook provisioning is authoritative.)';
        } else if (status === 'cancelled') {
          out.textContent = '// Checkout cancelled — no charge was made. You can retry any time from the Pricing tab.';
        }
      }
      // Switch to the Pricing & Billing tab so the banner is visible
      switchTab('pricingTab', document.querySelector('.nav-tab:last-child'));
      // Clean the URL so a refresh does not replay the banner
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    async function openCustomerPortal() {
      const out = document.getElementById('billingOutput');
      out.style.display = 'block';
      const customerId = (document.getElementById('billingCustomerId')?.value || '').trim();
      if (!customerId || !customerId.startsWith('cus_')) {
        // Audit-2d: never send a fake placeholder customer id — require the real Stripe Customer ID
        out.textContent = '// Billing Portal requires your Stripe Customer ID (cus_...), found in your subscription receipt email. Enter it in the "Stripe Customer ID" field above. Need help? Email support@e2e-agent.com.';
        return;
      }
      try {
        const res = await fetch('/api/billing/create-portal-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId })
        });
        const data = await res.json();
        if (res.ok && data.url) {
          window.location.href = data.url;
          return;
        }
        out.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        out.textContent = '// Billing Portal Error: ' + err.message;
      }
    }
  </script>
</body>
</html>`;
}

module.exports = {
    renderPortalHtml,
    EPHEMERAL_EXECUTION_COVENANT
};
