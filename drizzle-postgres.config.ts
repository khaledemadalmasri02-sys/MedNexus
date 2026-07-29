import { defineConfig } from "drizzle-kit";
import * as schema from "./src/db/schema";
import * as osceSchema from "./src/db/schema-osce-postgres";

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/db/schema.ts", "./src/db/schema-osce-postgres.ts"],
  out: "./migrations-postgres",
  dbCredentials: {
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT || "5432"),
    user: process.env.DATABASE_USER || "postgres",
    password: process.env.DATABASE_PASSWORD || "postgres",
    database: process.env.DATABASE_NAME || "osce_simulator",
  },
});