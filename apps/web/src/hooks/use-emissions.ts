"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const res = await api.sites.list();
      return res.data as Array<{
        id: string;
        name: string;
        location: string;
        emission_limit: string;
        total_emissions_to_date: string;
        metadata: Record<string, unknown>;
        version: number;
        created_at: string;
        updated_at: string;
      }>;
    },
  });
}

export function useSiteMetrics(siteId: string) {
  return useQuery({
    queryKey: ["site-metrics", siteId],
    queryFn: async () => {
      const res = await api.sites.metrics(siteId);
      return res.data as {
        site_id: string;
        site_name: string;
        emission_limit: number;
        total_emissions_to_date: number;
        compliance_status: "Within Limit" | "Limit Exceeded";
        measurement_count: number;
        average_emission: number;
        last_reading_at: string | null;
      };
    },
    enabled: !!siteId,
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      location: string;
      emission_limit: number;
    }) => api.sites.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}

export function useIngestMeasurements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      idempotencyKey,
    }: {
      data: {
        site_id: string;
        measurements: Array<{
          value: number;
          unit: string;
          timestamp: string;
          source: string;
        }>;
      };
      idempotencyKey: string;
    }) => api.ingest.batch(data, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      queryClient.invalidateQueries({ queryKey: ["site-metrics"] });
    },
  });
}
