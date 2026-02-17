import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { Inject, Logger } from "@nestjs/common";
import { CreateSiteCommand } from "./create-site.command";
import { DRIZZLE, DrizzleDB, sites } from "@/database";

@CommandHandler(CreateSiteCommand)
export class CreateSiteHandler implements ICommandHandler<CreateSiteCommand> {
  private readonly logger = new Logger(CreateSiteHandler.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async execute(command: CreateSiteCommand) {
    const { data } = command;

    const [site] = await this.db
      .insert(sites)
      .values({
        name: data.name,
        location: data.location,
        emission_limit: data.emission_limit.toString(),
        metadata: data.metadata || {},
      })
      .returning();

    this.logger.log(`Site created: id=${site.id}, name=${site.name}`);
    return site;
  }
}
