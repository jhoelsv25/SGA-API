import type { Database } from "@/core/database";
import { DocentesRepository } from "@/features/docentes/repositories/docentes.repository";
import { crearTransaccionFalsa } from "../../helpers/transaccion-falsa";

describe("DocentesRepository.cesar (RF-007: cese con otra ficha o cargo vigente)", () => {
  const docente = [{ id: "doc-1", personaId: "persona-1" }];
  const cuenta = [{ id: "usuario-1" }];
  const sinVinculos = { esEstudiante: false, esApoderado: false, tieneOtroCargo: false };
  const rolesDeCuenta = [
    { rolId: "rol-docente", nombre: "Docente", esPrincipal: true },
    { rolId: "rol-ti", nombre: "Soporte TI", esPrincipal: false },
  ];

  const cesar = async (cola: unknown[][]) => {
    const falsa = crearTransaccionFalsa(cola);
    const repositorio = new DocentesRepository(falsa.db as unknown as Database);
    jest.spyOn(repositorio, "findById").mockResolvedValue({ id: "doc-1" } as never);
    const resultado = await repositorio.cesar("doc-1", "2027-03-01", "admin-1");
    return { resultado, escrituras: falsa.escrituras };
  };

  it("con otro cargo vigente solo retira el rol Docente y conserva la cuenta", async () => {
    const { resultado, escrituras } = await cesar([
      docente,
      [{ ...sinVinculos, tieneOtroCargo: true }],
      cuenta,
      rolesDeCuenta,
    ]);

    expect(resultado?.mantuvoCuentaActiva).toBe(true);
    expect(escrituras).toContainEqual(
      expect.objectContaining({ vigente: false, retiradoPorId: "admin-1" }),
    );
    expect(escrituras).toContainEqual(expect.objectContaining({ rolId: "rol-ti" }));
    expect(escrituras).not.toContainEqual(expect.objectContaining({ estado: "inactivo" }));
    expect(escrituras).not.toContainEqual(expect.objectContaining({ activa: false }));
  });

  it("sin otra ficha ni cargo desactiva cuenta y credencial", async () => {
    const { resultado, escrituras } = await cesar([docente, [sinVinculos], cuenta]);

    expect(resultado?.mantuvoCuentaActiva).toBe(false);
    expect(escrituras).toContainEqual(expect.objectContaining({ estado: "inactivo" }));
    expect(escrituras).toContainEqual(expect.objectContaining({ activa: false }));
  });

  it("con otra ficha pero sin otro rol no deja la cuenta sin roles: la desactiva", async () => {
    const { resultado, escrituras } = await cesar([
      docente,
      [{ ...sinVinculos, esApoderado: true }],
      cuenta,
      [rolesDeCuenta[0]],
    ]);

    expect(resultado?.mantuvoCuentaActiva).toBe(false);
    expect(escrituras).toContainEqual(expect.objectContaining({ estado: "inactivo" }));
    expect(escrituras).not.toContainEqual(
      expect.objectContaining({ vigente: false, retiradoPorId: "admin-1" }),
    );
  });
});

describe("DocentesRepository.reactivar (RF-002 V4: la ficha vigente lleva su rol)", () => {
  const reactivar = async (cola: unknown[][]) => {
    const falsa = crearTransaccionFalsa(cola);
    const repositorio = new DocentesRepository(falsa.db as unknown as Database);
    jest.spyOn(repositorio, "findById").mockResolvedValue({ id: "doc-1" } as never);
    await repositorio.reactivar("doc-1", "admin-1");
    return falsa.escrituras;
  };
  const base = [[{ personaId: "persona-1" }], [{ id: "usuario-1" }], [{ id: "rol-docente" }]];

  it("devuelve el rol Docente si el cese se lo retiró", async () => {
    const escrituras = await reactivar([...base, []]);

    expect(escrituras).toContainEqual({
      usuarioId: "usuario-1",
      rolId: "rol-docente",
      asignadoPorId: "admin-1",
    });
  });

  it("no duplica el rol si ya lo tiene vigente", async () => {
    const escrituras = await reactivar([...base, [{ id: "asignacion-1" }]]);

    expect(escrituras).not.toContainEqual(expect.objectContaining({ rolId: "rol-docente" }));
  });
});
