import { CreateSiteInput } from "@emissions/shared";

export class CreateSiteCommand {
  constructor(public readonly data: CreateSiteInput) {}
}
