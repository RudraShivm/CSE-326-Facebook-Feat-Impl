/**
 * Jest configuration for backend tests.
 *
 * Jest is a testing framework. This file tells Jest:
 * - Use ts-jest to handle TypeScript files
 * - Look for test files in src/__tests__/
 * - Set a 30-second timeout for each test
 */

export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  testTimeout: 30000,
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  verbose: true,
};
