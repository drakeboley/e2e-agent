// packages/netlify-plugin-e2ebot/index.js
/**
 * Netlify Build Plugin for e2ebot
 * Autonomous E2E testing agent and deploy preview inspector.
 */

module.exports = {
  async onSuccess({ utils, inputs }) {
    const deployUrl = process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || process.env.URL;
    const context = process.env.CONTEXT || 'deploy-preview';
    const siteName = process.env.SITE_NAME || 'Netlify Site';
    const commitRef = process.env.COMMIT_REF || 'HEAD';

    console.log('----------------------------------------------------');
    console.log(`[e2ebot] Running Netlify Partner Testing Plugin`);
    console.log(`[e2ebot] Site: ${siteName} | Context: ${context}`);
    console.log(`[e2ebot] Target Deploy URL: ${deployUrl || '(none)'}`);
    console.log('----------------------------------------------------');

    if (!deployUrl) {
      console.warn('[e2ebot] No deploy URL detected in environment. Skipping tests.');
      return;
    }

    const apiUrl = inputs.apiUrl || process.env.E2EBOT_API_URL || 'http://localhost:3000';
    const apiKey = inputs.apiKey || process.env.E2EBOT_API_KEY;

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['X-E2EBOT-API-KEY'] = apiKey;
    }

    let smokeSuccess = true;
    let cypressSuccess = true;

    // 1. Run Puppeteer Smoke Test
    if (inputs.runSmoke !== false) {
      try {
        console.log(`[e2ebot] Initiating real-time Puppeteer smoke test on ${deployUrl}...`);
        const res = await fetch(`${apiUrl}/api/puppeteer/smoke`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ url: deployUrl, captureScreenshot: true })
        });
        const data = await res.json();
        if (data.success) {
          console.log(`[e2ebot] ✓ Smoke test PASSED for ${deployUrl} (HTTP ${data.status})`);
        } else {
          smokeSuccess = false;
          console.warn(`[e2ebot] ⚠ Smoke test WARNING for ${deployUrl}:`, data.errors || data.error);
        }
      } catch (err) {
        console.error(`[e2ebot] Failed to reach e2ebot smoke test endpoint:`, err.message);
        smokeSuccess = false;
      }
    }

    // 2. Run Cypress Regression Test
    if (inputs.runCypress) {
      try {
        console.log(`[e2ebot] Executing Cypress spec '${inputs.spec || 'sample'}' against ${deployUrl}...`);
        const res = await fetch(`${apiUrl}/api/cypress/run`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            spec: inputs.spec || 'sample',
            baseUrl: deployUrl,
            env: { NETLIFY_CONTEXT: context, NETLIFY_COMMIT: commitRef }
          })
        });
        const data = await res.json();
        if (data.success && data.results && data.results.totalFailed === 0) {
          console.log(`[e2ebot] ✓ Cypress test suite PASSED (${data.results.totalPassed} passed, 0 failed).`);
        } else {
          cypressSuccess = false;
          console.warn(`[e2ebot] ✗ Cypress test suite had failures: ${data.results ? data.results.totalFailed : 'Unknown'} failed.`);
        }
      } catch (err) {
        console.error(`[e2ebot] Failed to reach e2ebot Cypress endpoint:`, err.message);
        cypressSuccess = false;
      }
    }

    if (inputs.failOnError && (!smokeSuccess || !cypressSuccess)) {
      if (utils && utils.build && utils.build.failBuild) {
        utils.build.failBuild('e2ebot test suite detected critical errors on deploy preview.');
      }
    } else {
      console.log(`[e2ebot] Testing phase completed.`);
    }
  }
};
