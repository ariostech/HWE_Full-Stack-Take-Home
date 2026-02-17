import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database";
import { RedisModule } from "./redis";
import { SitesModule } from "./sites/sites.module";
import { IngestModule } from "./ingest/ingest.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    DatabaseModule,
    RedisModule,
    SitesModule,
    IngestModule,
    HealthModule,
  ],
})
export class AppModule {}
