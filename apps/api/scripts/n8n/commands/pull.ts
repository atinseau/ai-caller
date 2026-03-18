import { join } from "node:path";
import { createClient } from "../client";
import { getRootAccount } from "../accounts";
import { sanitizeWorkflow } from "../sanitize";

const WORKFLOWS_DIR = join(import.meta.dir, "../../../n8n/workflows");

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function pull(id: string): Promise<void> {
  const root = getRootAccount();
  const client = createClient(root.host, root.apiKey);

  console.log(`Pulling workflow ${id}...`);
  const workflow = await client.getWorkflow(id);
  const generic = sanitizeWorkflow(workflow);

  const filename = `${slugify(workflow.name)}.json`;
  const filepath = join(WORKFLOWS_DIR, filename);

  await Bun.write(filepath, JSON.stringify(generic, null, 2));
  console.log(`Saved to n8n/workflows/${filename}`);
}
