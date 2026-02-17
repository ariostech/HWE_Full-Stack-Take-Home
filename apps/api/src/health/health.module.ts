import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { ObservabilityService } from "@/common";

@Module({
  controllers: [HealthController],
  providers: [ObservabilityService],
})
export class HealthModule {}
