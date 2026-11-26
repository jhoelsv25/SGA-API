import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { AuthRepository } from "@/features/auth/repositories/auth.repository";

// OBS-18: el login normaliza a minúsculas; la búsqueda no puede distinguir mayúsculas.
describe("AuthRepository.findUserByUsername", () => {
  it("compara el nombre de usuario sin distinguir mayúsculas", async () => {
    let condicion: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (c: SQL) => {
            condicion = c;
            return { limit: async () => [] };
          },
        }),
      }),
    };
    const repository = new AuthRepository(
      db as unknown as ConstructorParameters<typeof AuthRepository>[0],
    );

    await repository.findUserByUsername("E2EEst01");

    const { sql, params } = new PgDialect().sqlToQuery(condicion!);
    expect(sql).toContain('lower("usuarios".');
    expect(params).toContain("e2eest01");
  });
});
