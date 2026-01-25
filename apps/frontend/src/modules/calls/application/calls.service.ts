import type { paths } from "@ai-caller/api/openapi";
import { api } from "@/infrastructure/http/api";

type GetCompanyCallsResponse =
  paths["/api/v1/call/company/{companyId}"]["get"]["responses"][200]["content"]["application/json"];

type GetCallResponse =
  paths["/api/v1/call/{callId}"]["get"]["responses"][200]["content"]["application/json"];

export class CallsService {
  async listByCompany(companyId: string) {
    const { response, data } = await api.GET(
      "/api/v1/call/company/{companyId}",
      {
        params: {
          path: { companyId },
        },
      },
    );

    if (!response.ok || !data) {
      throw new Error("Failed to fetch calls for company");
    }

    return (data as GetCompanyCallsResponse).calls;
  }

  async getById(callId: string) {
    const { response, data } = await api.GET("/api/v1/call/{callId}", {
      params: {
        path: { callId },
      },
    });

    if (!response.ok || !data) {
      throw new Error("Failed to fetch call details");
    }

    return (data as GetCallResponse).call;
  }
}
