import pg from "pg";
import { assertLocalDatabase } from "../server/config";
import { demoDogs } from "../src/data/demoDogs";

export async function applySchema(connectionString: string): Promise<void> {
  assertLocalDatabase(connectionString);
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    await pool.query(
      await Bun.file(new URL("../database/schema.sql", import.meta.url)).text(),
    );
  } finally {
    await pool.end();
  }
}

export async function seedDemo(connectionString: string): Promise<number> {
  assertLocalDatabase(connectionString);
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  try {
    await client.query("BEGIN");
    let inserted = 0;
    for (const dog of demoDogs) {
      const slug = dog.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const result = await client.query(
        `INSERT INTO dogs (id,slug,name,size,sex,age,description,photo_url,is_adopted,traits)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
        [
          dog.id,
          slug,
          dog.name,
          dog.size,
          dog.sex,
          dog.age || "",
          dog.description || "",
          dog.photo_url || "",
          dog.is_adopted,
          JSON.stringify(dog.traits || {}),
        ],
      );
      inserted += result.rowCount ?? 0;
    }
    await client.query("COMMIT");
    return inserted;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  try {
    const connectionString = process.env.DATABASE_URL || "";
    if (!connectionString)
      throw new Error(
        "DATABASE_URL is required; run bun run setup:local and follow docs/backend.md.",
      );
    if (process.argv[2] === "setup") {
      await applySchema(connectionString);
      console.log(
        "Clean local schema ready (existing tables and records preserved).",
      );
    } else if (process.argv[2] === "seed") {
      console.log(
        `Inserted ${await seedDemo(connectionString)} fictional demo dogs (existing rows untouched).`,
      );
    } else throw new Error("Usage: bun run scripts/db.ts setup|seed");
  } catch (err) {
    console.error(
      `Database setup failed: ${err instanceof Error ? err.message : "unknown error"}. Use a dedicated empty local database and see docs/backend.md.`,
    );
    process.exitCode = 1;
  }
}
