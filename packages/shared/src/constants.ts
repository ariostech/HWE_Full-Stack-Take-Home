export const EMISSION_UNITS = ["kg", "tonnes", "mcf", "boe"] as const;
export type EmissionUnit = (typeof EMISSION_UNITS)[number];

export const COMPLIANCE_STATUS = ["Within Limit", "Limit Exceeded"] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUS)[number];

export const MEASUREMENT_SOURCES = [
  "sensor",
  "satellite",
  "manual",
  "field_engineer",
] as const;
export type MeasurementSource = (typeof MEASUREMENT_SOURCES)[number];
