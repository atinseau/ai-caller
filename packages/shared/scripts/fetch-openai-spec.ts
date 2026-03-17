#!/usr/bin/env bun
const SPEC_URL =
  "https://app.stainless.com/api/spec/documented/openai/openapi.documented.yml";
const OUTPUT_FILE = "src/types/openapi-openai.types.ts";

console.log("Fetching OpenAI OpenAPI spec...");
const proc = Bun.spawn(
  ["bunx", "openapi-typescript", SPEC_URL, "-o", OUTPUT_FILE],
  { stdout: "inherit", stderr: "inherit" }
);
const exitCode = await proc.exited;
if (exitCode !== 0) process.exit(exitCode);
console.log(`Types generated at ${OUTPUT_FILE}`);
