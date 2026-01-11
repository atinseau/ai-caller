import type { components, paths } from "./openapi-openai.types";

// UTILS
export type JsonRouteBody<
  T extends keyof paths,
  Method extends keyof paths[T],
> = paths[T][Method] extends { requestBody: infer Body }
  ? Body extends { content: infer Content }
    ? Content extends { "application/json": infer Json }
      ? Json
      : never
    : never
  : never;

export type JsonRouteResponse<
  T extends keyof paths,
  Method extends keyof paths[T],
  Status extends paths[T][Method] extends { responses: infer Responses }
    ? keyof Responses
    : never,
> = paths[T][Method] extends { responses: infer Responses }
  ? Responses extends { [K in Status]: infer Response }
    ? Response extends { content: infer Content }
      ? Content extends { "application/json": infer Json }
        ? Json
        : never
      : never
    : never
  : never;

export type Schema = components["schemas"];

export type OpenAIConfig = {
  model?: string;
  apiKey: string;
};
