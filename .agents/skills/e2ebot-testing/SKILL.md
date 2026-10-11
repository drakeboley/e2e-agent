---
name: e2ebot-testing
description: >-
  Drive localized end-to-end web testing for web applications in active development.
  Use this skill when asked to test web apps in real-time, automate browser interactions (navigate,
  click, type, inspect text/DOM) via Puppeteer, run Cypress E2E test suites, or coordinate testing
  across agents using the e2ebot MCP server or WebSocket daemon.
---

# e2ebot Web Testing Skill

This skill guides agents on how to execute real-time interactive browser testing and repeatable regression flows against web applications running in development using the **e2ebot** service.

---

## 🛠 Available Capabilities

The `e2ebot` service provides two primary testing modalities:

1. **Interactive Exploratory Testing (Puppeteer)**:
   - Dynamic real-time browser actions.
   - Ideal for agent-guided verification of dev builds, interactive flows, form filling, and DOM inspection.
2. **Repeatable Regression Suites (Cypress)**:
   - Deterministic test specs in `cypress/e2e/`.
   - Ideal for automated regression passes and structured test pass/fail reporting.

---

## 🚀 Interaction Mode 1: Model Context Protocol (MCP)

When operating within Antigravity, the `e2ebot-testing` MCP server provides native tools under the `e2ebot-testing` server namespace.

### Invoking Tools via `call_mcp_tool`

Use `call_mcp_tool` with `ServerName: "e2ebot-testing"` and the corresponding tool name:

#### 1. Navigate to Web App
```json
{
  "ServerName": "e2ebot-testing",
  "ToolName": "puppeteer_goto",
  "Arguments": {
    "url": "http://localhost:5173"
  }
}
```

#### 2. Type into an Input Field
```json
{
  "ServerName": "e2ebot-testing",
  "ToolName": "puppeteer_type",
  "Arguments": {
    "selector": "input#email",
    "text": "testuser@example.com"
  }
}
```

#### 3. Click an Element
```json
{
  "ServerName": "e2ebot-testing",
  "ToolName": "puppeteer_click",
  "Arguments": {
    "selector": "button[type='submit']"
  }
}
```

#### 4. Extract Text & Assert Content
```json
{
  "ServerName": "e2ebot-testing",
  "ToolName": "puppeteer_getText",
  "Arguments": {
    "selector": ".dashboard-welcome"
  }
}
```

#### 5. Retrieve Page HTML / DOM Tree
```json
{
  "ServerName": "e2ebot-testing",
  "ToolName": "puppeteer_getDOM",
  "Arguments": {}
}
```

#### 6. Run a Cypress Spec
```json
{
  "ServerName": "e2ebot-testing",
  "ToolName": "cypress_run",
  "Arguments": {
    "spec": "sample"
  }
}
```
*(Runs `cypress/e2e/sample.cy.js` and returns structured JSON test results).*

---

## 🌐 Interaction Mode 2: WebSocket & REST Daemon

If communicating with `e2ebot` from external scripts, non-MCP agents, or across processes:

### 1. Ensure Daemon is Running
```bash
# Start daemon in background if not already active
node /home/drake/e2ebot/server.js
```
The server listens on `http://localhost:3000` (REST) and `ws://localhost:3000` (WebSockets).

### 2. Sending WebSocket Commands
Connect to `ws://localhost:3000` and send JSON frames:
```json
{
  "id": "action-101",
  "type": "goto",
  "url": "http://localhost:3000"
}
```
Supported message `type` values:
- `goto` (`url`)
- `click` (`selector`)
- `type` (`selector`, `text`)
- `getText` (`selector`)
- `screenshot`
- `getDOM`

### 3. Triggering Cypress via HTTP
```bash
curl -X POST http://localhost:3000/api/cypress/run \
  -H "Content-Type: application/json" \
  -d '{"spec": "sample"}'
```

---

## 📋 Recommended Workflow for Testing Apps in Development

When tasked with testing a feature or application under development:

1. **Verify Target Application Status**:
   - Ensure the application's dev server is active and accessible (e.g. `http://localhost:5173`, `http://localhost:8080`).
2. **Perform Exploratory Smoke Test**:
   - Call `puppeteer_goto` with the app URL.
   - Query key elements using `puppeteer_getText` or inspect layout with `puppeteer_getDOM`.
   - Interact with new components via `puppeteer_type` and `puppeteer_click`.
3. **Capture and Codify into Cypress**:
   - If a flow must be run repeatedly on code changes, write a spec file in `/home/drake/e2ebot/cypress/e2e/<feature>.cy.js`.
   - Run `cypress_run` to verify that the spec passes consistently.
4. **Report Results**:
   - Summarize passing tests, failed assertions, and any relevant DOM error messages.
