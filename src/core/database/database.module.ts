import { Global, Inject, Logger, Module, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { DRIZZLE, PG_POOL } from "./database.constants";
import * as schema from "./schema";

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Pool => {
        const logger = new Logger("DatabaseModule");
        const connectionString = configService.getOrThrow<string>("DATABASE_URL");
        const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);

        const pool = new Pool({
          connectionString,
          // Supabase exige SSL; en local no
          ssl: isLocal ? false : { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 10_000,
        });

        pool.on("error", (err) => {
          logger.warn(`Error en conexión con PostgreSQL: ${err.message}`);
        });

        return pool;
      },
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema, casing: "snake_case" }),
    },
  ],
  exports: [PG_POOL, DRIZZLE],
})
export class DatabaseModule implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log("Desconectado de PostgreSQL");
  }
}
