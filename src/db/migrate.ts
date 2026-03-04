/**
 * Database Migration Script
 * Run with: npm run migrate
 */

import fs from "fs";
import path from "path";
import { pool, testConnection, closePool } from "./config.js";

async function runMigrations(): Promise<void> {
  try {
    // Test connection
    await testConnection();

    // Read schema file
    const schemaPath = path.join(process.cwd(), "src/db/schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    // Split by semicolon and filter empty statements
    const statements = schema
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    console.log(`Running ${statements.length} migration statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await pool.query(statement);
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
      } catch (err: any) {
        console.error(`❌ Statement ${i + 1} failed:`, err.message);
        throw err;
      }
    }

    console.log("✅ All migrations completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await closePool();
  }
}

runMigrations();
