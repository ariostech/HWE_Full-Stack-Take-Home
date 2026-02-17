import { Injectable, Inject, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { eq } from "drizzle-orm";
import { REDIS } from "@/redis";
import { DRIZZLE, DrizzleDB, idempotencyKeys } from "@/database";
import { ObservabilityService } from "@/common";

const IDEMPOTENCY_TTL = 86400; // 24 hours

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly observability: ObservabilityService,
  ) {}

  async checkExisting(
    key: string,
  ): Promise<{ exists: boolean; response?: unknown; statusCode?: number }> {
    const cached = await this.redis.get(`idempotency:${key}`);
    if (cached) {
      this.observability.logDuplicateRejection(key);
      const parsed = JSON.parse(cached);
      return {
        exists: true,
        response: parsed.response,
        statusCode: parsed.statusCode,
      };
    }

    const [existing] = await this.db
      .select()
      .from(idempotencyKeys)
      .where(eq(idempotencyKeys.key, key))
      .limit(1);

    if (existing && existing.expires_at > new Date()) {
      this.observability.logDuplicateRejection(key);
      await this.redis.set(
        `idempotency:${key}`,
        JSON.stringify({
          response: existing.response,
          statusCode: existing.status_code,
        }),
        "EX",
        IDEMPOTENCY_TTL,
      );
      return {
        exists: true,
        response: existing.response,
        statusCode: existing.status_code,
      };
    }

    return { exists: false };
  }

  async store(
    key: string,
    response: unknown,
    statusCode: number,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL * 1000);

    await this.db
      .insert(idempotencyKeys)
      .values({
        key,
        response,
        status_code: statusCode,
        expires_at: expiresAt,
      })
      .onConflictDoNothing();

    await this.redis.set(
      `idempotency:${key}`,
      JSON.stringify({ response, statusCode }),
      "EX",
      IDEMPOTENCY_TTL,
    );
  }
}
