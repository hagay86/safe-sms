/**
 * Test setup — required env before any module that reads config loads. Real
 * integration against Postgres happens in tests that import the helpers from
 * `tests/helpers.ts`; pure unit tests can run without a DB.
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET ||= "test-secret-value-at-least-16-chars";
process.env.DATABASE_URL ||=
  process.env.TEST_DATABASE_URL ?? "postgresql://safesms:safesms@localhost:5432/safesms_test?schema=public";
process.env.LOG_LEVEL ||= "error";
