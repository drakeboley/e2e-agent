const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const puppeteerService = require("./puppeteer-service");
const cypressService = require("./cypress-service");

// Create MCP server
const server = new McpServer({
    name: "e2ebot-testing",
    version: "1.0.0"
});

// Tool: puppeteer_goto
server.tool(
    "puppeteer_goto",
    "Navigate the browser to a URL",
    { url: z.string() },
    async ({ url }) => {
        const result = await puppeteerService.executeAction({ type: "goto", url });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// Tool: puppeteer_click
server.tool(
    "puppeteer_click",
    "Click an element matching the CSS selector",
    { selector: z.string() },
    async ({ selector }) => {
        const result = await puppeteerService.executeAction({ type: "click", selector });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// Tool: puppeteer_type
server.tool(
    "puppeteer_type",
    "Type text into an element matching the CSS selector",
    { selector: z.string(), text: z.string() },
    async ({ selector, text }) => {
        const result = await puppeteerService.executeAction({ type: "type", selector, text });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// Tool: puppeteer_getText
server.tool(
    "puppeteer_getText",
    "Get inner text of an element",
    { selector: z.string() },
    async ({ selector }) => {
        const result = await puppeteerService.executeAction({ type: "getText", selector });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// Tool: puppeteer_getDOM
server.tool(
    "puppeteer_getDOM",
    "Get the current HTML content of the page",
    {},
    async () => {
        const result = await puppeteerService.executeAction({ type: "getDOM" });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// Tool: puppeteer_smokeTest
server.tool(
    "puppeteer_smokeTest",
    "Run an automated smoke test on a URL, capturing console errors, failed network requests, and status",
    { url: z.string(), captureScreenshot: z.boolean().optional() },
    async ({ url, captureScreenshot }) => {
        const result = await puppeteerService.executeAction({ 
            type: "smokeTest", 
            url, 
            captureScreenshot: !!captureScreenshot 
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// Tool: cypress_run
server.tool(
    "cypress_run",
    "Run a Cypress spec file (e.g., 'sample' runs cypress/e2e/sample.cy.js) against an optional baseUrl (e.g. Netlify Deploy Preview URL)",
    { spec: z.string().optional(), baseUrl: z.string().optional() },
    async ({ spec, baseUrl }) => {
        const result = await cypressService.runSpec(spec, { baseUrl });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

async function main() {
    // Initialize browser first
    await puppeteerService.initBrowser();
    
    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    // Cleanup on exit
    process.on('SIGINT', async () => {
        await puppeteerService.closeBrowser();
        process.exit();
    });
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
