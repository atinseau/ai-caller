import { describe, expect, it, afterEach } from "bun:test";

import { getRootAccount } from "../../scripts/n8n/accounts";

describe("getRootAccount", () => {
  const originalUrl = process.env.N8N_URL;
  const originalKey = process.env.N8N_API_KEY;

  afterEach(() => {
    if (originalUrl) process.env.N8N_URL = originalUrl;
    else delete process.env.N8N_URL;
    if (originalKey) process.env.N8N_API_KEY = originalKey;
    else delete process.env.N8N_API_KEY;
  });

  it("returns host and apiKey from env", () => {
    process.env.N8N_URL = "http://localhost:5678";
    process.env.N8N_API_KEY = "test-key";

    const root = getRootAccount();
    expect(root.host).toBe("http://localhost:5678");
    expect(root.apiKey).toBe("test-key");
  });

  it("throws when N8N_URL is missing", () => {
    delete process.env.N8N_URL;
    process.env.N8N_API_KEY = "test-key";

    expect(() => getRootAccount()).toThrow("Missing N8N_URL or N8N_API_KEY");
  });

  it("throws when N8N_API_KEY is missing", () => {
    process.env.N8N_URL = "http://localhost:5678";
    delete process.env.N8N_API_KEY;

    expect(() => getRootAccount()).toThrow("Missing N8N_URL or N8N_API_KEY");
  });
});
