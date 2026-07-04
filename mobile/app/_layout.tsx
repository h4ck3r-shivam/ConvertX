import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store";
import { processQueue } from "@/lib/sync";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isLoading = useAuthStore((s) => s.isLoading);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Process offline queue on app launch
  React.useEffect(() => {
    if (!isLoading) {
      processQueue();
    }
  }, [isLoading]);

  if (isLoading) {
    return null; // Splash screen handles this
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0f0f1e" },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="results/[id]" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}
