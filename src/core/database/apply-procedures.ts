import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";

// Cargar variables de entorno desde .env si existe
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {
    // Si no existe .env en local o ya están cargadas en el entorno
  }
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ Error: DATABASE_URL no están definidos en las variables de entorno.");
  process.exit(1);
}

const PROCEDURES_DIR = path.join(__dirname, "procedures");

/**
 * Busca recursivamente todos los archivos .sql en un directorio
 */
function findSqlFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findSqlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".sql")) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

async function applyProcedures() {
  console.log("🚀 Iniciando aplicación de funciones y procedimientos SQL...");

  const sqlFiles = findSqlFiles(PROCEDURES_DIR);

  if (sqlFiles.length === 0) {
    console.log("⚠️ No se encontraron archivos .sql en", PROCEDURES_DIR);
    return;
  }

  console.log(`📁 Encontrados ${sqlFiles.length} archivo(s) SQL para ejecutar.\n`);

  const pool = new Pool({
    connectionString,
    ssl:
      connectionString?.includes("supabase") || connectionString?.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
  });

  const client = await pool.connect();

  try {
    for (const filePath of sqlFiles) {
      const relativePath = path.relative(__dirname, filePath);
      const sqlContent = fs.readFileSync(filePath, "utf-8");

      process.stdout.write(`⏳ Ejecutando ${relativePath}... `);
      await client.query(sqlContent);
      console.log("✅ OK");
    }

    console.log(`\n✨ Éxito: Se aplicaron todos los procedimientos SQL correctamente.`);
  } catch (error) {
    console.error("\n❌ Error al ejecutar procedimiento SQL:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

void applyProcedures();
