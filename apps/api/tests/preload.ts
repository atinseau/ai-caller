import { beforeAll, mock } from "bun:test";
import { env } from "../src/infrastructure/config/env.ts";

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
