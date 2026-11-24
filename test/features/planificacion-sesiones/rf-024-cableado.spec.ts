import { PATH_METADATA } from "@nestjs/common/constants";
import {
  MENU_CATALOGO_CURRICULAR,
  MENU_PLANIFICACION_SESIONES,
  MENU_SESIONES_HOY,
} from "@/common/constants";
import { MENU_ACCESS_KEY } from "@/common/decorators";
import {
  CatalogoCurricularController,
  PlanificacionSesionesController,
  SupervisionPlanificacionController,
} from "@/features/planificacion-sesiones";

const menuDe = (clase: object, metodo?: string) =>
  Reflect.getMetadata(
    MENU_ACCESS_KEY,
    metodo ? (clase as Record<string, object>)[metodo] : clase,
  ) as string | string[];

describe("RF-024 V1: cableado de rutas y accesos", () => {
  it("la planificación es solo del docente (opción del menú)", () => {
    expect(menuDe(PlanificacionSesionesController)).toBe(MENU_PLANIFICACION_SESIONES);
    expect(Reflect.getMetadata(PATH_METADATA, PlanificacionSesionesController)).toBe(
      "planificacion-sesiones",
    );
  });

  it("la supervisión usa «Sesiones de hoy» y no tiene rutas de edición del contenido", () => {
    expect(menuDe(SupervisionPlanificacionController)).toBe(MENU_SESIONES_HOY);
    const metodos = Object.getOwnPropertyNames(SupervisionPlanificacionController.prototype).filter(
      (m) => m !== "constructor",
    );
    expect(metodos.sort()).toEqual(["comentar", "detalle", "historial", "horasReales", "panel"]);
  });

  it("solo la dirección ajusta el catálogo", () => {
    const proto = CatalogoCurricularController.prototype as unknown as Record<string, object>;
    expect(Reflect.getMetadata(MENU_ACCESS_KEY, proto.crearDesempeno)).toBe(
      MENU_CATALOGO_CURRICULAR,
    );
    expect(Reflect.getMetadata(MENU_ACCESS_KEY, proto.editarDesempeno)).toBe(
      MENU_CATALOGO_CURRICULAR,
    );
  });
});
