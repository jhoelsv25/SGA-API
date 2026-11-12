#!/bin/sh
set -e

echo "=== [SGA-API] Verificando conexión a PostgreSQL... ==="

# Extraer host y puerto de DATABASE_URL o usar valores por defecto
DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}

# Esperar a que PostgreSQL acepte conexiones
until nc -z -v -w30 "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  echo "Esperando a PostgreSQL en $DB_HOST:$DB_PORT..."
  sleep 2
done

echo "✅ [SGA-API] PostgreSQL está listo."

echo "=== [SGA-API] Ejecutando migraciones Drizzle... ==="
pnpm db:migrate || {
  echo "⚠️ Error al ejecutar migraciones (o ya estaban al día). Continuando..."
}

echo "=== [SGA-API] Aplicando procedimientos almacenados y funciones SQL... ==="
pnpm db:procedures || {
  echo "⚠️ Advertencia al aplicar procedimientos. Continuando..."
}

echo "=== [SGA-API] Iniciando NestJS en producción... ==="
exec "$@"
