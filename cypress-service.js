const cypress = require('cypress');

async function runSpec(specName) {
    try {
        console.error(`Running Cypress spec: ${specName || 'all'}`);
        const results = await cypress.run({
            spec: specName ? `cypress/e2e/${specName}.cy.js` : undefined,
            quiet: true
        });
        return results;
    } catch (error) {
        console.error('Cypress run failed:', error);
        throw error;
    }
}

module.exports = {
    runSpec
};
