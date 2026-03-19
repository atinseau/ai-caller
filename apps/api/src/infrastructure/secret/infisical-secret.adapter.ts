import { InfisicalSDK } from "@infisical/sdk";
import { injectable } from "inversify";
import { SecretManagerPort } from "@/domain/ports/secret-manager.port.ts";
import { env } from "@/infrastructure/config/env.ts";

@injectable()
export class InfisicalSecretAdapter extends SecretManagerPort {
  private client: InfisicalSDK;
  private projectId: string;
  private environment: string;

  constructor() {
    super();
    this.client = new InfisicalSDK({
      siteUrl: env.get("INFISICAL_SITE_URL"),
    });
    const projectId = env.get("INFISICAL_PROJECT_ID");
    if (!projectId) throw new Error("INFISICAL_PROJECT_ID is required");
    this.projectId = projectId;
    this.environment = env.get("INFISICAL_ENVIRONMENT");
  }

  async login(): Promise<void> {
    const clientId = env.get("INFISICAL_CLIENT_ID");
    const clientSecret = env.get("INFISICAL_CLIENT_SECRET");
    if (!clientId || !clientSecret)
      throw new Error(
        "INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET are required",
      );
    await this.client.auth().universalAuth.login({ clientId, clientSecret });
  }

  async getSecret(name: string, path = "/"): Promise<string> {
    const secret = await this.client.secrets().getSecret({
      environment: this.environment,
      projectId: this.projectId,
      secretName: name,
      secretPath: path,
      expandSecretReferences: true,
      viewSecretValue: true,
    });
    return secret.secretValue;
  }

  async setSecret(name: string, value: string, path = "/"): Promise<void> {
    try {
      await this.client.secrets().updateSecret(name, {
        environment: this.environment,
        projectId: this.projectId,
        secretValue: value,
        secretPath: path,
      });
    } catch {
      await this.client.secrets().createSecret(name, {
        environment: this.environment,
        projectId: this.projectId,
        secretValue: value,
        secretPath: path,
      });
    }
  }

  async deleteSecret(name: string, path = "/"): Promise<void> {
    await this.client.secrets().deleteSecret(name, {
      environment: this.environment,
      projectId: this.projectId,
      secretPath: path,
    });
  }

  async listSecrets(path = "/"): Promise<Map<string, string>> {
    const result = await this.client.secrets().listSecrets({
      environment: this.environment,
      projectId: this.projectId,
      secretPath: path,
      expandSecretReferences: true,
      viewSecretValue: true,
    });

    const secrets = new Map<string, string>();
    for (const secret of result.secrets) {
      secrets.set(secret.secretKey, secret.secretValue);
    }
    return secrets;
  }

  async listFolders(path = "/"): Promise<string[]> {
    const result = await this.client.folders().listFolders({
      environment: this.environment,
      projectId: this.projectId,
      path,
    });
    return result.map((folder) => folder.name);
  }
}
