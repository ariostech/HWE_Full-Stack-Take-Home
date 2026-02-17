import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { SitesController } from "./sites.controller";
import { CreateSiteHandler } from "./commands/create-site.handler";
import { GetSiteMetricsHandler } from "./queries/get-site-metrics.handler";
import { ListSitesHandler } from "./queries/list-sites.handler";

const CommandHandlers = [CreateSiteHandler];
const QueryHandlers = [GetSiteMetricsHandler, ListSitesHandler];

@Module({
  imports: [CqrsModule],
  controllers: [SitesController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class SitesModule {}
