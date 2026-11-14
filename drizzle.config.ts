import { defineConfig } from "drizzle-kit";

// drizzle-kit no carga .env por sí mismo (Node 24 lo trae nativo)
try {
  process.loadEnvFile();
} catch {
  // En Docker/producción las variables ya vienen en el entorno (no hay .env)
}

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
