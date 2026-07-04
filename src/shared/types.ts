// Shared types between web server and mobile app
// This file is imported by both the Elysia server and the Expo React Native app

export interface User {
  id: number;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface FileEntry {
  id: number;
  job_id: number;
  file_name: string;
  output_file_name: string;
  status: string;
}

export interface Job {
  id: number;
  user_id: number;
  date_created: string;
  status: string;
  num_files: number;
  finished_files: number;
  files_detailed: FileEntry[];
}

export interface JobProgress {
  success: boolean;
  jobId: string;
  status: string;
  numFiles: number;
  finishedFiles: number;
  files: {
    id: number;
    fileName: string;
    outputFileName: string;
    status: string;
  }[];
}

export interface Converter {
  name: string;
  inputs: string[];
  targets: string[];
}

export interface ServerConfig {
  success: boolean;
  config: {
    allowUnauthenticated: boolean;
    accountRegistration: boolean;
    hideHistory: boolean;
    firstRun: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

// Theme tokens shared between web and mobile
export const themeTokens = {
  accent: {
    600: "#7c3aed",
    500: "#8b5cf6",
    400: "#a78bfa",
  },
  neutral: {
    950: "#0f0f1e",
    900: "#161623",
    800: "#1e1e2e",
    700: "#2a2a3e",
    600: "#3a3a52",
    500: "#6b6b80",
    400: "#9a9ab0",
    300: "#c0c0d0",
    200: "#e0e0ea",
    100: "#f0f0f5",
    50: "#f8f8fc",
  },
  surface: {
    base: "#0f0f1e",
    raised: "#161623",
    overlay: "#1e1e2e",
  },
  border: {
    subtle: "rgba(42, 42, 62, 0.5)",
    default: "#2a2a3e",
    strong: "#3a3a52",
  },
} as const;
