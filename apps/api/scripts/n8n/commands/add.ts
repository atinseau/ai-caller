import { addAccount } from "../accounts";
import { createClient } from "../client";

export async function add(args: string[]): Promise<void> {
  const name = extractFlag(args, "--name");
  const host = extractFlag(args, "--host");
  const key = extractFlag(args, "--key");

  if (!name || !host || !key) {
    console.error("Usage: bun n8n add --name <company> --host <url> --key <api-key>");
    process.exit(1);
  }

  console.log(`Validating API key against ${host}...`);
  const client = createClient(host, key);

  try {
    await client.listWorkflows();
  } catch {
    console.error("Failed to connect. Check the host URL and API key.");
    process.exit(1);
  }

  await addAccount(name, host, key);
  console.log(`Account "${name}" registered successfully.`);
}

function extractFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
}
