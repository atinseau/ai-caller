import { join } from "node:path";
import { homedir } from "node:os";
import { mkdir } from "node:fs/promises";

export interface Account {
  name: string;
  host: string;
}

interface CredentialStore {
  [accountName: string]: { apiKey: string };
}

const ACCOUNTS_PATH = join(import.meta.dir, "../../n8n/accounts.json");
const CREDENTIALS_DIR = join(homedir(), ".config", "n8nac");
const CREDENTIALS_PATH = join(CREDENTIALS_DIR, "credentials.json");

export async function getAccounts(): Promise<Account[]> {
  const file = Bun.file(ACCOUNTS_PATH);
  if (!(await file.exists())) return [];
  return file.json();
}

export async function getAccount(name: string): Promise<Account> {
  const accounts = await getAccounts();
  const account = accounts.find((a) => a.name === name);
  if (!account) throw new Error(`Account "${name}" not found`);
  return account;
}

export async function addAccount(
  name: string,
  host: string,
  apiKey: string,
): Promise<void> {
  const accounts = await getAccounts();
  if (accounts.some((a) => a.name === name)) {
    throw new Error(`Account "${name}" already exists`);
  }

  accounts.push({ name, host });
  await Bun.write(ACCOUNTS_PATH, JSON.stringify(accounts, null, 2));

  await mkdir(CREDENTIALS_DIR, { recursive: true });
  const credentials = await readCredentials();
  credentials[name] = { apiKey };
  await Bun.write(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
}

export async function getCredentials(name: string): Promise<string> {
  const credentials = await readCredentials();
  const entry = credentials[name];
  if (!entry) throw new Error(`No credentials found for account "${name}"`);
  return entry.apiKey;
}

export function getRootAccount(): { host: string; apiKey: string } {
  const host = process.env.N8N_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!host || !apiKey) {
    throw new Error("Missing N8N_URL or N8N_API_KEY in environment");
  }

  return { host, apiKey };
}

async function readCredentials(): Promise<CredentialStore> {
  const file = Bun.file(CREDENTIALS_PATH);
  if (!(await file.exists())) return {};
  return file.json();
}
