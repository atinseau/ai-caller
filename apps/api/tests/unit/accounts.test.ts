import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We test the account logic by importing the module functions
// and overriding the file paths via a test helper approach.
// Since accounts.ts uses hardcoded paths, we test the sanitize/restore
// logic and the getRootAccount env-based function.

import { getRootAccount } from "../../scripts/n8n/accounts";

describe("getRootAccount", () => {
  const originalHost = process.env.N8N_HOST;
  const originalPort = process.env.N8N_PORT;
  const originalKey = process.env.N8N_API_KEY;

  afterEach(() => {
    // Restore env
    if (originalHost) process.env.N8N_HOST = originalHost;
    else delete process.env.N8N_HOST;
    if (originalPort) process.env.N8N_PORT = originalPort;
    else delete process.env.N8N_PORT;
    if (originalKey) process.env.N8N_API_KEY = originalKey;
    else delete process.env.N8N_API_KEY;
  });

  it("returns host and apiKey from env", () => {
    process.env.N8N_HOST = "http://localhost";
    process.env.N8N_PORT = "5678";
    process.env.N8N_API_KEY = "test-key";

    const root = getRootAccount();
    expect(root.host).toBe("http://localhost:5678");
    expect(root.apiKey).toBe("test-key");
  });

  it("returns host without port when N8N_PORT is not set", () => {
    process.env.N8N_HOST = "https://n8n.example.com";
    delete process.env.N8N_PORT;
    process.env.N8N_API_KEY = "test-key";

    const root = getRootAccount();
    expect(root.host).toBe("https://n8n.example.com");
  });

  it("throws when N8N_HOST is missing", () => {
    delete process.env.N8N_HOST;
    process.env.N8N_API_KEY = "test-key";

    expect(() => getRootAccount()).toThrow("Missing N8N_HOST or N8N_API_KEY");
  });

  it("throws when N8N_API_KEY is missing", () => {
    process.env.N8N_HOST = "http://localhost";
    delete process.env.N8N_API_KEY;

    expect(() => getRootAccount()).toThrow("Missing N8N_HOST or N8N_API_KEY");
  });
});
