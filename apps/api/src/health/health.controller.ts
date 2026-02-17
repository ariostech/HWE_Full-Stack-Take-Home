import { Controller, Get } from "@nestjs/common";
import { ObservabilityService } from "@/common";

@Controller("health")
export class HealthController {
  constructor(private readonly observability: ObservabilityService) {}

  @Get()
  check() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      metrics: this.observability.getMetrics(),
    };
  }
}
