import { createClient } from "../client";
import { getAccount, getCredentials, getRootAccount } from "../accounts";

export async function del(
  id: string,
  from?: string,
): Promise<void> {
  let host: string;
  let apiKey: string;
  const label = from ?? "root";

  if (from) {
    const account = await getAccount(from);
    host = account.host;
    apiKey = await getCredentials(from);
  } else {
    const root = getRootAccount();
    host = root.host;
    apiKey = root.apiKey;
  }

  const client = createClient(host, apiKey);

  const workflow = await client.getWorkflow(id);
  console.log(`Deleting workflow "${workflow.name}" (ID: ${id}) from ${label}...`);
  await client.deleteWorkflow(id);
  console.log(`Deleted.`);
}
