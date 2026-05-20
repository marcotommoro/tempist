"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { FontSizeProvider } from "@/components/theme/font-size-provider";

export function Providers({ children }: { children: ReactNode }) {
  // useState + factory: garantisce 1 QueryClient per request (SSR-safe)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <FontSizeProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          {process.env.NODE_ENV !== "production" && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </ThemeProvider>
    </FontSizeProvider>
  );
}
