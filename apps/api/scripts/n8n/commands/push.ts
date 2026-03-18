import { join } from "node:path";
import { createClient } from "../client";
import { getAccount, getCredentials } from "../accounts";
import { prepareForPush, type GenericWorkflow } from "../sanitize";

const WORKFLOWS_DIR = join(import.meta.dir, "../../../n8n/workflows");

export async function push(company: string, file: string): Promise<void> {
  const account = await getAccount(company);
  const apiKey = await getCredentials(company);
  const client = createClient(account.host, apiKey);

  const filepath = file.endsWith(".json")
    ? join(WORKFLOWS_DIR, file)
    : join(WORKFLOWS_DIR, `${file}.json`);

  const content = await Bun.file(filepath).json() as GenericWorkflow;
  const payload = prepareForPush(content);

  const existing = await client.listWorkflows();
  const match = existing.find((w) => w.name === content.name);

  if (match) {
    console.log(`Workflow "${content.name}" already exists (ID: ${match.id}), updating...`);
    await client.updateWorkflow(match.id, payload);
    console.log(`Updated workflow "${content.name}" on ${company}`);
  } else {
    const created = await client.createWorkflow(payload);
    console.log(`Created workflow "${content.name}" on ${company} (ID: ${created.id})`);
  }

  console.log(`\nThe client must assign their credentials in the n8n UI.`);
}
