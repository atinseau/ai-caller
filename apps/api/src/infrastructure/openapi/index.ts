import type { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import openapiTS, { astToString } from "openapi-typescript";

type InitializeOpenApiParams = {
  path?: string | URL;
};

export async function initializeOpenApi(
  app: OpenAPIHono,
  params?: InitializeOpenApiParams,
) {
  const openApiConfig = {
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "AI Caller API",
      description: "API documentation for AI Caller",
    },
  };

  app.get(
    "/docs",
    Scalar({
      url: "/openapi.json",
      title: "AI Caller API",
      pageTitle: "AI Caller API Documentation",
      theme: "deepSpace",
      persistAuth: true,
    }),
  );

  app.doc("/openapi.json", openApiConfig);

  const openApiDocument = app.getOpenAPIDocument(openApiConfig);
  const ast = await openapiTS(JSON.stringify(openApiDocument));
  const contents = astToString(ast);

  Bun.write(
    params?.path || new URL("../../../dist/openapi.d.ts", import.meta.url),
    contents,
  );
}
