import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * Creates a fresh QueryClient + wrapper component for each test.
 * Use with renderHook / render:
 *
 * @example
 * const { wrapper } = createWrapper();
 * const { result } = renderHook(() => useMyHook(), { wrapper });
 */
export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // don't retry on failure in tests
        staleTime: 0, // always refetch
        gcTime: 0, // don't cache between tests
      },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return { wrapper: Wrapper, queryClient };
}
