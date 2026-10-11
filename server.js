const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const puppeteerService = require('./puppeteer-service');
const cypressService = require('./cypress-service');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(cors());

// REST endpoints for simple triggers
app.post('/api/cypress/run', async (req, res) => {
    const { spec } = req.body;
    try {
        const results = await cypressService.runSpec(spec);
        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// WebSocket for real-time Puppeteer control
wss.on('connection', (ws) => {
    console.log('New agent connected via WebSocket');

    ws.on('message', async (message) => {
        try {
            const action = JSON.parse(message);
            console.log('Received action:', action.type);
            
            // Execute puppeteer action
            const result = await puppeteerService.executeAction(action);
            
            // Send result back to the agent
            ws.send(JSON.stringify({
                actionId: action.id,
                ...result
            }));
        } catch (error) {
            ws.send(JSON.stringify({ success: false, error: 'Failed to process message' }));
        }
    });

    ws.on('close', () => {
        console.log('Agent disconnected');
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
    console.log(`Testing Agent Server running on port ${PORT}`);
    try {
        await puppeteerService.initBrowser();
        console.log('Puppeteer browser initialized');
    } catch (err) {
        console.error('Failed to initialize Puppeteer on startup:', err);
    }
});

// Cleanup on exit
process.on('SIGINT', async () => {
    console.log('Shutting down server and browser...');
    await puppeteerService.closeBrowser();
    process.exit();
});
