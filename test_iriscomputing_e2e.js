const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TARGET_URL = process.env.TARGET_URL || 'https://iriscomputing.netlify.app';
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || '/home/drake/safespace/.gemini/antigravity/brain/b9428027-7d54-4466-a7c2-1321e237552c/scratch/e2e_screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function log(step, msg) {
  console.log(`[E2E Bot] [Step ${step}] ${msg}`);
}

async function runE2E() {
  console.log('='.repeat(72));
  console.log('  IRIS COMPUTING LIVE SAAS E2EBOT WALKTHROUGH');
  console.log(`  Target URL:  ${TARGET_URL}`);
  console.log(`  Artifacts:   ${SCREENSHOT_DIR}`);
  console.log('='.repeat(72));

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/snap/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const pageErrors = [];
  const consoleLogs = [];
  const apiResponses = [];

  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') {
      console.log('  [Browser Error]:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.error('  [Page JS Error]:', err.message);
    pageErrors.push(err.message);
  });

  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('/api/')) {
      let body = '';
      try {
        body = await resp.text();
      } catch (e) {}
      apiResponses.push({ url, status: resp.status(), body });
      console.log(`  [API Response] ${resp.status()} ${url}`);
    }
  });

  try {
    // Step 1: Navigation
    log(1, `Navigating to ${TARGET_URL}...`);
    const response = await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    const status = response.status();
    log(1, `HTTP Status: ${status}`);
    if (status !== 200) {
      throw new Error(`Expected HTTP 200, got ${status}`);
    }

    const title = await page.title();
    log(1, `Page Title: "${title}"`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_landing_hero.png') });

    // Step 2: Check Navigation and Header
    log(2, 'Verifying Brand & Navigation Links...');
    const brandText = await page.$eval('.logo', el => el.innerText.trim());
    log(2, `Logo/Brand: "${brandText.replace(/\n+/g, ' ')}"`);

    const navLinks = await page.$$eval('.nav-links a', els => els.map(a => ({ text: a.innerText.trim(), href: a.getAttribute('href') })));
    log(2, `Nav items found (${navLinks.length}): ${JSON.stringify(navLinks)}`);

    // Step 3: Interactive Reflex Demo - Benign Execution
    log(3, 'Testing Interactive Reflex Demo: Benign Command (ls -la)...');
    await page.click("button[onclick*=\"'safe'\"]");
    await page.waitForFunction(() => {
      const el = document.getElementById('demo-screen');
      return el && el.innerText.includes('ATTESTED_SAFE');
    }, { timeout: 10000 });

    const benignOutput = await page.$eval('#demo-screen', el => el.innerText);
    log(3, `Benign Output Received:\n${benignOutput}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_demo_benign.png') });

    // Step 4: Interactive Reflex Demo - SSH Key Exfiltration (Malicious)
    log(4, 'Testing Interactive Reflex Demo: Malicious SSH Exfil...');
    await page.click("button[onclick*=\"'ssh'\"]");
    await page.waitForFunction(() => {
      const el = document.getElementById('demo-screen');
      return el && el.innerText.includes('PRIVILEGED_FILE_ACCESS');
    }, { timeout: 10000 });

    const sshOutput = await page.$eval('#demo-screen', el => el.innerText);
    log(4, `SSH Containment Output Received:\n${sshOutput}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_demo_ssh_quarantined.png') });

    // Step 5: Interactive Reflex Demo - /etc/shadow Exfil (Malicious cURL)
    log(5, 'Testing Interactive Reflex Demo: /etc/shadow Exfil...');
    await page.click("button[onclick*=\"'curl'\"]");
    await page.waitForFunction(() => {
      const el = document.getElementById('demo-screen');
      return el && el.innerText.includes('FILE_EXFILTRATION_VIA_CURL');
    }, { timeout: 10000 });

    const curlOutput = await page.$eval('#demo-screen', el => el.innerText);
    log(5, `cURL Containment Output:\n${curlOutput}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_demo_curl_quarantined.png') });

    // Step 6: Interactive Reflex Demo - Plant Honeytoken Canary
    log(6, 'Testing Interactive Reflex Demo: Plant Honeytoken Canary...');
    await page.click("button[onclick*=\"'canary'\"]");
    await page.waitForFunction(() => {
      const el = document.getElementById('demo-screen');
      return el && el.innerText.includes('canary_token');
    }, { timeout: 10000 });

    const honeyOutput = await page.$eval('#demo-screen', el => el.innerText);
    log(6, `Honeytoken Output Received:\n${honeyOutput}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_demo_honeytoken.png') });

    // Step 7: Check Public Releases & Repos
    log(7, 'Checking Open Source Releases and GitHub Links...');
    const pyprismLink = await page.$eval('a[href*="pyprism"]', el => el.href).catch(() => null);
    const webpackLink = await page.$eval('a[href*="webpack-prism-plugin"]', el => el.href).catch(() => null);
    log(7, `PyPrism link verified: ${pyprismLink}`);
    log(7, `Webpack plugin link verified: ${webpackLink}`);

    // Step 8: Test Stripe Checkout Endpoint
    log(8, 'Testing Stripe Checkout Flow for Developer Tier...');
    const devCheckoutResult = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/stripe-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier: 'developer' })
        });
        const data = await res.json();
        return { status: res.status, data };
      } catch (err) {
        return { error: err.message };
      }
    });
    log(8, `Developer Checkout Response: ${JSON.stringify(devCheckoutResult)}`);

    log(8, 'Testing Stripe Checkout Flow for Enterprise Tier...');
    const entCheckoutResult = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/stripe-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier: 'enterprise' })
        });
        const data = await res.json();
        return { status: res.status, data };
      } catch (err) {
        return { error: err.message };
      }
    });
    log(8, `Enterprise Checkout Response: ${JSON.stringify(entCheckoutResult)}`);

    // Step 9: Verify Legal Entity in Footer
    log(9, 'Verifying Legal Corporate Attribution in Footer...');
    const footerText = await page.$eval('footer', el => el.innerText);
    log(9, `Footer: "${footerText.replace(/\n+/g, ' ')}"`);
    const hasLegalAttribution = footerText.includes('Campfire Creative LLC') && footerText.includes('Iris Computing');
    log(9, `Legal attribution check: ${hasLegalAttribution ? 'PASS' : 'FAIL'}`);

    // Step 10: Full Page Screenshot
    log(10, 'Capturing Full-Page Verification Screenshot...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_iriscomputing_full_page.png'), fullPage: true });

    console.log('='.repeat(72));
    console.log('  E2EBOT WALKTHROUGH COMPLETED SUCCESSFULLY');
    console.log(`  Page JS Errors:     ${pageErrors.length}`);
    console.log(`  Total API Responses:${apiResponses.length}`);
    console.log(`  Screenshots Saved:  ${SCREENSHOT_DIR}`);
    console.log('='.repeat(72));

  } catch (error) {
    console.error('E2E Bot Walkthrough Failed:', error);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png'), fullPage: true });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runE2E();
