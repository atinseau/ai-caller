import { beforeAll, mock } from "bun:test";
import process from "node:process";
import { env } from "../src/infrastructure/config/env.ts";

// Set dummy keys for providers that may not be configured in test env
if (!process.env.XAI_API_KEY) {
  process.env.XAI_API_KEY = "test-xai-key";
}

await env.init();

// Silence pino logger in tests
mock.module("pino", () => {
  const noop = () => {
    /* noop */
  };
  const noopLogger = {
    info: noop,
    error: noop,
    warn: noop,
    debug: noop,
    trace: noop,
    fatal: noop,
    child: () => noopLogger,
    level: "silent",
  };
  return { pino: () => noopLogger, default: () => noopLogger };
});

beforeAll(() => {
  console.log = mock();
  console.error = mock();
  console.warn = mock();
  console.debug = mock();
});
