import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  setDefaultTimeout,
} from "bun:test";
import process from "node:process";
import { InfisicalSecretAdapter } from "@/infrastructure/secret/infisical-secret.adapter.ts";

const hasInfisical =
  !!process.env.INFISICAL_CLIENT_ID &&
  !!process.env.INFISICAL_CLIENT_SECRET &&
  !!process.env.INFISICAL_PROJECT_ID;

setDefaultTimeout(15_000);

describe.skipIf(!hasInfisical)("InfisicalSecretAdapter", () => {
  let adapter: InfisicalSecretAdapter;
  const testSecretName = `TEST_SECRET_${Date.now()}`;
  const testSecretValue = "test-value-12345";
  const updatedSecretValue = "updated-value-67890";

  beforeAll(async () => {
    adapter = new InfisicalSecretAdapter();
    await adapter.login();
  });

  afterAll(async () => {
    try {
      await adapter.deleteSecret(testSecretName);
    } catch {
      // Already deleted or never created
    }
  });

  it("creates a secret via setSecret", async () => {
    await adapter.setSecret(testSecretName, testSecretValue);

    const value = await adapter.getSecret(testSecretName);
    expect(value).toBe(testSecretValue);
  });

  it("retrieves the secret via getSecret", async () => {
    const value = await adapter.getSecret(testSecretName);
    expect(value).toBe(testSecretValue);
  });

  it("lists secrets and includes the test secret", async () => {
    const secrets = await adapter.listSecrets();
    expect(secrets.get(testSecretName)).toBe(testSecretValue);
  });

  it("updates an existing secret via setSecret", async () => {
    await adapter.setSecret(testSecretName, updatedSecretValue);

    const value = await adapter.getSecret(testSecretName);
    expect(value).toBe(updatedSecretValue);
  });

  it("deletes the secret", async () => {
    await adapter.deleteSecret(testSecretName);

    const secrets = await adapter.listSecrets();
    expect(secrets.has(testSecretName)).toBe(false);
  });

  it("throws when getting a non-existent secret", async () => {
    await expect(
      adapter.getSecret("NON_EXISTENT_SECRET_xyz"),
    ).rejects.toThrow();
  });
});
