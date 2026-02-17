import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { Inject, NotFoundException } from "@nestjs/common";
import { eq, count, avg, max } from "drizzle-orm";
import { GetSiteMetricsQuery } from "./get-site-metrics.query";
import { DRIZZLE, DrizzleDB, sites, measurements } from "@/database";
import { SiteMetricsResponse, ComplianceStatus } from "@emissions/shared";

@QueryHandler(GetSiteMetricsQuery)
export class GetSiteMetricsHandler implements IQueryHandler<GetSiteMetricsQuery> {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async execute(query: GetSiteMetricsQuery): Promise<SiteMetricsResponse> {
    const [site] = await this.db
      .select()
      .from(sites)
      .where(eq(sites.id, query.siteId))
      .limit(1);

    if (!site) {
      throw new NotFoundException({
        code: "SITE_NOT_FOUND",
        message: `Site with id ${query.siteId} not found`,
      });
    }

    const [stats] = await this.db
      .select({
        measurement_count: count(measurements.id),
        average_emission: avg(measurements.value),
        last_reading_at: max(measurements.timestamp),
      })
      .from(measurements)
      .where(eq(measurements.site_id, query.siteId));

    const totalEmissions = parseFloat(site.total_emissions_to_date);
    const emissionLimit = parseFloat(site.emission_limit);

    const complianceStatus: ComplianceStatus =
      totalEmissions <= emissionLimit ? "Within Limit" : "Limit Exceeded";

    return {
      site_id: site.id,
      site_name: site.name,
      emission_limit: emissionLimit,
      total_emissions_to_date: totalEmissions,
      compliance_status: complianceStatus,
      measurement_count: Number(stats.measurement_count),
      average_emission: stats.average_emission
        ? parseFloat(stats.average_emission)
        : 0,
      last_reading_at: stats.last_reading_at
        ? stats.last_reading_at.toISOString()
        : null,
    };
  }
}
