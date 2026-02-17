import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Version,
  Res,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { Response } from "express";
import {
  IngestBatchSchema,
  IngestBatchInput,
  ApiResponse,
} from "@emissions/shared";
import { ZodValidationPipe } from "@/common";
import { IngestMeasurementsCommand } from "./commands/ingest-measurements.command";
import { IdempotencyService } from "./services/idempotency.service";

@Controller("ingest")
export class IngestController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Post()
  @Version("1")
  @HttpCode(HttpStatus.CREATED)
  async ingest(
    @Body(new ZodValidationPipe(IngestBatchSchema)) body: IngestBatchInput,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<unknown>> {
    if (!idempotencyKey) {
      throw new BadRequestException({
        code: "MISSING_IDEMPOTENCY_KEY",
        message: "Idempotency-Key header is required for ingestion requests",
      });
    }

    const existing =
      await this.idempotencyService.checkExisting(idempotencyKey);
    if (existing.exists) {
      res.status(existing.statusCode || 200);
      const cachedResponse = existing.response as ApiResponse<unknown>;
      return {
        ...cachedResponse,
        meta: {
          timestamp: cachedResponse.meta?.timestamp || new Date().toISOString(),
          ...cachedResponse.meta,
          duplicate: true,
          idempotency_key: idempotencyKey,
        },
      };
    }

    const result = await this.commandBus.execute(
      new IngestMeasurementsCommand(body, idempotencyKey),
    );

    const response: ApiResponse<unknown> = {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        idempotency_key: idempotencyKey,
        duplicate: false,
      },
    };

    await this.idempotencyService.store(
      idempotencyKey,
      response,
      HttpStatus.CREATED,
    );

    return response;
  }
}
