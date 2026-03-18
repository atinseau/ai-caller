import path from "node:path";
import { config } from "dotenv";
import { expand } from "dotenv-expand";

// Resolve .env relative to this file (apps/api/.env), not CWD
const envPath = path.resolve(import.meta.dirname, "../../.env");
expand(config({ path: envPath }));
