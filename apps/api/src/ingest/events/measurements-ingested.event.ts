import { IEvent } from "@nestjs/cqrs";

export class MeasurementsIngestedEvent implements IEvent {
  constructor(
    public readonly siteId: string,
    public readonly batchId: string,
    public readonly measurementCount: number,
    public readonly totalNewEmissions: number,
  ) {}
}
