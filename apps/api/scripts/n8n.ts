// env.ts handles dotenv loading automatically

import process from "node:process";
import { N8nService } from "../src/application/services/n8n.service.ts";
import { N8nSanitizeService } from "../src/application/services/n8n-sanitize.service.ts";
import { env } from "../src/infrastructure/config/env.ts";
import { N8nClientAdapter } from "../src/infrastructure/n8n/n8n-client.adapter.ts";
import { N8nWorkflowFileStorageAdapter } from "../src/infrastructure/n8n/n8n-workflow-file-storage.adapter.ts";
import { InfisicalSecretAdapter } from "../src/infrastructure/secret/infisical-secret.adapter.ts";

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

const _USAGE = `Usage: bun n8n <command> [args]

Commands:
  pull [id] [--from <company>]         Pull workflow(s), sanitize, save (default: all from root)
  push [company] <file>                Push workflow to n8n (default: root)
  add --name <n> --key <k>             Register a company's n8n API key in Infisical
  companies                            List companies with n8n API keys
  list [company]                       List workflows (default: root)
  delete <id> [--from <company>]       Delete a workflow (default: root)`;

const [command, ...args] = process.argv.slice(2);

if (!command || !Object.values(N8nCommand).includes(command as N8nCommand)) {
  console.log(_USAGE);
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
      console.log(`Pulling from: ${from ?? "root"}`);
      const results = await service.pull(id, from);
      if (results.length === 0) {
        console.log("No workflows found.");
      } else {
        for (const r of results) {
          console.log(`✓ ${r.name} → ${r.filename}`);
        }
      }
      break;
    }

    case N8nCommand.PUSH: {
      if (!args[0]) {
        console.log(_USAGE);
        process.exit(1);
      }
      const company = args[1] ? args[0] : undefined;
      const file = args[1] ?? args[0];
      console.log(`Pushing to: ${company ?? "root"}`);
      const result = await service.push(company, file);
      if (result.created) {
        console.log(`✓ Created workflow "${result.name}" (${result.id})`);
      } else {
        console.log(`✓ Updated workflow "${result.name}" (${result.id})`);
      }
      break;
    }

    case N8nCommand.ADD: {
      const name = extractFlag("--name");
      const key = extractFlag("--key");
      if (!name || !key) {
        process.exit(1);
      }
      await service.addCompanyApiKey(name, key);
      console.log(`✓ Added API key for company "${name}"`);
      break;
    }

    case N8nCommand.COMPANIES: {
      const companies = await service.listCompanies();
      if (companies.length === 0) {
        console.log("No companies registered.");
      } else {
        for (const name of companies) {
          console.log(`  ${name}`);
        }
      }
      break;
    }

    case N8nCommand.LIST: {
      const company = args[0];
      console.log(`Listing workflows from: ${company ?? "root"}`);
      const workflows = await service.listWorkflows(company);
      if (workflows.length === 0) {
        console.log("No workflows found.");
      } else {
        for (const wf of workflows) {
          console.log(`  ${wf.id}  ${wf.name}  (active: ${wf.active})`);
        }
      }
      break;
    }

    case N8nCommand.DELETE: {
      if (!args[0]) {
        process.exit(1);
      }
      const from = extractFlag("--from");
      const deletedName = await service.deleteWorkflow(args[0], from);
      console.log(`✓ Deleted workflow "${deletedName}" from ${from ?? "root"}`);
      break;
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
