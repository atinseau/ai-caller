import { createClient } from "../client";
import { getAccount, getCredentials } from "../accounts";

export async function list(company: string): Promise<void> {
  const account = await getAccount(company);
  const apiKey = await getCredentials(company);
  const client = createClient(account.host, apiKey);

  const workflows = await client.listWorkflows();

  if (workflows.length === 0) {
    console.log(`No workflows found for "${company}".`);
    return;
  }

  console.log(`Workflows for "${company}":\n`);
  console.log("ID\tActive\tName");
  console.log("--\t------\t----");

  for (const wf of workflows) {
    console.log(`${wf.id}\t${wf.active ? "yes" : "no"}\t${wf.name}`);
  }
}
