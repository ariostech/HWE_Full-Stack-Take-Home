import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);
  private duplicateRejections = 0;
  private totalIngestions = 0;
  private totalMeasurements = 0;

  logIngestion(siteId: string, measurementCount: number) {
    this.totalIngestions++;
    this.totalMeasurements += measurementCount;
    this.logger.log(
      `Ingestion processed: site=${siteId}, measurements=${measurementCount}, ` +
        `total_ingestions=${this.totalIngestions}, total_measurements=${this.totalMeasurements}`,
    );
  }

  logDuplicateRejection(idempotencyKey: string) {
    this.duplicateRejections++;
    this.logger.warn(
      `Duplicate rejected: key=${idempotencyKey}, total_duplicates=${this.duplicateRejections}`,
    );
  }

  logLockAcquisition(siteId: string, durationMs: number) {
    this.logger.log(
      `Lock acquired: site=${siteId}, wait_time_ms=${durationMs}`,
    );
  }

  getMetrics() {
    return {
      total_ingestions: this.totalIngestions,
      total_measurements: this.totalMeasurements,
      duplicate_rejections: this.duplicateRejections,
    };
  }
}
