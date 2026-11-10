import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "@/common/decorators/roles.decorator";
import { RolesGuard } from "@/common/guards/roles.guard";
import type { RolMenusService } from "@/common/services/rol-menus.service";
import type { AuditService } from "@/common/services/audit.service";
import type { AniosAcademicosService } from "@/features/anio-escolar/anios.service";
import type { CalendarioService } from "@/features/calendario/calendario.service";
import type { EquiposService } from "@/features/equipos/equipos.service";
import type { MarcacionesService } from "@/features/marcaciones/marcaciones.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import type { NotificacionesRepository } from "@/features/notificaciones/repositories";
import {
  SesionesClaseController,
  SesionesClaseService,
  VARIABLES_ALERTA,
  VARIABLES_JUSTIFICACION,
  VARIABLES_SESION,
  type SesionResponseDto,
  type SesionesClaseRepository,
} from "@/features/sesiones-clase";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

// Martes, bimestre II. El 4 días hábiles atrás es el miércoles 10/05.
const HOY = "2028-05-16";

const solicitud = (id: string, fecha: string, solicitadaEn: string): SesionResponseDto => ({
  id,
  fecha: "2028-05-04",
  horaInicio: "08:30",
  horaFin: "10:00",
  cursoNombre: "Matemática",
  seccionNombre: "5.° A",
  docenteId: "doc-1",
  docenteNombre: "Quispe, Juan",
  docenteTitularNombre: null,
  estado: "no_cumplida",
  tema: null,
  horaIngreso: null,
  horaSalida: null,
  minutosRetraso: 0,
  minutosPerdidos: 0,
  salidaAutomatica: false,
  observaciones: null,
  justificacion: {
    estado: "solicitada",
    motivo: "Permiso personal",
    motivoCodigo: "permiso_personal",
    documentoUrl: null,
    comentario: null,
    solicitadaEn: `${solicitadaEn} 09:00:00`,
    revisadaEn: null,
  },
});

describe("RF-019 V2: notificaciones del seguimiento docente", () => {
  let repo: Mocks<SesionesClaseRepository>;
  let notificaciones: Mocks<NotificacionesService>;
  let service: SesionesClaseService;

  const crear = () =>
    new SesionesClaseService(
      repo as unknown as SesionesClaseRepository,
      {} as EquiposService,
      {} as MarcacionesService,
      {
        sesionesBloqueadasEn: jest.fn(),
        anioVigente: jest.fn().mockResolvedValue({
          id: "anio",
          estado: "en_curso",
          bimestres: [{ fechaInicio: "2028-05-10", fechaFin: "2028-07-16" }],
        }),
      } as unknown as AniosAcademicosService,
      { suspendeClasesEn: jest.fn().mockResolvedValue(false) } as unknown as CalendarioService,
      { log: jest.fn() } as unknown as AuditService,
      undefined,
      undefined,
      notificaciones as unknown as NotificacionesService,
    );

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(`${HOY}T07:00:00-05:00`) });
    repo = {
      valoresVariables: jest.fn().mockResolvedValue(
        new Map([
          [VARIABLES_SESION.MINUTOS_ANTES_FIRMA_INGRESO, "15"],
          [VARIABLES_SESION.TOLERANCIA_INGRESO, "15"],
          [VARIABLES_SESION.TOLERANCIA_SALIDA, "15"],
          [VARIABLES_SESION.SALIDA_AUTOMATICA, "true"],
          [VARIABLES_JUSTIFICACION.AVISO_DIAS, "3"],
          [VARIABLES_JUSTIFICACION.PERMISOS_MAX_ANIO, "3"],
          [VARIABLES_JUSTIFICACION.MOTIVOS_CON_DOCUMENTO, "descanso_medico"],
          [VARIABLES_ALERTA.SALIDA_MINUTOS, "10"],
          [VARIABLES_ALERTA.UMBRAL_DIA, "45"],
          [VARIABLES_ALERTA.UMBRAL_SEMANA, "120"],
        ]),
      ),
      justificacionesPorEstado: jest.fn().mockResolvedValue([]),
      diasSinClases: jest.fn().mockResolvedValue([]),
      registrarAlertaEnviada: jest.fn().mockResolvedValue(true),
      usuariosConRol: jest.fn().mockResolvedValue(["u-sub"]),
      sesionesDelDia: jest.fn().mockResolvedValue([]),
      bloquesDelDia: jest.fn().mockResolvedValue([]),
      insertarSesiones: jest.fn().mockResolvedValue(0),
      minutosPerdidosPorDocente: jest.fn().mockResolvedValue([]),
    };
    notificaciones = { enviar: jest.fn().mockResolvedValue(undefined) };
    service = crear();
  });

  afterEach(() => jest.useRealTimers());

  const enviadas = () => notificaciones.enviar!.mock.calls as [Record<string, unknown>][];

  it("CP-RF019-22: avisa al aprobador de la solicitud vencida, enlazada a la bandeja", async () => {
    repo.justificacionesPorEstado!.mockResolvedValue([
      solicitud("ses-1", "2028-05-04", "2028-05-10"),
    ]);
    const avisadas = await service.avisarSolicitudesVencidas();
    expect(avisadas).toBe(1);
    expect(repo.usuariosConRol).toHaveBeenCalledWith(["Subdirector"]);
    expect(enviadas()).toHaveLength(1);
    expect(enviadas()[0][0]).toMatchObject({
      usuarioId: "u-sub",
      mensaje: "La justificación de Quispe (Matemática – 5.° A, 04/05) lleva 4 días sin respuesta.",
      enlaceUrl: "/admin/justificaciones-sesion",
    });
  });

  it("CP-RF019-22: no vuelve a avisar por la misma solicitud", async () => {
    repo.justificacionesPorEstado!.mockResolvedValue([
      solicitud("ses-1", "2028-05-04", "2028-05-10"),
    ]);
    await service.avisarSolicitudesVencidas();
    repo.registrarAlertaEnviada!.mockResolvedValue(false); // la clave ya existe
    notificaciones.enviar!.mockClear();
    expect(await service.avisarSolicitudesVencidas()).toBe(0);
    expect(notificaciones.enviar).not.toHaveBeenCalled();
    expect(repo.registrarAlertaEnviada).toHaveBeenLastCalledWith(
      "justificacion-vencida:ses-1:2028-05-10 09:00:00",
    );
  });

  it("una solicitud nueva de la misma sesión vuelve a avisar (la clave incluye la fecha de solicitud)", async () => {
    repo.justificacionesPorEstado!.mockResolvedValue([
      solicitud("ses-1", "2028-05-04", "2028-05-10"),
    ]);
    await service.avisarSolicitudesVencidas();
    repo.justificacionesPorEstado!.mockResolvedValue([
      solicitud("ses-1", "2028-05-04", "2028-05-09"),
    ]);
    await service.avisarSolicitudesVencidas();
    const claves = (repo.registrarAlertaEnviada!.mock.calls as [string][]).map(([c]) => c);
    expect(new Set(claves).size).toBe(2);
  });

  it("no avisa las solicitudes que aún no vencen", async () => {
    repo.justificacionesPorEstado!.mockResolvedValue([
      solicitud("ses-1", "2028-05-04", "2028-05-15"),
    ]);
    expect(await service.avisarSolicitudesVencidas()).toBe(0);
    expect(notificaciones.enviar).not.toHaveBeenCalled();
  });

  it("CP-RF019-33: una persona con dos roles recibe una sola notificación", async () => {
    repo.justificacionesPorEstado!.mockResolvedValue([
      solicitud("ses-1", "2028-05-04", "2028-05-10"),
    ]);
    repo.usuariosConRol!.mockResolvedValue(["u-sub", "u-sub"]);
    await service.avisarSolicitudesVencidas();
    expect(enviadas()).toHaveLength(1);
  });

  it("CP-RF019-33: lo mismo en las alertas de sesión (Subdirector y Director, una persona con ambos roles)", async () => {
    jest.setSystemTime(new Date(`${HOY}T12:00:00-05:00`));
    repo.minutosPerdidosPorDocente!.mockImplementation((desde: string, hasta: string) =>
      Promise.resolve(
        desde === hasta ? [{ docenteId: "doc-1", docenteNombre: "Quispe, Juan", minutos: 60 }] : [],
      ),
    );
    repo.usuariosConRol!.mockResolvedValue(["u-dir", "u-sub", "u-dir"]);
    await service.evaluarAlertas();
    expect(enviadas().map(([n]) => n.usuarioId)).toEqual(["u-dir", "u-sub"]);
  });

  it("CP-RF019-16 y 17: la alerta de salida va al panel «Sesiones de hoy» y no se repite", async () => {
    jest.setSystemTime(new Date(`${HOY}T09:50:00-05:00`));
    const enCurso = {
      ...solicitud("ses-9", HOY, HOY),
      fecha: HOY,
      estado: "en_curso" as const,
      justificacion: null,
      horaIngreso: "08:30",
    };
    repo.sesionesDelDia!.mockResolvedValue([enCurso]);
    await service.evaluarAlertas();
    expect(enviadas()[0][0]).toMatchObject({
      mensaje: "Matemática – 5.° A (prof. Quispe): faltan 10 minutos y no hay firma de salida.",
      enlaceUrl: "/admin/sesiones-hoy",
      tipo: "alerta",
    });
    repo.registrarAlertaEnviada!.mockResolvedValue(false);
    notificaciones.enviar!.mockClear();
    await service.evaluarAlertas();
    expect(notificaciones.enviar).not.toHaveBeenCalled();
  });

  it("CP-RF019-21: con el umbral del día en 0 no se envía la notificación de minutos perdidos", async () => {
    jest.setSystemTime(new Date(`${HOY}T12:00:00-05:00`));
    const valores = (await repo.valoresVariables!()) as Map<string, string>;
    valores.set(VARIABLES_ALERTA.UMBRAL_DIA, "0");
    repo.minutosPerdidosPorDocente!.mockImplementation((desde: string, hasta: string) =>
      Promise.resolve(
        desde === hasta ? [{ docenteId: "doc-1", docenteNombre: "Quispe, Juan", minutos: 90 }] : [],
      ),
    );
    await service.evaluarAlertas();
    expect(notificaciones.enviar).not.toHaveBeenCalled();
  });

  describe("P-49: el Director consulta, solo el Subdirector resuelve", () => {
    const guard = new RolesGuard(new Reflector(), {
      tieneMenu: jest.fn().mockResolvedValue(false),
    } as unknown as RolMenusService);
    const contexto = (handler: object, role: string) =>
      ({
        getHandler: () => handler,
        getClass: () => SesionesClaseController,
        switchToHttp: () => ({ getRequest: () => ({ user: { role, roleId: "r" } }) }),
      }) as unknown as ExecutionContext;
    const proto = SesionesClaseController.prototype;

    it.each(["aprobarJustificacion", "rechazarJustificacion"] as const)(
      "%s exige rol Subdirector (o Administrador)",
      async (metodo) => {
        const roles = Reflect.getMetadata(ROLES_KEY, proto[metodo]) as string[];
        expect(roles).toEqual(["Subdirector", "Administrador"]);
        expect(await guard.canActivate(contexto(proto[metodo], "Subdirector"))).toBe(true);
        expect(await guard.canActivate(contexto(proto[metodo], "Director"))).toBe(false);
      },
    );

    it("la bandeja no exige rol: el Director la ve por el menú", () => {
      expect(Reflect.getMetadata(ROLES_KEY, proto.justificaciones)).toBeUndefined();
    });
  });

  describe("CP-RF019-34: cada usuario solo ve sus notificaciones", () => {
    it("la bandeja se consulta siempre por el usuario autenticado", async () => {
      const repoNotif = { findByUsuario: jest.fn().mockResolvedValue({ data: [] }) };
      const servicio = new NotificacionesService(repoNotif as unknown as NotificacionesRepository);
      await servicio.obtenerBandeja("u-docente-otro");
      expect(repoNotif.findByUsuario).toHaveBeenCalledWith("u-docente-otro", undefined);
    });
  });
});
