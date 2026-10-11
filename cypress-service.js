const cypress = require('cypress');

async function runSpec(specName) {
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    try {
        console.error(`Running Cypress spec: ${specName || 'all'}`);
        process.stdout.write = process.stderr.write.bind(process.stderr);
        const results = await cypress.run({
            spec: specName ? `cypress/e2e/${specName}.cy.js` : undefined,
            quiet: true
        });
        return results;
    } catch (error) {
        console.error('Cypress run failed:', error);
        throw error;
    } finally {
        process.stdout.write = originalStdoutWrite;
    }
}

module.exports = {
    runSpec
};
