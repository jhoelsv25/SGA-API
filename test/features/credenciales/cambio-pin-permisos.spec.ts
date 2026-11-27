import "reflect-metadata";
import { ROLES_KEY } from "@/common/decorators/roles.decorator";
import { CredencialesController } from "@/features/credenciales/credenciales.controller";

describe("RF-007: quién cambia el PIN de marcación", () => {
  const metodos = CredencialesController.prototype as unknown as Record<string, object>;

  it("solo Soporte TI cambia el PIN de una persona", () => {
    expect(Reflect.getMetadata(ROLES_KEY, metodos.cambiarPinPersona)).toEqual(["Soporte TI"]);
  });

  it("no existe el cambio del PIN propio", () => {
    expect(metodos.cambiarMiPin).toBeUndefined();
  });
});
