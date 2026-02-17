import { CommandHandler, ICommandHandler, EventBus } from "@nestjs/cqrs";
import { Inject, Logger, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { IngestMeasurementsCommand } from "./ingest-measurements.command";
import { MeasurementsIngestedEvent } from "../events/measurements-ingested.event";
import {
  DRIZZLE,
  DrizzleDB,
  sites,
  measurements,
  outboxEvents,
} from "@/database";
import { ObservabilityService } from "@/common";

@CommandHandler(IngestMeasurementsCommand)
export class IngestMeasurementsHandler implements ICommandHandler<IngestMeasurementsCommand> {
  private readonly logger = new Logger(IngestMeasurementsHandler.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly eventBus: EventBus,
    private readonly observability: ObservabilityService,
  ) {}

  async execute(command: IngestMeasurementsCommand) {
    const { data, idempotencyKey } = command;
    const batchId = uuidv4();
    const lockStart = Date.now();

    const result = await this.db.transaction(async (tx) => {
      const [site] = await tx
        .select()
        .from(sites)
        .where(eq(sites.id, data.site_id))
        .for("update");

      if (!site) {
        throw new NotFoundException({
          code: "SITE_NOT_FOUND",
          message: `Site with id ${data.site_id} not found`,
        });
      }

      this.observability.logLockAcquisition(
        data.site_id,
        Date.now() - lockStart,
      );

      const measurementValues = data.measurements.map((m) => ({
        site_id: data.site_id,
        value: m.value.toString(),
        unit: m.unit,
        timestamp: new Date(m.timestamp),
        source: m.source,
        metadata: m.metadata || {},
        batch_id: batchId,
      }));

      const inserted = await tx
        .insert(measurements)
        .values(measurementValues)
        .returning();

      const totalNewEmissions = data.measurements.reduce(
        (sum, m) => sum + m.value,
        0,
      );

      const [updatedSite] = await tx
        .update(sites)
        .set({
          total_emissions_to_date: sql`${sites.total_emissions_to_date}::numeric + ${totalNewEmissions.toString()}::numeric`,
          version: sql`${sites.version} + 1`,
          updated_at: new Date(),
        })
        .where(eq(sites.id, data.site_id))
        .returning();

      await tx.insert(outboxEvents).values({
        event_type: "measurements.ingested",
        payload: {
          site_id: data.site_id,
          batch_id: batchId,
          measurement_count: inserted.length,
          total_new_emissions: totalNewEmissions,
          idempotency_key: idempotencyKey,
        },
      });

      return {
        site: updatedSite,
        measurements_count: inserted.length,
        batch_id: batchId,
        total_new_emissions: totalNewEmissions,
      };
    });

    this.observability.logIngestion(data.site_id, result.measurements_count);

    this.eventBus.publish(
      new MeasurementsIngestedEvent(
        data.site_id,
        result.batch_id,
        result.measurements_count,
        result.total_new_emissions,
      ),
    );

    return result;
  }
}
