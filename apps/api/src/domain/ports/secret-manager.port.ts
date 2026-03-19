export abstract class SecretManagerPort {
  abstract getSecret(name: string, path?: string): Promise<string>;
  abstract setSecret(name: string, value: string, path?: string): Promise<void>;
  abstract deleteSecret(name: string, path?: string): Promise<void>;
  abstract listSecrets(path?: string): Promise<Map<string, string>>;
  abstract listFolders(path?: string): Promise<string[]>;
}
