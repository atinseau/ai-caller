// env.ts handles dotenv loading automatically

import { N8nService } from "../src/application/services/n8n.service";
import { N8nSanitizeService } from "../src/application/services/n8n-sanitize.service";
import { env } from "../src/infrastructure/config/env";
import { N8nClientAdapter } from "../src/infrastructure/n8n/n8n-client.adapter";
import { N8nWorkflowFileStorageAdapter } from "../src/infrastructure/n8n/n8n-workflow-file-storage.adapter";
import { InfisicalSecretAdapter } from "../src/infrastructure/secret/infisical-secret.adapter";

// Fetch secrets from Infisical before parsing env (so all secrets are available)
await env.init();

// Initialize Infisical adapter
const secretAdapter = new InfisicalSecretAdapter();
await secretAdapter.login();

const service = new N8nService(
  new N8nClientAdapter(),
  new N8nWorkflowFileStorageAdapter(),
  secretAdapter,
  new N8nSanitizeService(),
);

enum N8nCommand {
  PULL = "pull",
  PUSH = "push",
  ADD = "add",
  COMPANIES = "companies",
  LIST = "list",
  DELETE = "delete",
}

const USAGE = `Usage: bun n8n <command> [args]

Commands:
  pull [id] [--from <company>]         Pull workflow(s), sanitize, save (default: all from root)
  push <company> <file>                Push workflow to company's n8n
  add --name <n> --key <k>             Register a company's n8n API key in Infisical
  companies                            List companies with n8n API keys
  list [company]                       List workflows (default: root)
  delete <id> [--from <company>]       Delete a workflow (default: root)`;

const [command, ...args] = process.argv.slice(2);

if (!command || !Object.values(N8nCommand).includes(command as N8nCommand)) {
  console.log(USAGE);
  process.exit(command ? 1 : 0);
}

function extractFlag(flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
}

try {
  switch (command as N8nCommand) {
    case N8nCommand.PULL: {
      const from = extractFlag("--from");
      const id = args[0] && args[0] !== "--from" ? args[0] : undefined;
      const label = from ?? "root";
      const results = await service.pull(id, from);
      if (results.length === 0) {
        console.log(`No workflows found on "${label}".`);
      } else {
        console.log(`Pulled ${results.length} workflow(s) from ${label}:`);
        for (const r of results) {
          console.log(`  ${r.name} → workflows/${r.filename}`);
        }
      }
      break;
    }

    case N8nCommand.PUSH: {
      if (!args[0] || !args[1]) {
        console.error("Usage: bun n8n push <company> <workflow-file>");
        process.exit(1);
      }
      const result = await service.push(args[0], args[1]);
      if (result.created) {
        console.log(
          `Created workflow "${result.name}" on ${args[0]} (ID: ${result.id})`,
        );
      } else {
        console.log(
          `Updated workflow "${result.name}" on ${args[0]} (ID: ${result.id})`,
        );
      }
      console.log(`\nThe client must assign their credentials in the n8n UI.`);
      break;
    }

    case N8nCommand.ADD: {
      const name = extractFlag("--name");
      const key = extractFlag("--key");
      if (!name || !key) {
        console.error("Usage: bun n8n add --name <company> --key <api-key>");
        process.exit(1);
      }
      console.log(`Validating API key...`);
      await service.addCompanyApiKey(name, key);
      console.log(`API key for "${name}" stored in Infisical.`);
      break;
    }

    case N8nCommand.COMPANIES: {
      const companies = await service.listCompanies();
      if (companies.length === 0) {
        console.log(
          "No companies registered. Use `bun n8n add` to register one.",
        );
      } else {
        console.log("Companies with n8n API keys:\n");
        for (const name of companies) {
          console.log(`  ${name}`);
        }
      }
      break;
    }

    case N8nCommand.LIST: {
      const company = args[0];
      const label = company ?? "root";
      const workflows = await service.listWorkflows(company);
      if (workflows.length === 0) {
        console.log(`No workflows found for "${label}".`);
      } else {
        console.log(`Workflows for "${label}":\n`);
        console.log("ID\tActive\tName");
        console.log("--\t------\t----");
        for (const wf of workflows) {
          console.log(`${wf.id}\t${wf.active ? "yes" : "no"}\t${wf.name}`);
        }
      }
      break;
    }

    case N8nCommand.DELETE: {
      if (!args[0]) {
        console.error("Usage: bun n8n delete <workflow-id> [--from <company>]");
        process.exit(1);
      }
      const from = extractFlag("--from");
      const label = from ?? "root";
      const name = await service.deleteWorkflow(args[0], from);
      console.log(`Deleted workflow "${name}" (ID: ${args[0]}) from ${label}.`);
      break;
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
