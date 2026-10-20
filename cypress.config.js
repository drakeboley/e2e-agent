const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:3000",
    supportFile: false,
    specPattern: process.env.CYPRESS_SPEC_PATTERN
      ? [process.env.CYPRESS_SPEC_PATTERN]
      : ["cypress/e2e/**/*.cy.js"],
    chromeWebSecurity: false,
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
  },
});
