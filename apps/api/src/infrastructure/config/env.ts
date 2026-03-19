import process from "node:process";
import z from "zod";
import { Environment } from "@/domain/enums/environment.enum.ts";

// Load .env only in non-production environments
// Uses require() to avoid ESM module graph issues with circular imports
const environment =
  (process.env.ENVIRONMENT as Environment) ?? Environment.LOCAL;
if (environment !== Environment.PROD) {
  const { resolve } = require("node:path");
  const { config } = require("dotenv");
  const { expand } = require("dotenv-expand");
  expand(
    config({ path: resolve(import.meta.dir, "../../../.env"), quiet: true }),
  );
}

const envDto = z.object({
  // SERVER
  ENVIRONMENT: z.nativeEnum(Environment).default(Environment.LOCAL),
  PORT: z.coerce.number(),
  CLIENT_URL: z.url(),

  // DATABASE
  DATABASE_URL: z.url({ protocol: /^postgres$/u }),

  // OPENAI
  OPENAI_API_KEY: z.string(),

  // GOOGLE
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  // N8N
  N8N_URL: z.string(),
  N8N_API_KEY: z.string(),

  // INFISICAL (optional)
  INFISICAL_CLIENT_ID: z.string().optional(),
  INFISICAL_CLIENT_SECRET: z.string().optional(),
  INFISICAL_PROJECT_ID: z.string().optional(),
  INFISICAL_SITE_URL: z.string().optional(),
  INFISICAL_ENVIRONMENT: z.string().default("dev"),

  // CONFIG
  ROOM_CALL_DURATION_MINUTE: z.coerce.number().positive(),
  SUB_AGENT_MODEL: z.string().default("gpt-4o-mini"),
  ROOT_EMAIL: z.email(),
});

class Env {
  private env: z.infer<typeof envDto> | null = null;

  private resolve(): z.infer<typeof envDto> {
    if (!this.env) {
      this.env = this.parse(process.env);
    }
    return this.env;
  }

  get<T extends keyof z.infer<typeof envDto>>(key: T) {
    return this.resolve()[key];
  }

  set<T extends keyof z.infer<typeof envDto>>(
    key: T,
    value: z.infer<typeof envDto>[T],
  ) {
    this.env = this.parse({
      ...this.resolve(),
      [key]: value,
    });
  }

  /**
   * Fetch secrets from Infisical and merge them into the env.
   * Call before server start or tests. No-op if INFISICAL_* vars are not set.
   */
  async init(): Promise<void> {
    const clientId = process.env.INFISICAL_CLIENT_ID;
    const clientSecret = process.env.INFISICAL_CLIENT_SECRET;
    const projectId = process.env.INFISICAL_PROJECT_ID;
    if (!clientId || !clientSecret || !projectId) return;

    const { InfisicalSDK } = await import("@infisical/sdk");
    const client = new InfisicalSDK({
      siteUrl: process.env.INFISICAL_SITE_URL,
    });

    await client.auth().universalAuth.login({ clientId, clientSecret });

    const infisicalEnv = process.env.INFISICAL_ENVIRONMENT ?? "dev";
    const result = await client.secrets().listSecrets({
      environment: infisicalEnv,
      projectId,
      secretPath: "/",
      expandSecretReferences: true,
      viewSecretValue: true,
    });

    const secrets: Record<string, string> = {};
    for (const secret of result.secrets) {
      secrets[secret.secretKey] = secret.secretValue;
    }

    // Merge: Infisical secrets override process.env
    Object.assign(process.env, secrets);
    // Reset parsed env so next get() re-parses with new values
    this.env = null;
  }

  private parse(data: unknown) {
    const result = envDto.safeParse(data);
    if (result.error) {
      throw new Error(z.prettifyError(result.error));
    }
    return result.data;
  }
}

export const env = new Env();
