import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Cross-platform secure storage (SecureStore on native, localStorage on web)
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

interface AuthState {
  token: string | null;
  serverUrl: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
  setServerUrl: (url: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  serverUrl: "http://localhost:3000",
  isAuthenticated: false,
  isLoading: true,

  hydrate: async () => {
    const token = await storage.getItem("auth_token");
    const serverUrl = (await storage.getItem("server_url")) || "http://localhost:3000";
    set({
      token,
      serverUrl,
      isAuthenticated: !!token,
      isLoading: false,
    });
  },

  setToken: async (token: string) => {
    await storage.setItem("auth_token", token);
    set({ token, isAuthenticated: true });
  },

  setServerUrl: async (url: string) => {
    await storage.setItem("server_url", url);
    set({ serverUrl: url });
  },

  logout: async () => {
    await storage.deleteItem("auth_token");
    set({ token: null, isAuthenticated: false });
  },
}));

interface ThemeState {
  theme: "dark" | "light";
  toggleTheme: () => void;
  setTheme: (theme: "dark" | "light") => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "dark",
  toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
  setTheme: (theme) => set({ theme }),
}));
