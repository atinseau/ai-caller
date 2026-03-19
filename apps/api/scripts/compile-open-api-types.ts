import process from "node:process";
import { logger } from "@/infrastructure/logger/index.ts";

async function compileOpenApiTypes() {
  logger.info = () => {
    /* silence logger during compilation */
  };
  logger.error = () => {
    /* silence logger during compilation */
  };

  const { initializeOpenApi } = await import(
    "@/infrastructure/openapi/index.ts"
  );
  const { app } = await import("@/interfaces/application.ts");
  try {
    await initializeOpenApi(app, {
      path: new URL("../dist/openapi.d.ts", import.meta.url),
    });
  } catch (_error) {
    process.exit(1);
  }
}

await compileOpenApiTypes();
