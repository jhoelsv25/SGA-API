# ==========================================
# Etapa 1: Dependencias
# ==========================================
FROM node:22-alpine AS dependencies

WORKDIR /app

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate

# Copiar manifiestos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias completas (incluye devDeps para compilar)
RUN pnpm install --frozen-lockfile

# ==========================================
# Etapa 2: Construcción (Build)
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.26.0 --activate

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Compilar NestJS
RUN pnpm build

# ==========================================
# Etapa 3: Imagen de Producción (Runner)
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Instalar netcat-openbsd para el script de espera y utilidades necesarias
RUN apk add --no-cache netcat-openbsd

RUN corepack enable && corepack prepare pnpm@10.26.0 --activate

# Copiar dependencias de node_modules
COPY --from=dependencies /app/node_modules ./node_modules

# Copiar artefactos de compilación y archivos de configuración
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src/core/database/procedures ./src/core/database/procedures
COPY --from=builder /app/src/core/database/apply-procedures.ts ./src/core/database/apply-procedures.ts
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh && mkdir -p /app/uploads

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
