# Testing

This directory contains test files and testing documentation for WatchTower.

## Purpose

Testing ensures code quality, catches regressions, and provides confidence when refactoring. We test at multiple levels:

- **Unit Tests** – Individual functions and components
- **Integration Tests** – SDK and API interactions
- **End-to-End Tests** – Full user workflows through the dashboard
- **Performance Tests** – Validate monitoring overhead and dashboard responsiveness

## Test Structure

*(To be populated as tests are implemented)*

## Testing Strategy

### Unit Tests
- Test SDK functions in isolation
- Validate error capture logic
- Test utility functions and helpers
- Aim for >80% coverage of critical paths

### Integration Tests
- Test SDK → API communication
- Validate event storage and retrieval
- Test dashboard data flow
- Verify error categorization

### End-to-End Tests
- Complete user workflows (error occurrence → dashboard view)
- Dashboard filtering and search
- Real-time updates and streaming

### Performance Tests
- SDK overhead on client
- API response times
- Dashboard rendering performance
- Memory usage under load

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suite
```bash
npm test -- tests/unit
npm test -- tests/integration
npm test -- tests/e2e
```

### Watch Mode (during development)
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm test -- --coverage
```

## Test Coverage

| Component | Target | Current |
|-----------|--------|---------|
| SDK | 80% | *(To be added)* |
| API | 80% | *(To be added)* |
| Dashboard | 70% | *(To be added)* |
| Utils | 90% | *(To be added)* |

## Writing Tests

### Test Organization

```
tests/
├── unit/
│   ├── sdk.test.js
│   ├── utils.test.js
│   └── ...
├── integration/
│   ├── api.test.js
│   ├── sdk-api.test.js
│   └── ...
└── e2e/
    ├── dashboard.test.js
    └── ...
```

### Best Practices

- **Clear names** – Describe what is being tested
- **Arrange-Act-Assert** – Use AAA pattern for test structure
- **One assertion per test** – Keep tests focused
- **Mock external dependencies** – Isolate what you're testing
- **Test behavior, not implementation** – Focus on outcomes, not how it's done
- **Use fixtures** – Create reusable test data

### Example Test

```javascript
describe('SDK.captureError', () => {
  it('should capture error with stack trace', () => {
    // Arrange
    const error = new Error('Test error');
    const sdk = new WatchTower();

    // Act
    sdk.captureError(error);

    // Assert
    expect(sdk.events).toContainEqual(
      expect.objectContaining({
        type: 'error',
        message: 'Test error'
      })
    );
  });
});
```

## Continuous Integration

Tests run automatically on:
- Every pull request
- Push to main branch
- Scheduled daily runs

See [.github/workflows/](../.github/workflows/) for CI configuration.

## Contributing

When you implement a feature:

1. **Write tests first** (or at least alongside code)
2. **Run all tests** before committing
3. **Check coverage** – Aim to maintain or improve it
4. **Document test cases** – Explain complex test logic

See [docs/README.md](../docs/README.md) for general contribution guidelines.

## Related Documentation

- [Development Workflow](../docs/process/workflow.md)
- [Git Workflow](../docs/process/git-workflow.md)
- [Project Overview](../README.md)