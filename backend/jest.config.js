module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/node_modules/**',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/',
    '/__tests__/',
    '/dist/',
  ],
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
  moduleNameMapper: {
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/../jest.setup.ts'],
};
