import Constants from "expo-constants";

/**
 * Thin fetch wrapper. Every call goes through here so we have one place to
 * attach the bearer token, surface structured errors, and route the base URL.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.length > 0) return fromEnv.replace(/\/+$/, "");
  const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  return (fromExtra ?? "http://localhost:4000").replace(/\/+$/, "");
}

const BASE_URL = resolveBaseUrl();

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
}

export async function apiRequest<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.token) headers["authorization"] = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    // Turn network failures into the same error shape so UI only has one path.
    throw new ApiError(0, "NETWORK", (err as Error).message || "Network request failed");
  }

  const text = await res.text();
  const parsed = text ? (safeJson(text) as unknown) : undefined;

  if (!res.ok) {
    const errObj = (parsed as { error?: { code?: string; message?: string; details?: unknown } })?.error;
    throw new ApiError(
      res.status,
      errObj?.code ?? "HTTP_ERROR",
      errObj?.message ?? `HTTP ${res.status}`,
      errObj?.details,
    );
  }

  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export const api = { request: apiRequest };
