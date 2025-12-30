describe('Configuration Page', () => {
  beforeEach(() => {
    cy.visit('/config');
  });

  it('should require PIN to access config', () => {
    cy.get('[data-cy=pin-dialog]').should('be.visible');
  });

  it('should allow access with correct PIN', () => {
    cy.get('[data-cy=pin-input]').type('1234');
    cy.get('[data-cy=pin-submit]').click();
    cy.get('[data-cy=config-page]').should('be.visible');
  });

  it('should reject incorrect PIN', () => {
    cy.get('[data-cy=pin-input]').type('0000');
    cy.get('[data-cy=pin-submit]').click();
    cy.get('[data-cy=pin-error]').should('be.visible');
  });
});
