// jest.config.js
export default {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/db/connection.js'
  ],
  testMatch: [
    '**/__tests__/**/*.test.js'
  ]
};