/// <reference types="cypress" />

Cypress.Commands.add('login', (pin: string) => {
  cy.visit('/config');
  cy.get('[data-cy=pin-input]').type(pin);
  cy.get('[data-cy=pin-submit]').click();
});
