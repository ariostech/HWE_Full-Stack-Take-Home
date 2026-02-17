import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sites, measurements } from "./schema";
import { v4 as uuidv4 } from "uuid";

async function seed() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://emissions:emissions@localhost:5432/emissions",
  });

  const db = drizzle(pool);

  console.log("Seeding database...");

  const siteData = [
    {
      id: uuidv4(),
      name: "Well Pad Alpha",
      location: "Alberta, Canada - T2P 1J9",
      emission_limit: "5000.000000",
      total_emissions_to_date: "1250.500000",
      metadata: {
        region: "Western Canada",
        operator: "HWE Energy Corp",
        field: "Montney Basin",
      },
    },
    {
      id: uuidv4(),
      name: "Processing Plant Bravo",
      location: "British Columbia, Canada - V6B 1A1",
      emission_limit: "15000.000000",
      total_emissions_to_date: "12800.750000",
      metadata: {
        region: "BC Interior",
        operator: "HWE Energy Corp",
        type: "gas_processing",
      },
    },
    {
      id: uuidv4(),
      name: "Compressor Station Charlie",
      location: "Saskatchewan, Canada - S4P 3Y2",
      emission_limit: "3000.000000",
      total_emissions_to_date: "3150.200000",
      metadata: {
        region: "Southeast SK",
        operator: "Prairie Gas Ltd",
        type: "compressor",
      },
    },
    {
      id: uuidv4(),
      name: "Tank Battery Delta",
      location: "North Dakota, USA - 58501",
      emission_limit: "8000.000000",
      total_emissions_to_date: "2400.000000",
      metadata: {
        region: "Bakken",
        operator: "HWE Energy Corp",
        type: "storage",
      },
    },
  ];

  const insertedSites = await db.insert(sites).values(siteData).returning();
  console.log(`Inserted ${insertedSites.length} sites.`);

  const now = new Date();
  const measurementData: Array<{
    site_id: string;
    value: string;
    unit: string;
    timestamp: Date;
    source: string;
    metadata: Record<string, unknown>;
    batch_id: string;
  }> = [];

  for (const site of insertedSites) {
    const batchId = uuidv4();
    for (let i = 0; i < 15; i++) {
      const timestamp = new Date(now.getTime() - i * 3600000);
      measurementData.push({
        site_id: site.id,
        value: (Math.random() * 100 + 10).toFixed(6),
        unit: "kg",
        timestamp,
        source: ["sensor", "satellite", "manual", "field_engineer"][
          Math.floor(Math.random() * 4)
        ],
        metadata: { reading_id: `seed-${i}` },
        batch_id: batchId,
      });
    }
  }

  await db.insert(measurements).values(measurementData);
  console.log(`Inserted ${measurementData.length} measurements.`);

  console.log("Seeding complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
