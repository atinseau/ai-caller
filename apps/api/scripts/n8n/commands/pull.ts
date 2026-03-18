import { join } from "node:path";
import { createClient } from "../client";
import { getAccount, getCredentials, getRootAccount } from "../accounts";
import { sanitizeWorkflow } from "../sanitize";

const WORKFLOWS_DIR = join(import.meta.dir, "../../../n8n/workflows");

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolveAccount(from?: string) {
  if (from) {
    return getAccount(from).then(async (account) => ({
      host: account.host,
      apiKey: await getCredentials(from),
      label: from,
    }));
  }
  const root = getRootAccount();
  return { host: root.host, apiKey: root.apiKey, label: "root" };
}

async function pullOne(
  client: ReturnType<typeof createClient>,
  id: string,
): Promise<void> {
  const workflow = await client.getWorkflow(id);
  const generic = sanitizeWorkflow(workflow);

  const filename = `${slugify(workflow.name)}.json`;
  const filepath = join(WORKFLOWS_DIR, filename);

  await Bun.write(filepath, JSON.stringify(generic, null, 2));
  console.log(`  ${workflow.name} → n8n/workflows/${filename}`);
}

export async function pull(id?: string, from?: string): Promise<void> {
  const { host, apiKey, label } = await resolveAccount(from);
  const client = createClient(host, apiKey);

  if (id) {
    console.log(`Pulling workflow ${id} from ${label}...`);
    await pullOne(client, id);
  } else {
    const workflows = await client.listWorkflows();
    if (workflows.length === 0) {
      console.log(`No workflows found on "${label}".`);
      return;
    }
    console.log(`Pulling ${workflows.length} workflow(s) from ${label}...`);
    for (const wf of workflows) {
      await pullOne(client, wf.id);
    }
  }
}
