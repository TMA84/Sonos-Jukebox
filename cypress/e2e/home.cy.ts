describe('Home Page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display the home page', () => {
    cy.contains('Sonos Jukebox');
  });

  it('should show media categories', () => {
    cy.get('[data-cy=category-tabs]').should('exist');
  });

  it('should allow switching between categories', () => {
    cy.get('[data-cy=category-audiobook]').click();
    cy.url().should('include', 'category=audiobook');
  });

  it('should display media items', () => {
    cy.get('[data-cy=media-grid]').should('exist');
  });
});
