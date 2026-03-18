import { createClient } from "../client";
import { getAccount, getCredentials, getRootAccount } from "../accounts";

export async function list(company?: string): Promise<void> {
  let host: string;
  let apiKey: string;
  const label = company ?? "root";

  if (company) {
    const account = await getAccount(company);
    host = account.host;
    apiKey = await getCredentials(company);
  } else {
    const root = getRootAccount();
    host = root.host;
    apiKey = root.apiKey;
  }

  const client = createClient(host, apiKey);
  const workflows = await client.listWorkflows();

  if (workflows.length === 0) {
    console.log(`No workflows found for "${label}".`);
    return;
  }

  console.log(`Workflows for "${label}":\n`);
  console.log("ID\tActive\tName");
  console.log("--\t------\t----");

  for (const wf of workflows) {
    console.log(`${wf.id}\t${wf.active ? "yes" : "no"}\t${wf.name}`);
  }
}
