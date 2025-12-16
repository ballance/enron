# Testing Guide

Comprehensive testing strategy for the Enron Email Visualization project.

## Test Coverage Goals

- **Backend:** 60-80% coverage
- **Frontend:** 60-70% coverage
- **E2E:** Critical user flows

## Testing Stack

### Backend (Node.js/Express)
- **Jest** - Test runner and assertions
- **Supertest** - HTTP assertions for Express
- **ioredis-mock** - Mock Redis for tests

### Frontend (React/Vite)
- **Vitest** - Fast Vite-native test runner
- **React Testing Library** - Component testing
- **jsdom** - DOM implementation for tests
- **@testing-library/jest-dom** - Custom matchers

### E2E (Full Application)
- **Playwright** - Cross-browser E2E testing

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (auto-rerun on changes)
npm run test:watch
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Interactive UI
npm run test:ui
```

### E2E Tests

```bash
cd e2e

# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E tests
npm test

# Run in headed mode (see browser)
npm run test:headed

# Run with UI mode
npm run test:ui

# Debug mode
npm run test:debug

# View HTML report
npm run report
```

## Test Structure

### Backend Tests

```
backend/
├── src/
│   ├── __tests__/
│   │   ├── unit/              # Unit tests
│   │   └── integration/        # API integration tests
│   ├── config/__tests__/       # Config tests
│   ├── middleware/__tests__/   # Middleware tests
│   ├── services/__tests__/     # Service layer tests (Phase 2+)
│   └── utils/__tests__/        # Utility function tests
└── jest.config.js
```

### Frontend Tests

```
frontend/
├── src/
│   ├── api/__tests__/          # API client tests
│   ├── components/
│   │   └── **/__tests__/       # Component tests
│   ├── views/__tests__/        # View/page tests
│   ├── hooks/__tests__/        # Custom hook tests (Phase 2+)
│   ├── store/__tests__/        # State management tests (Phase 3+)
│   └── test/
│       └── setup.js            # Test configuration
└── vitest.config.js
```

### E2E Tests

```
e2e/
├── tests/
│   ├── navigation.spec.js      # Navigation flows
│   ├── api-health.spec.js      # API health checks
│   └── responsive.spec.js      # Responsive design
└── playwright.config.js
```

## Current Test Coverage

### Backend
✅ **Utilities** (100%)
- `pagination.js` - All edge cases covered
  - Default values
  - Query param parsing
  - Min/max enforcement
  - Offset calculation
  - Pagination metadata

✅ **Middleware** (100%)
- `errorHandler.js` - Error handling
  - ApiError class
  - Status code handling
  - Development vs production modes
  - Async error catching

✅ **Integration** (100%)
- Server endpoints
  - `/health` - Health checks
  - `/api` - API info
  - 404 handling
  - CORS headers
  - JSON parsing

### Frontend
✅ **Components** (100%)
- `Layout.jsx` - Navigation and layout
  - Title rendering
  - Navigation links
  - Active state
  - Footer stats
  - Children rendering

✅ **Views** (Basic)
- `Dashboard.jsx` - Placeholder tests
  - Title rendering
  - Content structure

✅ **API Client**
- Axios configuration
- Interceptors

### E2E
✅ **Navigation** (100%)
- Page navigation
- Active states
- Header/footer on all pages

✅ **API Health** (100%)
- Backend health endpoint
- Database health
- Redis health
- API info endpoint

✅ **Responsive** (100%)
- Desktop layout
- Tablet layout
- Mobile layout

## Writing Tests

### Backend Unit Test Example

```javascript
import { getPaginationParams } from '../pagination.js';

describe('getPaginationParams', () => {
  it('should return default values', () => {
    const req = { query: {} };
    const result = getPaginationParams(req);

    expect(result).toEqual({
      page: 1,
      limit: 50,
      offset: 0
    });
  });
});
```

### Frontend Component Test Example

```javascript
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout';

it('should render title', () => {
  render(
    <BrowserRouter>
      <Layout>
        <div>Content</div>
      </Layout>
    </BrowserRouter>
  );

  expect(screen.getByText('Enron Email Visualization')).toBeInTheDocument();
});
```

### E2E Test Example

```javascript
import { test, expect } from '@playwright/test';

test('should navigate to dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

## Test-Driven Development (TDD)

For new features in Phases 2-7, follow this approach:

1. **Write the test first** (Red)
   - Define expected behavior
   - Test should fail initially

2. **Implement the feature** (Green)
   - Write minimal code to pass test
   - Test should now pass

3. **Refactor** (Refactor)
   - Clean up code
   - Tests should still pass

### Example: Adding Analytics Service (Phase 2)

```javascript
// 1. Write test first (backend/src/services/__tests__/analyticsService.test.js)
describe('analyticsService', () => {
  it('should get overall stats', async () => {
    const stats = await getOverallStats();

    expect(stats).toHaveProperty('totalPeople');
    expect(stats).toHaveProperty('totalMessages');
    expect(stats).toHaveProperty('totalThreads');
  });
});

// 2. Implement feature (backend/src/services/analyticsService.js)
export const getOverallStats = async () => {
  // Implementation here
};

// 3. Refactor if needed
```

## Coverage Reports

### Viewing Coverage

**Backend:**
```bash
cd backend
npm run test:coverage
open coverage/index.html
```

**Frontend:**
```bash
cd frontend
npm run test:coverage
open coverage/index.html
```

### Coverage Thresholds

Both backend and frontend enforce minimum 60% coverage:
- Lines: 60%
- Functions: 60%
- Branches: 60%
- Statements: 60%

Tests will **fail** if coverage drops below these thresholds.

## CI/CD Integration

### GitHub Actions (Future)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd backend && npm ci
      - run: cd backend && npm test:coverage

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && npm ci
      - run: cd frontend && npm test:coverage

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: docker-compose up -d
      - run: cd e2e && npm ci
      - run: cd e2e && npx playwright install
      - run: cd e2e && npm test
```

## Debugging Tests

### Backend (Jest)

```bash
# Run specific test file
npm test pagination.test.js

# Run tests matching pattern
npm test -- --testNamePattern="pagination"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Frontend (Vitest)

```bash
# Run specific test file
npm test -- Layout.test.jsx

# Debug with UI
npm run test:ui
```

### E2E (Playwright)

```bash
# Debug mode (opens inspector)
npm run test:debug

# Run specific test
npx playwright test navigation.spec.js

# Run in headed mode to see browser
npm run test:headed
```

## Best Practices

### General
- ✅ Test behavior, not implementation
- ✅ Use descriptive test names
- ✅ One assertion per test (when possible)
- ✅ Clean up after tests (mocks, spies, etc.)
- ✅ Keep tests independent
- ❌ Don't test external libraries
- ❌ Don't test implementation details

### Backend
- ✅ Mock database calls in unit tests
- ✅ Use real database in integration tests
- ✅ Test error cases
- ✅ Test edge cases
- ✅ Use Supertest for API tests

### Frontend
- ✅ Render components in isolation
- ✅ Query by user-facing attributes (roles, labels)
- ✅ Test user interactions
- ✅ Mock API calls
- ❌ Don't query by CSS classes
- ❌ Don't test implementation details

### E2E
- ✅ Test critical user flows
- ✅ Test happy paths
- ✅ Test error scenarios
- ✅ Keep tests fast and focused
- ❌ Don't over-test (unit/integration covers details)

## Mocking Strategies

### Backend - Mock Database

```javascript
import pool from '../config/database.js';

jest.mock('../config/database.js', () => ({
  query: jest.fn()
}));

it('should query database', async () => {
  pool.query.mockResolvedValue({ rows: [{ count: 100 }] });
  // Test code
});
```

### Backend - Mock Redis

```javascript
import redis from '../config/redis.js';

jest.mock('ioredis');

it('should cache data', async () => {
  redis.get.mockResolvedValue(null);
  redis.setex.mockResolvedValue('OK');
  // Test code
});
```

### Frontend - Mock API

```javascript
import { vi } from 'vitest';
import apiClient from '../api/client';

vi.mock('../api/client');

it('should fetch data', async () => {
  apiClient.get.mockResolvedValue({ data: { stats: {} } });
  // Test code
});
```

## Next Steps

As we implement Phases 2-7, we'll add tests for:

**Phase 2:**
- Analytics service tests
- People service tests
- Dashboard component tests with real data

**Phase 3:**
- Network service tests
- Network graph component tests
- Zustand store tests

**Phase 4:**
- Timeline service tests
- Chart component tests
- D3 visualization tests

**Phase 5:**
- Thread service tests
- Thread tree component tests
- Message service tests

**Phase 6:**
- Person detail tests
- Ego network tests

**Phase 7:**
- Search service tests
- Search component tests
- E2E search flows

## Troubleshooting

### "Cannot find module" errors
Ensure `type: "module"` is in package.json and using `.js` extensions in imports.

### Tests timing out
Increase timeout in test:
```javascript
it('slow test', async () => {
  // ...
}, 10000); // 10 second timeout
```

### Database connection errors in tests
Mock the database connection or use test database.

### Frontend tests fail with "document is not defined"
Ensure `environment: 'jsdom'` in vitest.config.js

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
