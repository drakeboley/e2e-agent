const serverless = require('serverless-http');
const { app } = require('../../server');

const serverlessHandler = serverless(app);

exports.handler = async (event, context) => {
    if (event.path) {
        // Strip /.netlify/functions/api prefix from Netlify routing
        if (event.path.startsWith('/.netlify/functions/api')) {
            event.path = event.path.slice('/.netlify/functions/api'.length) || '/';
        }
        if (!event.path.startsWith('/')) {
            event.path = '/' + event.path;
        }
        // If path was redirected as /keys instead of /api/keys, ensure /api prefix for known API routes
        if (!event.path.startsWith('/api') && (
            event.path.startsWith('/keys') ||
            event.path.startsWith('/telemetry') ||
            event.path.startsWith('/billing') ||
            event.path.startsWith('/partner') ||
            event.path.startsWith('/compliance') ||
            event.path.startsWith('/tiers') ||
            event.path.startsWith('/puppeteer') ||
            event.path.startsWith('/cypress') ||
            event.path.startsWith('/webhooks') ||
            event.path.startsWith('/mcp')
        )) {
            event.path = '/api' + event.path;
        }
    }
    return serverlessHandler(event, context);
};
