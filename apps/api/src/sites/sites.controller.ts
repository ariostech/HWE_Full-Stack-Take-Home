import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UsePipes,
  ParseUUIDPipe,
  Version,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  CreateSiteSchema,
  CreateSiteInput,
  ApiResponse,
} from "@emissions/shared";
import { ZodValidationPipe } from "@/common";
import { CreateSiteCommand } from "./commands/create-site.command";
import { ListSitesQuery } from "./queries/list-sites.query";
import { GetSiteMetricsQuery } from "./queries/get-site-metrics.query";

@Controller("sites")
export class SitesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @Version("1")
  @UsePipes(new ZodValidationPipe(CreateSiteSchema))
  async create(@Body() body: CreateSiteInput): Promise<ApiResponse<unknown>> {
    const site = await this.commandBus.execute(new CreateSiteCommand(body));
    return {
      success: true,
      data: site,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get()
  @Version("1")
  async findAll(): Promise<ApiResponse<unknown>> {
    const sites = await this.queryBus.execute(new ListSitesQuery());
    return {
      success: true,
      data: sites,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get(":id/metrics")
  @Version("1")
  async getMetrics(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<unknown>> {
    const metrics = await this.queryBus.execute(new GetSiteMetricsQuery(id));
    return {
      success: true,
      data: metrics,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
