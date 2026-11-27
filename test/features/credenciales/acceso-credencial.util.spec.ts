import { ForbiddenException } from "@nestjs/common";
import { exigirAccesoACredencial } from "@/features/credenciales/utils/acceso-credencial.util";

describe("Acceso al carné y a la credencial de una persona", () => {
  const usuario = (role: string) => ({ role, personaId: "per-propia" });

  it.each(["Docente", "Estudiante", "Apoderado"])("%s ve la suya", (role) => {
    expect(() => exigirAccesoACredencial(usuario(role), "per-propia")).not.toThrow();
  });

  it.each(["Docente", "Estudiante", "Apoderado"])("%s no ve la de otra persona", (role) => {
    expect(() => exigirAccesoACredencial(usuario(role), "per-ajena")).toThrow(ForbiddenException);
  });

  it.each(["Administrador", "Secretaria", "Director", "Subdirector"])(
    "%s ve la de cualquier persona",
    (role) => {
      expect(() => exigirAccesoACredencial(usuario(role), "per-ajena")).not.toThrow();
    },
  );
});
