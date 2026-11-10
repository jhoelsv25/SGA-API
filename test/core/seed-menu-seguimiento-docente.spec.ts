import {
  MENUS_SEGUIMIENTO_DOCENTE,
  rolesDeOpcion,
} from "@/core/database/seed-menu-seguimiento-docente";
import { MENU_MIS_OBSERVACIONES, MENU_OBSERVACIONES_AULA } from "@/common/constants";

const nombresDe = (rol: string) =>
  MENUS_SEGUIMIENTO_DOCENTE.filter((m) => m.roles.includes(rol)).map((m) => m.nombre);

describe("RF-021 V2: matriz de accesos de Seguimiento docente", () => {
  it("CP-RF021-22: Director y Subdirector ven las opciones de dirección y no las del docente", () => {
    for (const rol of ["Director", "Subdirector"]) {
      const v = nombresDe(rol);
      expect(v).toEqual(
        expect.arrayContaining([
          "Observaciones de aula",
          "Pendientes de seguimiento",
          "Informe mensual de horas efectivas",
          "Sesiones de hoy",
          "Justificaciones de sesiones",
        ]),
      );
      expect(v).not.toContain("Mis observaciones");
      expect(v).not.toContain("Mis sesiones");
    }
  });

  it("CP-RF021-23 y CP-RF021-02: el Docente ve sus opciones y ninguna de dirección", () => {
    const v = nombresDe("Docente");
    expect(v).toEqual(
      expect.arrayContaining([
        "Mis sesiones",
        "Mis ausencias",
        "Mi seguimiento",
        "Mis observaciones",
        "Mis indicadores",
      ]),
    );
    for (const n of [
      "Sesiones de hoy",
      "Observaciones de aula",
      "Pendientes de seguimiento",
      "Informe mensual de horas efectivas",
    ]) {
      expect(v).not.toContain(n);
    }
  });

  it("CP-RF021-24: Secretaria, Estudiante y Apoderado no ven nada del grupo", () => {
    for (const rol of ["Secretaria", "Estudiante", "Apoderado"]) {
      expect(nombresDe(rol)).toEqual([]);
    }
    expect(rolesDeOpcion(MENU_OBSERVACIONES_AULA)).not.toContain("Secretaria");
    expect(rolesDeOpcion(MENU_MIS_OBSERVACIONES)).toEqual(["Docente"]);
  });

  it("las rutas y los órdenes no se repiten", () => {
    const rutas = MENUS_SEGUIMIENTO_DOCENTE.map((m) => m.ruta);
    const ordenes = MENUS_SEGUIMIENTO_DOCENTE.map((m) => m.orden);
    expect(new Set(rutas).size).toBe(rutas.length);
    expect(new Set(ordenes).size).toBe(ordenes.length);
  });

  it("las opciones de RF-023 se registran porque su API ya existe", () => {
    const habilitadas = MENUS_SEGUIMIENTO_DOCENTE.filter((m) => m.habilitada).map((m) => m.nombre);
    expect(habilitadas).toEqual(
      expect.arrayContaining(["Mis observaciones", "Observaciones de aula"]),
    );
  });
});
