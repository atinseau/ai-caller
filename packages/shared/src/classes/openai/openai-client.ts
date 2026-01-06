import createClient from "openapi-fetch";
import type { paths } from "../../types/openapi-openai.types";

export const openAiClient = createClient<paths>({
  baseUrl: "https://api.openai.com/v1",
});
