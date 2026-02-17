import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { Logger } from "@nestjs/common";
import { MeasurementsIngestedEvent } from "./measurements-ingested.event";

@EventsHandler(MeasurementsIngestedEvent)
export class MeasurementsIngestedHandler implements IEventHandler<MeasurementsIngestedEvent> {
  private readonly logger = new Logger(MeasurementsIngestedHandler.name);

  handle(event: MeasurementsIngestedEvent) {
    this.logger.log(
      `[Event] Measurements ingested: site=${event.siteId}, batch=${event.batchId}, ` +
        `count=${event.measurementCount}, emissions=${event.totalNewEmissions}`,
    );

    if (event.totalNewEmissions > 1000) {
      this.logger.warn(
        `[Alert] High emission batch detected: site=${event.siteId}, ` +
          `emissions=${event.totalNewEmissions}`,
      );
    }
  }
}
