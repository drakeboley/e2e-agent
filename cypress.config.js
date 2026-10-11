const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "https://summondev.netlify.app",
    supportFile: false,
    specPattern: [
      "cypress/e2e/**/*.cy.js",
      "/home/drake/summon/cypress/e2e/**/*.cy.js"
    ],
    chromeWebSecurity: false,
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
  },
});
