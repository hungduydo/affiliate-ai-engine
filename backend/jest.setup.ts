// Global Jest setup file
// This runs once before all tests

// Suppress console logs during tests (optional)
const originalError = console.error;
const originalLog = console.log;
const originalWarn = console.warn;

beforeAll(() => {
  // Uncomment to suppress logs in tests:
  // console.error = jest.fn();
  // console.log = jest.fn();
  // console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.log = originalLog;
  console.warn = originalWarn;
});

// Set longer timeout for async tests
jest.setTimeout(10000);
