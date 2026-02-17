import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, VersioningType } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "@/app.module";
import { GlobalExceptionFilter } from "@/common";

describe("Emissions API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Health", () => {
    it("/health (GET)", () => {
      return request(app.getHttpServer())
        .get("/api/health")
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe("ok");
        });
    });
  });

  describe("Sites", () => {
    let siteId: string;

    it("POST /api/v1/sites - create a site", () => {
      return request(app.getHttpServer())
        .post("/api/v1/sites")
        .send({
          name: "Test Well Pad",
          location: "Test Location, AB",
          emission_limit: 5000,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe("Test Well Pad");
          siteId = res.body.data.id;
        });
    });

    it("GET /api/v1/sites - list all sites", () => {
      return request(app.getHttpServer())
        .get("/api/v1/sites")
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it("POST /api/v1/sites - validation error", () => {
      return request(app.getHttpServer())
        .post("/api/v1/sites")
        .send({ name: "" })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe("VALIDATION_ERROR");
        });
    });
  });

  describe("Ingest", () => {
    let siteId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/sites")
        .send({
          name: "Ingest Test Site",
          location: "Test Location",
          emission_limit: 10000,
        });
      siteId = res.body.data.id;
    });

    it("POST /api/v1/ingest - batch ingestion", () => {
      return request(app.getHttpServer())
        .post("/api/v1/ingest")
        .set("Idempotency-Key", "test-key-1")
        .send({
          site_id: siteId,
          measurements: [
            {
              value: 50.5,
              unit: "kg",
              timestamp: new Date().toISOString(),
              source: "sensor",
            },
            {
              value: 75.2,
              unit: "kg",
              timestamp: new Date().toISOString(),
              source: "manual",
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.meta.duplicate).toBe(false);
        });
    });

    it("POST /api/v1/ingest - idempotent retry returns duplicate", () => {
      return request(app.getHttpServer())
        .post("/api/v1/ingest")
        .set("Idempotency-Key", "test-key-1")
        .send({
          site_id: siteId,
          measurements: [
            {
              value: 50.5,
              unit: "kg",
              timestamp: new Date().toISOString(),
              source: "sensor",
            },
          ],
        })
        .expect((res) => {
          expect(res.body.meta.duplicate).toBe(true);
        });
    });

    it("POST /api/v1/ingest - requires Idempotency-Key header", () => {
      return request(app.getHttpServer())
        .post("/api/v1/ingest")
        .send({
          site_id: siteId,
          measurements: [
            {
              value: 10,
              unit: "kg",
              timestamp: new Date().toISOString(),
              source: "sensor",
            },
          ],
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe("MISSING_IDEMPOTENCY_KEY");
        });
    });
  });
});
