import { ApiResponse } from "@emissions/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function request<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const json = await res.json();

  if (!res.ok && !json.success) {
    throw new ApiError(
      json.error?.message || "Request failed",
      json.error?.code || "UNKNOWN",
      res.status,
      json.error?.details,
    );
  }

  return json;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  sites: {
    list: () => request<unknown[]>("/v1/sites"),
    create: (data: {
      name: string;
      location: string;
      emission_limit: number;
      metadata?: Record<string, unknown>;
    }) => request("/v1/sites", { method: "POST", body: JSON.stringify(data) }),
    metrics: (id: string) => request(`/v1/sites/${id}/metrics`),
  },
  ingest: {
    batch: (
      data: {
        site_id: string;
        measurements: Array<{
          value: number;
          unit: string;
          timestamp: string;
          source: string;
        }>;
      },
      idempotencyKey: string,
    ) =>
      request("/v1/ingest", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Idempotency-Key": idempotencyKey },
      }),
  },
  health: () => request<{ status: string }>("/health"),
};
