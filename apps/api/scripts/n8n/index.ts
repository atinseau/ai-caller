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
  DELETE = "delete",
}

const USAGE = `Usage: bun n8n <command> [args]

Commands:
  pull [id] [--from <company>]       Pull workflow(s), sanitize, save (default: all from root)
  push <company> <file>              Push workflow to company's n8n
  add --name <n> --host <h> --key <k>  Register a new company account
  accounts                           List registered companies
  list [company]                     List workflows (default: root)
  delete <id> [--from <company>]     Delete a workflow (default: root)`;

const [command, ...args] = process.argv.slice(2);

if (!command || !Object.values(N8nCommand).includes(command as N8nCommand)) {
  console.log(USAGE);
  process.exit(command ? 1 : 0);
}

try {
  switch (command as N8nCommand) {
    case N8nCommand.PULL: {
      const fromIndex = args.indexOf("--from");
      const from = fromIndex !== -1 ? args[fromIndex + 1] : undefined;
      const id = args[0] && args[0] !== "--from" ? args[0] : undefined;
      const { pull } = await import("./commands/pull");
      await pull(id, from);
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
      const { list } = await import("./commands/list");
      await list(args[0]);
      break;
    }

    case N8nCommand.DELETE: {
      if (!args[0]) {
        console.error("Usage: bun n8n delete <workflow-id> [--from <company>]");
        process.exit(1);
      }
      const fromIndex = args.indexOf("--from");
      const from = fromIndex !== -1 ? args[fromIndex + 1] : undefined;
      const { del } = await import("./commands/delete");
      await del(args[0], from);
      break;
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
