# netlify-plugin-e2ebot

Automated real-time end-to-end testing and deploy preview verification for Netlify, powered by **e2ebot**.

## Installation

Add to your Netlify build configuration via `npm`:

```bash
npm install -D netlify-plugin-e2ebot
```

And configure in your `netlify.toml`:

```toml
[[plugins]]
  package = "netlify-plugin-e2ebot"

  [plugins.inputs]
    apiUrl = "http://localhost:3000"   # or your hosted e2ebot cloud URL
    apiKey = ""                        # optional API key for hosted instances
    runSmoke = true                    # run Puppeteer smoke test on deploy preview
    runCypress = true                  # run Cypress specs against preview
    spec = "sample"                    # spec name in cypress/e2e
    failOnError = false                # whether to fail build on test failures
```

## How It Works

1. During `onSuccess` (after Netlify creates your Deploy Preview or production deploy), the plugin grabs the preview URL (`$DEPLOY_PRIME_URL`).
2. It sends an inspection command to the `e2ebot` testing daemon.
3. Puppeteer performs real-time smoke tests (checking for JavaScript runtime errors, network 4xx/5xx failures, and DOM presence).
4. Cypress runs your regression specs targeting the live preview URL.
5. Structured results and failure screenshots are logged directly to the Netlify deploy logs.
