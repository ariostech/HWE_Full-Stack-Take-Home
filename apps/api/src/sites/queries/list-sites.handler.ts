import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { asc } from "drizzle-orm";
import { ListSitesQuery } from "./list-sites.query";
import { DRIZZLE, DrizzleDB, sites } from "@/database";

@QueryHandler(ListSitesQuery)
export class ListSitesHandler implements IQueryHandler<ListSitesQuery> {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async execute(_query: ListSitesQuery) {
    return this.db.select().from(sites).orderBy(asc(sites.created_at));
  }
}
