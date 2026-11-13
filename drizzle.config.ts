import { defineConfig } from "drizzle-kit";

// drizzle-kit no carga .env por sí mismo (Node 24 lo trae nativo)
process.loadEnvFile();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/core/database/schema",
  out: "./drizzle",
  dbCredentials: {
    // Session pooler o conexión directa a PostgreSQL
    url: (process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL)!,
  },
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
});
