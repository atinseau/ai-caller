import { getAccounts } from "../accounts";

export async function accounts(): Promise<void> {
  const list = await getAccounts();

  if (list.length === 0) {
    console.log("No accounts registered. Use `bun n8n add` to register one.");
    return;
  }

  console.log("Registered accounts:\n");
  console.log("Name\tHost");
  console.log("----\t----");

  for (const account of list) {
    console.log(`${account.name}\t${account.host}`);
  }
}
