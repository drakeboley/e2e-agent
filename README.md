# e2ebot — Localized End-to-End Web Testing Agent

`e2ebot` is a localized testing service designed for autonomous AI agents and developers to test web applications in real-time during development. It bridges live interactive browser control with deterministic regression testing.

---

## 🌟 Key Features

- **Real-Time Interactive Testing (Puppeteer)**: Low-latency browser control allowing agents to navigate, click, fill forms, query text, and inspect DOM structures on apps running in development.
- **Repeatable Regression Testing (Cypress)**: Programmatic triggering of Cypress E2E specs (`cypress.run()`) with structured JSON reporting and failure snapshots.
- **Dual Agent Communication Interfaces**:
  1. **Model Context Protocol (MCP)**: Native stdio-based integration enabling AI coding assistants and subagents to invoke browser tools directly via LLM function calling.
  2. **WebSocket & REST Server (Express + WS)**: Bidirectional socket protocol on port `3000` for external agents, scripts, or multi-agent orchestrators.

---

## 📁 Project Structure

```text
/home/drake/e2ebot/
├── server.js               # Express HTTP + WebSocket server daemon
├── puppeteer-service.js    # Headless Puppeteer browser controller
├── cypress-service.js      # Programmatic Cypress test runner
├── mcp-server.js           # Model Context Protocol (stdio) server
├── mcp_config.json         # MCP server registration config
├── test-client.js          # Example WebSocket agent client
├── cypress.config.js       # Cypress configuration
└── cypress/
    └── e2e/
        └── sample.cy.js    # Example Cypress test spec
```

---

## 🚀 Getting Started

### 1. Prerequisites & Installation

Ensure dependencies are installed:
```bash
cd /home/drake/e2ebot
npm install
```

> **Note on Chrome/Sandbox**: When running in isolated sandboxes or headless Linux servers, Puppeteer is configured with `--no-sandbox`, `--disable-setuid-sandbox`, and `--disable-dev-shm-usage`.

---

## 🔌 Interface 1: Model Context Protocol (MCP)

`e2ebot` can run as an MCP server (`mcp-server.js`) communicating over stdio.

### Registered Tools

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| `puppeteer_goto` | `url` (string) | Navigate the browser to a given target URL. |
| `puppeteer_click` | `selector` (string) | Wait for and click element matching CSS selector. |
| `puppeteer_type` | `selector` (string), `text` (string) | Wait for input and type text into element. |
| `puppeteer_getText` | `selector` (string) | Extract `innerText` of matching selector. |
| `puppeteer_getDOM` | _none_ | Retrieve full HTML content of current page. |
| `cypress_run` | `spec` (optional string) | Execute Cypress spec (e.g. `'sample'` runs `cypress/e2e/sample.cy.js`). |

### Registering with Antigravity / Gemini MCP

Add the server to `~/.gemini/config/mcp_config.json`:
```json
{
  "mcpServers": {
    "e2ebot-testing": {
      "command": "node",
      "args": ["/home/drake/e2ebot/mcp-server.js"],
      "env": {}
    }
  }
}
```

Once registered, agents can invoke tools directly using `call_mcp_tool`.

---

## 🌐 Interface 2: WebSocket & REST Server

For external agents or distributed processes, start the background server:

```bash
node server.js
```

The server binds to port `3000` (or `PORT` env var).

### Real-Time WebSocket Protocol (`ws://localhost:3000`)

Send JSON payloads with an optional `id` and an action `type`:

#### Navigate
```json
{
  "id": "req-1",
  "type": "goto",
  "url": "http://localhost:5173"
}
```

#### Click Element
```json
{
  "id": "req-2",
  "type": "click",
  "selector": "button#submit"
}
```

#### Type Input
```json
{
  "id": "req-3",
  "type": "type",
  "selector": "input#email",
  "text": "test@example.com"
}
```

#### Extract Text
```json
{
  "id": "req-4",
  "type": "getText",
  "selector": ".alert-message"
}
```

#### Screenshot (Base64)
```json
{
  "id": "req-5",
  "type": "screenshot"
}
```

#### Response Format
```json
{
  "actionId": "req-4",
  "success": true,
  "text": "Account created successfully"
}
```

### Programmatic Cypress Trigger (REST)

Trigger test runs via HTTP:
```bash
curl -X POST http://localhost:3000/api/cypress/run \
  -H "Content-Type: application/json" \
  -d '{"spec": "sample"}'
```

Returns full test metrics:
```json
{
  "success": true,
  "results": {
    "totalTests": 1,
    "totalPassed": 1,
    "totalFailed": 0,
    "runs": [...]
  }
}
```

---

## 🧪 Testing the Setup

Run the mock agent client to verify real-time WebSocket communication:
```bash
node test-client.js
```
