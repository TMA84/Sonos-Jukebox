// Cypress support file
import './commands';

// Prevent TypeScript errors
declare global {
  namespace Cypress {
    interface Chainable {
      login(pin: string): Chainable<void>;
    }
  }
}
