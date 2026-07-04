import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/lib/store";

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0f0f1e" },
      }}
    />
  );
}
