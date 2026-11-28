import "reflect-metadata";
import { ROLES_KEY } from "@/common/decorators/roles.decorator";
import { AccesosController } from "@/features/credenciales/accesos.controller";
import { AccesosService } from "@/features/credenciales/accesos.service";
import { CredencialesController } from "@/features/credenciales/credenciales.controller";
import { UsersController } from "@/features/users/users.controller";

const persona = {
  personaId: "p-1",
  documento: "12345678",
  nombreCompleto: "Quispe Rojas, Ana",
  codigoBiometrico: null,
};

function armar(rolesDeCuenta = ["Docente"]) {
  const repo = {
    buscar: jest.fn().mockResolvedValue([persona]),
    persona: jest.fn().mockResolvedValue(persona),
    fichas: jest.fn().mockResolvedValue([{ personaId: "p-1", grupo: "Docente" }]),
    cuentas: jest.fn().mockResolvedValue([
      {
        id: "u-1",
        personaId: "p-1",
        nombreUsuario: "aquispe",
        estado: "activo",
        roles: rolesDeCuenta,
      },
    ]),
    credencialActiva: jest.fn().mockResolvedValue(null),
  };
  return { service: new AccesosService(repo as never), repo };
}

describe("RF-007 V7: accesos y credenciales", () => {
  it("busca por palabras sin tildes y reúne los grupos sin repetir", async () => {
    const { service, repo } = armar(["Docente", "Subdirector"]);
    const lista = await service.buscar("Aná  QUÍSPE");
    expect(repo.buscar).toHaveBeenCalledWith(["ana", "quispe"]);
    expect(lista[0].grupos).toEqual(["Docente", "Subdirector"]);
  });

  it("muestra lo que falta y marca la cuenta de un Administrador", async () => {
    const { service } = armar(["Administrador"]);
    await expect(service.detalle("p-1")).resolves.toMatchObject({
      credencial: null,
      codigoBiometrico: null,
      cuenta: { id: "u-1", esAdministrador: true },
    });
  });

  it("rechaza una persona que no existe", async () => {
    const { service, repo } = armar();
    repo.persona.mockResolvedValue(null);
    await expect(service.detalle("x")).rejects.toThrow();
  });

  it("limita cada acción a los roles acordados", () => {
    const roles = (objetivo: object) => Reflect.getMetadata(ROLES_KEY, objetivo) as string[];
    const metodos = (clase: object) => clase as Record<string, object>;
    expect(roles(AccesosController)).toEqual(["Administrador", "Soporte TI"]);
    expect(roles(metodos(CredencialesController.prototype).reemitir)).toEqual([
      "Administrador",
      "Secretaria",
      "Soporte TI",
    ]);
    expect(roles(metodos(UsersController.prototype).resetPassword)).toEqual([
      "Administrador",
      "Soporte TI",
    ]);
  });
});
