import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { IngestController } from "./ingest.controller";
import { IngestMeasurementsHandler } from "./commands/ingest-measurements.handler";
import { MeasurementsIngestedHandler } from "./events/measurements-ingested.handler";
import { IdempotencyService } from "./services/idempotency.service";
import { ObservabilityService } from "@/common";

const CommandHandlers = [IngestMeasurementsHandler];
const EventHandlers = [MeasurementsIngestedHandler];

@Module({
  imports: [CqrsModule],
  controllers: [IngestController],
  providers: [
    ...CommandHandlers,
    ...EventHandlers,
    IdempotencyService,
    ObservabilityService,
  ],
  exports: [ObservabilityService],
})
export class IngestModule {}
