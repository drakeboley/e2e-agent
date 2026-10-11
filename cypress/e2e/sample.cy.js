describe('Sample Testing Flow', () => {
  it('Visits a test page and asserts title', () => {
    cy.visit('https://example.com');
    cy.title().should('include', 'Example Domain');
    cy.get('h1').should('have.text', 'Example Domain');
  });
});
