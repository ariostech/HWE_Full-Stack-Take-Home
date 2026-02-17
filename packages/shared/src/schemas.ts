import { z } from "zod";
import { EMISSION_UNITS, MEASUREMENT_SOURCES } from "./constants";

export const CreateSiteSchema = z.object({
  name: z.string().min(1, "Site name is required").max(255),
  location: z.string().min(1, "Location is required").max(500),
  emission_limit: z
    .number()
    .positive("Emission limit must be positive")
    .finite(),
  metadata: z.record(z.unknown()).optional().default({}),
});
export type CreateSiteInput = z.infer<typeof CreateSiteSchema>;

export const SiteResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  location: z.string(),
  emission_limit: z.number(),
  total_emissions_to_date: z.number(),
  metadata: z.record(z.unknown()),
  version: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SiteResponse = z.infer<typeof SiteResponseSchema>;

export const MeasurementEntrySchema = z.object({
  value: z
    .number()
    .nonnegative("Measurement value cannot be negative")
    .finite(),
  unit: z.enum(EMISSION_UNITS).default("kg"),
  timestamp: z
    .string()
    .datetime({ message: "Must be a valid ISO 8601 datetime" }),
  source: z.enum(MEASUREMENT_SOURCES).default("sensor"),
  metadata: z.record(z.unknown()).optional().default({}),
});
export type MeasurementEntry = z.infer<typeof MeasurementEntrySchema>;

export const IngestBatchSchema = z.object({
  site_id: z.string().uuid("Must be a valid site UUID"),
  measurements: z
    .array(MeasurementEntrySchema)
    .min(1, "At least one measurement is required")
    .max(100, "Maximum 100 measurements per batch"),
});
export type IngestBatchInput = z.infer<typeof IngestBatchSchema>;

export const SiteMetricsResponseSchema = z.object({
  site_id: z.string().uuid(),
  site_name: z.string(),
  emission_limit: z.number(),
  total_emissions_to_date: z.number(),
  compliance_status: z.enum(["Within Limit", "Limit Exceeded"]),
  measurement_count: z.number().int(),
  average_emission: z.number(),
  last_reading_at: z.string().nullable(),
});
export type SiteMetricsResponse = z.infer<typeof SiteMetricsResponseSchema>;

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional(),
      })
      .optional(),
    meta: z
      .object({
        timestamp: z.string(),
        request_id: z.string().optional(),
        idempotency_key: z.string().optional(),
        duplicate: z.boolean().optional(),
      })
      .optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    request_id?: string;
    idempotency_key?: string;
    duplicate?: boolean;
  };
};
