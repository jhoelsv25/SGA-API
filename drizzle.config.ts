import { defineConfig } from "drizzle-kit";

// drizzle-kit no carga .env por sí mismo (Node 24 lo trae nativo)
process.loadEnvFile();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/core/database/schema",
  out: "./drizzle",
  dbCredentials: {
    // Session pooler: las migraciones necesitan una sesión estable (no el transaction pooler)
    url: process.env.DATABASE_URL_DIRECT!,
  },
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
});
