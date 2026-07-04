import { useAuthStore } from "./store";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function buildUrl(path: string): string {
  const { serverUrl } = useAuthStore.getState();
  const base = serverUrl.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}/api/v1${cleanPath}`;
}

function getAuthHeaders(): Record<string, string> {
  const { token } = useAuthStore.getState();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = buildUrl(path);
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.error || "UNKNOWN",
      data.message || `HTTP ${response.status}`,
      response.status,
    );
  }

  return data as T;
}

// ===== Auth API =====
export const authApi = {
  login: (email: string, password: string) =>
    request<{ success: boolean; token: string; user: { id: number; email: string } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    ),

  register: (email: string, password: string) =>
    request<{ success: boolean; token: string; user: { id: number; email: string } }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify({ email, password }) },
    ),

  me: () =>
    request<{ success: boolean; user: { id: number; email: string } }>("/auth/me"),

  updateAccount: (data: { email?: string; newPassword?: string; password: string }) =>
    request<{ success: boolean; message: string }>("/auth/account", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ===== Jobs API =====
export const jobsApi = {
  create: () =>
    request<{ success: boolean; jobId: string }>("/jobs", { method: "POST" }),

  list: () =>
    request<{ success: boolean; jobs: any[] }>("/jobs"),

  get: (jobId: string) =>
    request<{ success: boolean; job: any; files: any[] }>(`/jobs/${jobId}`),

  upload: async (jobId: string, files: { uri: string; name: string; type: string }[]) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append("file", file as any);
    }
    const response = await fetch(buildUrl(`/jobs/${jobId}/upload`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().token}`,
      },
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(data.error || "UNKNOWN", data.message || `HTTP ${response.status}`, response.status);
    }
    return data;
  },

  convert: (jobId: string, convertTo: string, fileNames: string[]) =>
    request<{ success: boolean; jobId: string; message: string }>(
      `/jobs/${jobId}/convert`,
      {
        method: "POST",
        body: JSON.stringify({
          convert_to: convertTo,
          file_names: JSON.stringify(fileNames),
        }),
      },
    ),

  progress: (jobId: string) =>
    request<{ success: boolean; jobId: string; status: string; numFiles: number; finishedFiles: number; files: any[] }>(
      `/jobs/${jobId}/progress`,
    ),

  delete: (jobIds: string[]) =>
    request<{ success: boolean; deleted: number; failed: number }>("/jobs/delete", {
      method: "POST",
      body: JSON.stringify({ jobIds }),
    }),
};

// ===== Converters API =====
export const convertersApi = {
  list: () =>
    request<{ success: boolean; converters: { name: string; inputs: string[]; targets: string[] }[] }>(
      "/converters",
    ),

  targets: (fileType: string) =>
    request<{ success: boolean; fileType: string; targets: Record<string, string[]> }>(
      "/conversions",
      { method: "POST", body: JSON.stringify({ fileType }) },
    ),
};

// ===== Config API =====
export const configApi = {
  get: () =>
    request<{
      success: boolean;
      config: {
        allowUnauthenticated: boolean;
        accountRegistration: boolean;
        hideHistory: boolean;
        firstRun: boolean;
      };
    }>("/config"),
};
