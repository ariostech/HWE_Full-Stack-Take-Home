import { IngestBatchInput } from "@emissions/shared";

export class IngestMeasurementsCommand {
  constructor(
    public readonly data: IngestBatchInput,
    public readonly idempotencyKey: string,
  ) {}
}
