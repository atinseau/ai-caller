import { logger } from "@/infrastructure/logger";

async function compileOpenApiTypes() {
  logger.info = () => {};
  logger.error = () => {};

  const { initializeOpenApi } = await import("@/infrastructure/openapi");
  const { app } = await import("@/interfaces/application");

  console.log("🚧 Compiling OpenAPI types...");
  try {
    await initializeOpenApi(app, {
      path: new URL("../dist/openapi.d.ts", import.meta.url),
    });
    console.log("✅ OpenAPI types compiled successfully.");
  } catch (error) {
    console.error(error, "⛔️ Error compiling OpenAPI types");
    process.exit(1);
  }
}

await compileOpenApiTypes();
