# Contributing to Sonos Jukebox

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- Docker (optional, for containerized development)

### Getting Started

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/sonos-jukebox.git
   cd sonos-jukebox
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

   This starts both the Angular dev server and the Node.js backend with hot reload.

## Code Style

We use ESLint and Prettier to maintain code quality:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example:
```
feat: add album search functionality
fix: resolve infinite scroll loading issue
docs: update API documentation
```

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov
```

### E2E Tests

```bash
# Run Cypress tests
npm run test:e2e

# Open Cypress UI
npm run test:e2e:open
```

### Writing Tests

- Place unit tests next to the file they test: `component.spec.ts`
- Place E2E tests in `cypress/e2e/`
- Aim for >80% code coverage
- Test edge cases and error scenarios

## Pull Request Process

1. **Create a Branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make Changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   npm run lint
   npm test
   npm run build
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feat/your-feature-name
   ```

5. **Open Pull Request**
   - Provide a clear description of changes
   - Reference any related issues
   - Ensure CI checks pass

## Project Structure

```
sonos-jukebox/
├── src/                    # Angular frontend
│   ├── app/
│   │   ├── store/         # NgRx state management
│   │   ├── services/      # Angular services
│   │   └── components/    # UI components
│   └── environments/      # Environment configs
├── server/                # Node.js backend
│   └── src/
│       ├── database/      # TypeORM entities & migrations
│       ├── services/      # Business logic
│       ├── routes/        # API endpoints
│       └── middleware/    # Express middleware
├── cypress/               # E2E tests
└── docs/                  # Documentation
```

## Backend Development

### Adding a New API Endpoint

1. **Create Service** (`server/src/services/`)
   ```typescript
   export class MyService {
     async doSomething() {
       // Business logic here
     }
   }
   ```

2. **Create Route** (`server/src/routes/`)
   ```typescript
   export const myRouter = Router();
   const myService = new MyService();

   myRouter.get('/endpoint', async (req, res, next) => {
     try {
       const result = await myService.doSomething();
       res.json(result);
     } catch (error) {
       next(error);
     }
   });
   ```

3. **Register Route** (`server/src/routes/index.ts`)
   ```typescript
   apiRouter.use('/my-resource', myRouter);
   ```

4. **Add Swagger Documentation**
   ```typescript
   /**
    * @swagger
    * /api/my-resource/endpoint:
    *   get:
    *     summary: Description
    *     tags: [MyResource]
    */
   ```

### Database Migrations

```bash
# Create new migration
npm run migrate:create

# Run migrations
npm run migrate:run
```

## Frontend Development

### Adding a New Component

```bash
ng generate component my-component
```

### Using NgRx Store

1. **Define State** (`src/app/store/feature/feature.state.ts`)
2. **Create Actions** (`src/app/store/feature/feature.actions.ts`)
3. **Create Reducer** (`src/app/store/feature/feature.reducer.ts`)
4. **Create Selectors** (`src/app/store/feature/feature.selectors.ts`)
5. **Create Effects** (if needed) (`src/app/store/feature/feature.effects.ts`)

## Documentation

- Update README.md for user-facing changes
- Update API documentation in Swagger comments
- Add JSDoc comments for complex functions
- Update MIGRATION_GUIDE.md for breaking changes

## Security

- Never commit sensitive data (API keys, passwords)
- Use environment variables for configuration
- Validate all user inputs
- Follow OWASP security guidelines
- Report security issues privately to maintainers

## Performance

- Optimize database queries
- Use lazy loading for Angular modules
- Implement caching where appropriate
- Profile and benchmark critical paths

## Questions?

- Open an issue for bugs or feature requests
- Join our Discord for discussions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.
