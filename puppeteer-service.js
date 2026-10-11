const puppeteer = require('puppeteer');

let browser;
let page;

async function initBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({ 
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-crash-reporter'
            ] 
        });
        page = await browser.newPage();
    }
    return page;
}

async function executeAction(action) {
    if (!page) await initBrowser();
    
    try {
        switch (action.type) {
            case 'goto':
                await page.goto(action.url, { waitUntil: 'networkidle2' });
                return { success: true, url: action.url };
            case 'click':
                await page.waitForSelector(action.selector);
                await page.click(action.selector);
                return { success: true };
            case 'type':
                await page.waitForSelector(action.selector);
                await page.type(action.selector, action.text);
                return { success: true };
            case 'getText':
                await page.waitForSelector(action.selector);
                const text = await page.$eval(action.selector, el => el.innerText);
                return { success: true, text };
            case 'screenshot':
                const screenshot = await page.screenshot({ encoding: 'base64' });
                return { success: true, screenshot };
            case 'getDOM':
                const html = await page.content();
                return { success: true, html };
            default:
                return { success: false, error: 'Unknown action type: ' + action.type };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
        page = null;
    }
}

module.exports = {
    initBrowser,
    executeAction,
    closeBrowser
};
