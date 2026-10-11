import { DocentesRepository } from "@/features/docentes/repositories/docentes.repository";
import type { Database } from "@/core/database";

describe("DocentesRepository.findById (lectura dentro de la transacción de alta)", () => {
  const docente = { id: "doc-1", codigo: "DOC015" };

  it("lee con el ejecutor recibido (la transacción) y no con la conexión general", async () => {
    const dbGeneral = { execute: jest.fn().mockResolvedValue({ rows: [] }) };
    const tx = {
      execute: jest.fn().mockResolvedValue({ rows: [{ resultado: { data: [docente] } }] }),
    };
    const repository = new DocentesRepository(dbGeneral as unknown as Database);

    const resultado = await repository.findById("doc-1", tx);

    expect(resultado).toEqual(docente);
    expect(tx.execute).toHaveBeenCalledTimes(1);
    expect(dbGeneral.execute).not.toHaveBeenCalled();
  });

  it("sin ejecutor, lee con la conexión general", async () => {
    const dbGeneral = {
      execute: jest.fn().mockResolvedValue({ rows: [{ resultado: { data: [docente] } }] }),
    };
    const repository = new DocentesRepository(dbGeneral as unknown as Database);

    await expect(repository.findById("doc-1")).resolves.toEqual(docente);
    expect(dbGeneral.execute).toHaveBeenCalledTimes(1);
  });
});
