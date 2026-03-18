import { resolve } from "node:path";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

// Load env from apps/api/.env
const envPath = resolve(import.meta.dir, "../../.env");
dotenvExpand.expand(dotenv.config({ path: envPath }));

enum N8nCommand {
  PULL = "pull",
  PUSH = "push",
  ADD = "add",
  ACCOUNTS = "accounts",
  LIST = "list",
}

const USAGE = `Usage: bun n8n <command> [args]

Commands:
  pull <id>                          Pull workflow from root n8n, sanitize, save
  push <company> <file>              Push workflow to company's n8n
  add --name <n> --host <h> --key <k>  Register a new company account
  accounts                           List registered companies
  list <company>                     List workflows on company's n8n`;

const [command, ...args] = process.argv.slice(2);

if (!command || !Object.values(N8nCommand).includes(command as N8nCommand)) {
  console.log(USAGE);
  process.exit(command ? 1 : 0);
}

try {
  switch (command as N8nCommand) {
    case N8nCommand.PULL: {
      if (!args[0]) {
        console.error("Usage: bun n8n pull <workflow-id>");
        process.exit(1);
      }
      const { pull } = await import("./commands/pull");
      await pull(args[0]);
      break;
    }

    case N8nCommand.PUSH: {
      if (!args[0] || !args[1]) {
        console.error("Usage: bun n8n push <company> <workflow-file>");
        process.exit(1);
      }
      const { push } = await import("./commands/push");
      await push(args[0], args[1]);
      break;
    }

    case N8nCommand.ADD: {
      const { add } = await import("./commands/add");
      await add(args);
      break;
    }

    case N8nCommand.ACCOUNTS: {
      const { accounts } = await import("./commands/accounts");
      await accounts();
      break;
    }

    case N8nCommand.LIST: {
      if (!args[0]) {
        console.error("Usage: bun n8n list <company>");
        process.exit(1);
      }
      const { list } = await import("./commands/list");
      await list(args[0]);
      break;
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
