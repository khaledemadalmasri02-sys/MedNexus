import { defineConfig } from "drizzle-kit";
import * as schema from "./src/db/schema";
import * as osceSchema from "./src/db/schema-osce";

export default defineConfig({
  dialect: "sqlite",
  schema: ["./src/db/schema.ts", "./src/db/schema-osce.ts"],
  out: "./migrations",
});
