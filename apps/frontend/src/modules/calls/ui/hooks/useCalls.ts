import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { CallsService } from "@/modules/calls/application/calls.service";

const callsService = new CallsService();

export function useCompanyCalls(companyId: string) {
  const { data, isLoading } = useSuspenseQuery({
    queryKey: ["calls", "company", companyId],
    queryFn: () => callsService.listByCompany(companyId),
  });

  return {
    calls: data,
    isLoading,
  };
}

export function useCall(callId?: string) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["calls", "detail", callId],
    queryFn: () => callsService.getById(callId as string),
    enabled: Boolean(callId),
  });

  return {
    call: data,
    isLoading,
    isError,
    error,
  };
}
