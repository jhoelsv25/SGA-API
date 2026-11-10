import type { Database } from "@/core/database";
import { MatriculasRepository } from "@/features/matriculas/repositories/matriculas.repository";
import { crearTransaccionFalsa } from "../../helpers/transaccion-falsa";

describe("MatriculasRepository: retiro con otra ficha (RF-009 V2)", () => {
  const persona = [{ personaId: "persona-1" }];
  const roles = [
    { rolId: "rol-est", nombre: "Estudiante", esPrincipal: true },
    { rolId: "rol-apo", nombre: "Apoderado", esPrincipal: false },
  ];

  const retirar = async (cola: unknown[][]) => {
    const falsa = crearTransaccionFalsa(cola);
    const repositorio = new MatriculasRepository(falsa.db as unknown as Database);
    await repositorio.desactivarEstudianteYCredenciales("est-1", "retirado", "admin-1");
    return falsa.escrituras;
  };

  it("con otra ficha y otro rol conserva la cuenta y solo retira el rol Estudiante", async () => {
    const escrituras = await retirar([persona, [{ id: "u-1", tieneOtraFicha: true }], roles]);

    expect(escrituras).toContainEqual(expect.objectContaining({ activa: false }));
    expect(escrituras).toContainEqual(
      expect.objectContaining({ vigente: false, retiradoPorId: "admin-1" }),
    );
    expect(escrituras).not.toContainEqual(expect.objectContaining({ estado: "inactivo" }));
  });

  it("sin otra ficha desactiva la cuenta", async () => {
    const escrituras = await retirar([persona, [{ id: "u-1", tieneOtraFicha: false }]]);

    expect(escrituras).toContainEqual(expect.objectContaining({ estado: "inactivo" }));
  });

  it("con otra ficha pero sin otro rol desactiva la cuenta", async () => {
    const escrituras = await retirar([persona, [{ id: "u-1", tieneOtraFicha: true }], [roles[0]]]);

    expect(escrituras).toContainEqual(expect.objectContaining({ estado: "inactivo" }));
  });
});
