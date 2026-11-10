import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { AniosAcademicosService } from "@/features/anio-escolar/anios.service";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { CalendarioService } from "@/features/calendario/calendario.service";
import { EquiposService } from "@/features/equipos/equipos.service";
import { MarcacionesService } from "@/features/marcaciones/marcaciones.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import {
  SesionesClaseRepository,
  SesionesClaseService,
  VARIABLES_ALERTA,
  VARIABLES_JUSTIFICACION,
  VARIABLES_SESION,
  type SesionResponseDto,
} from "@/features/sesiones-clase";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

const HOY = "2028-05-16"; // martes, bimestre II

const sesion = (p: Partial<SesionResponseDto> = {}): SesionResponseDto => ({
  id: "ses-1",
  fecha: HOY,
  horaInicio: "08:30",
  horaFin: "10:00",
  cursoNombre: "Matemática",
  seccionNombre: "5.° A",
  docenteId: "doc-1",
  docenteNombre: "Quispe, Juan",
  docenteTitularNombre: null,
  estado: "pendiente",
  tema: null,
  horaIngreso: null,
  horaSalida: null,
  minutosRetraso: 0,
  minutosPerdidos: 0,
  salidaAutomatica: false,
  observaciones: null,
  justificacion: null,
  ...p,
});

const docenteUsuario: AuthenticatedUser = {
  id: "u-doc",
  username: "doc",
  roleId: "r",
  role: "Docente",
  personaId: "per-doc",
};

describe("RF-011: Registro de sesión de clase", () => {
  let service: SesionesClaseService;
  let repo: Mocks<SesionesClaseRepository>;
  let equipos: Mocks<EquiposService>;
  let marcaciones: Mocks<MarcacionesService>;
  let anios: Mocks<AniosAcademicosService>;
  let calendario: Mocks<CalendarioService>;
  let audit: Mocks<AuditService>;

  const argumento = (m: jest.Mock | undefined, i: number): unknown =>
    (m!.mock.calls[0] as unknown[])[i];
  const reloj = (hora: string, fecha = HOY) =>
    jest.useFakeTimers({ now: new Date(`${fecha}T${hora}:00-05:00`) });
  const credenciales = { codigo: "CR-1", pin: "1234" };

  beforeEach(() => {
    reloj("08:30");
    repo = {
      valoresVariables: jest.fn().mockResolvedValue(
        new Map([
          [VARIABLES_SESION.MINUTOS_ANTES_FIRMA_INGRESO, "15"],
          [VARIABLES_SESION.TOLERANCIA_INGRESO, "15"],
          [VARIABLES_SESION.TOLERANCIA_SALIDA, "15"],
          [VARIABLES_SESION.SALIDA_AUTOMATICA, "true"],
          [VARIABLES_JUSTIFICACION.AVISO_DIAS, "3"],
          [VARIABLES_JUSTIFICACION.PERMISOS_MAX_ANIO, "3"],
          [
            VARIABLES_JUSTIFICACION.MOTIVOS_CON_DOCUMENTO,
            "descanso_medico,comision_de_servicio,licencia",
          ],
        ]),
      ),
      findById: jest.fn().mockResolvedValue(sesion()),
      docenteDePersona: jest.fn().mockResolvedValue({ id: "doc-1", activo: true }),
      firmarIngreso: jest.fn().mockResolvedValue(true),
      firmarSalida: jest.fn().mockResolvedValue(true),
      sesionesDeDocente: jest.fn().mockResolvedValue([]),
      sesionesDelDia: jest.fn().mockResolvedValue([]),
      bloquesDelDia: jest.fn().mockResolvedValue([]),
      insertarSesiones: jest.fn().mockResolvedValue(0),
      cerrarDia: jest.fn().mockResolvedValue({ noCumplidas: 0, parciales: 0 }),
      reemplazar: jest.fn().mockResolvedValue(true),
      docenteActivo: jest.fn().mockResolvedValue(true),
      solicitarJustificacion: jest.fn(),
      resolverJustificacion: jest.fn(),
      justificacionesPorEstado: jest.fn().mockResolvedValue([]),
      diasSinClases: jest.fn().mockResolvedValue([]),
      diasPermisoPersonal: jest.fn().mockResolvedValue([]),
      minutosPerdidosPorDocente: jest.fn().mockResolvedValue([]),
      registrarAlertaEnviada: jest.fn().mockResolvedValue(true),
      usuariosConRol: jest.fn().mockResolvedValue(["u-sub", "u-dir"]),
    };
    equipos = {
      validarKiosko: jest.fn().mockResolvedValue({
        valido: true,
        message: "ok",
        equipo: { id: "eq-ses", proposito: "sesiones", usuariosPermitidos: "docentes" },
      }),
    };
    marcaciones = {
      autenticarCredencial: jest.fn().mockResolvedValue({
        credencial: { id: "c" },
        persona: { personaId: "per-doc", nombreCompleto: "Quispe, Juan", tipoPersona: "docentes" },
      }),
    };
    anios = {
      anioVigente: jest.fn().mockResolvedValue({
        id: "anio",
        estado: "en_curso",
        bimestres: [{ fechaInicio: "2028-05-10", fechaFin: "2028-07-16" }],
      }),
      sesionesBloqueadasEn: jest.fn().mockResolvedValue(false),
    };
    calendario = { suspendeClasesEn: jest.fn().mockResolvedValue(false) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new SesionesClaseService(
      repo as unknown as SesionesClaseRepository,
      equipos as unknown as EquiposService,
      marcaciones as unknown as MarcacionesService,
      anios as unknown as AniosAcademicosService,
      calendario as unknown as CalendarioService,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => jest.useRealTimers());

  describe("HU1: generación y cierre", () => {
    it("CP-RF011-01: genera las sesiones de los bloques del día", async () => {
      repo.bloquesDelDia!.mockResolvedValue([
        {
          horarioId: "h1",
          seccionId: "5a",
          cursoSeccionId: "m",
          docenteId: "d",
          tipoBloque: "clase",
          horaInicio: "08:30:00",
          horaFin: "09:15:00",
        },
        {
          horarioId: "h2",
          seccionId: "5a",
          cursoSeccionId: "c",
          docenteId: "e",
          tipoBloque: "clase",
          horaInicio: "09:15:00",
          horaFin: "10:00:00",
        },
      ]);
      repo.insertarSesiones!.mockResolvedValue(2);
      await expect(service.generarDelDia(HOY)).resolves.toBe(2);
      expect(repo.bloquesDelDia).toHaveBeenCalledWith("anio", 2);
      expect(argumento(repo.insertarSesiones, 1)).toHaveLength(2);
    });

    it("CP-RF011-02: un feriado no genera sesiones", async () => {
      calendario.suspendeClasesEn!.mockResolvedValue(true);
      await expect(service.generarDelDia(HOY)).resolves.toBe(0);
      expect(repo.insertarSesiones).not.toHaveBeenCalled();
    });

    it("CP-RF011-04: entre bimestres no genera sesiones", async () => {
      await expect(service.generarDelDia("2028-07-25")).resolves.toBe(0);
      expect(repo.bloquesDelDia).not.toHaveBeenCalled();
    });

    it("CP-RF011-05 y 06: el cierre pasa a no_cumplida y a parcial con salida automática", async () => {
      repo.cerrarDia!.mockResolvedValue({ noCumplidas: 3, parciales: 1 });
      await service.cerrarDelDia(HOY);
      expect(repo.cerrarDia).toHaveBeenCalledWith(HOY, true, "Sin firma de salida");
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe("HU2: kiosko", () => {
    it("CP-RF011-07: ingreso a tiempo", async () => {
      const r = await service.firmarIngreso("tok", "ses-1", {
        ...credenciales,
        tema: "Ecuaciones cuadráticas",
      });
      expect(r.mensaje).toBe("Ingreso firmado a las 08:30. Matemática – 5.° A.");
      expect(repo.firmarIngreso).toHaveBeenCalledWith("ses-1", "doc-1", {
        hora: "08:30:00",
        tema: "Ecuaciones cuadráticas",
        minutosRetraso: 0,
        equipoId: "eq-ses",
      });
    });

    it("CP-RF011-08: ingreso con retraso", async () => {
      reloj("08:50");
      const r = await service.firmarIngreso("tok", "ses-1", { ...credenciales, tema: "x" });
      expect(r.mensaje).toBe("Ingreso firmado a las 08:50 con 20 minutos de retraso.");
    });

    it("CP-RF011-29: dentro de la tolerancia no hay retraso", async () => {
      reloj("08:42");
      await service.firmarIngreso("tok", "ses-1", { ...credenciales, tema: "x" });
      expect(argumento(repo.firmarIngreso, 2)).toMatchObject({ minutosRetraso: 0 });
    });

    it("CP-RF011-09: salida a tiempo deja la sesión cumplida", async () => {
      reloj("10:00");
      repo.findById!.mockResolvedValue(sesion({ estado: "en_curso" }));
      const r = await service.firmarSalida("tok", "ses-1", credenciales);
      expect(r.mensaje).toBe("Salida firmada a las 10:00. Sesión cumplida.");
      expect(argumento(repo.firmarSalida, 2)).toMatchObject({
        estado: "cumplida",
        minutosPerdidos: 0,
      });
    });

    it("CP-RF011-10: salida antes de tiempo deja la sesión parcial", async () => {
      reloj("09:40");
      repo.findById!.mockResolvedValue(sesion({ estado: "en_curso" }));
      const r = await service.firmarSalida("tok", "ses-1", credenciales);
      expect(r.mensaje).toBe("Salida firmada a las 09:40. Sesión parcial: 20 minutos perdidos.");
    });

    it("los minutos perdidos suman retraso y salida anticipada", async () => {
      reloj("09:40");
      repo.findById!.mockResolvedValue(sesion({ estado: "en_curso", minutosRetraso: 20 }));
      await service.firmarSalida("tok", "ses-1", credenciales);
      expect(argumento(repo.firmarSalida, 2)).toMatchObject({
        estado: "parcial",
        minutosPerdidos: 40,
      });
    });

    it("CP-RF011-11: sin tema no firma", async () => {
      await expect(
        service.firmarIngreso("tok", "ses-1", { ...credenciales, tema: "  " }),
      ).rejects.toThrow("Ingrese el tema de la sesión para firmar el ingreso.");
      expect(repo.firmarIngreso).not.toHaveBeenCalled();
    });

    it("CP-RF011-12: antes de la ventana", async () => {
      reloj("08:10");
      await expect(
        service.firmarIngreso("tok", "ses-1", { ...credenciales, tema: "x" }),
      ).rejects.toThrow("Aún no puede firmar. El ingreso se habilita a las 08:15.");
    });

    it("CP-RF011-13: después del fin del bloque", async () => {
      reloj("10:15");
      await expect(
        service.firmarIngreso("tok", "ses-1", { ...credenciales, tema: "x" }),
      ).rejects.toThrow("La sesión ya terminó. No se puede firmar el ingreso.");
    });

    it("CP-RF011-14: sin sesiones hoy", async () => {
      const r = await service.sesionesEnKiosko("tok", credenciales);
      expect(r.sesiones).toEqual([]);
      expect(r.mensaje).toBe("No tiene sesiones programadas para hoy.");
    });

    it("lista las sesiones del docente y destaca la actual", async () => {
      repo.sesionesDeDocente!.mockResolvedValue([sesion()]);
      const r = await service.sesionesEnKiosko("tok", credenciales);
      expect(r.destacadaId).toBe("ses-1");
      expect(repo.sesionesDeDocente).toHaveBeenCalledWith("doc-1", HOY, HOY);
    });

    it("CP-RF011-15: la sesión reasignada a otro docente no se puede firmar", async () => {
      repo.findById!.mockResolvedValue(sesion({ docenteId: "doc-reemplazo" }));
      await expect(
        service.firmarIngreso("tok", "ses-1", { ...credenciales, tema: "x" }),
      ).rejects.toThrow(new ForbiddenException("Esta sesión está asignada a otro docente."));
    });

    it("CP-RF011-16: PIN incorrecto no muestra sesiones", async () => {
      marcaciones.autenticarCredencial!.mockRejectedValue(
        new BadRequestException("Código o PIN incorrecto."),
      );
      await expect(service.sesionesEnKiosko("tok", credenciales)).rejects.toThrow(
        "Código o PIN incorrecto.",
      );
      expect(repo.sesionesDeDocente).not.toHaveBeenCalled();
    });

    it("CP-RF011-17: un equipo que no es de sesiones no permite firmar", async () => {
      equipos.validarKiosko!.mockResolvedValue({
        valido: true,
        message: "ok",
        equipo: { id: "eq", proposito: "marcacion", usuariosPermitidos: "docentes" },
      });
      await expect(service.sesionesEnKiosko("tok", credenciales)).rejects.toThrow(
        "Este equipo no está autorizado. Comuníquese con el área de TI.",
      );
    });

    it("CP-RF011-18: el doble clic registra una sola firma", async () => {
      repo.firmarIngreso!.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      await service.firmarIngreso("tok", "ses-1", { ...credenciales, tema: "x" });
      await expect(
        service.firmarIngreso("tok", "ses-1", { ...credenciales, tema: "x" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("HU3: subdirección", () => {
    it("CP-RF011-20: el panel alerta las sesiones que pasaron la tolerancia sin firma", async () => {
      reloj("08:40");
      repo.sesionesDelDia!.mockResolvedValue([
        sesion({ id: "a", horaInicio: "07:45" }),
        sesion({ id: "b", horaInicio: "08:30" }),
        sesion({ id: "c", horaInicio: "07:45", estado: "en_curso" }),
      ]);
      const r = await service.panelDeHoy();
      expect(r.sesiones.map((s) => s.alerta)).toEqual([true, false, false]);
      expect(r.totalAlertas).toBe(1);
    });

    it("CP-RF011-21: asigna un reemplazo a una sesión pendiente", async () => {
      await service.asignarReemplazo("ses-1", { docenteId: "doc-flores" }, "u-sub");
      expect(repo.reemplazar).toHaveBeenCalledWith("ses-1", "doc-flores");
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: "u-sub" }));
    });

    it("CP-RF011-22: no reemplaza una sesión ya firmada", async () => {
      repo.findById!.mockResolvedValue(sesion({ estado: "en_curso" }));
      await expect(
        service.asignarReemplazo("ses-1", { docenteId: "doc-flores" }, "u"),
      ).rejects.toThrow("Solo se puede asignar un reemplazo a una sesión sin firmar.");
    });

    const conSolicitud = sesion({
      estado: "no_cumplida",
      justificacion: {
        estado: "solicitada",
        motivo: "Descanso médico",
        motivoCodigo: "descanso_medico",
        documentoUrl: null,
        comentario: null,
        solicitadaEn: null,
        revisadaEn: null,
      },
    });

    it("CP-RF011-23: aprobar deja la sesión justificada", async () => {
      repo.findById!.mockResolvedValue(conSolicitud);
      const r = await service.aprobarJustificacion("ses-1", "u-sub");
      expect(r.mensaje).toBe("Sesión justificada.");
      expect(repo.resolverJustificacion).toHaveBeenCalledWith("ses-1", "aprobada", "u-sub", null);
    });

    it("CP-RF011-24: rechazar exige comentario y deja la sesión no cumplida", async () => {
      repo.findById!.mockResolvedValue(conSolicitud);
      await expect(
        service.rechazarJustificacion("ses-1", { comentario: " " }, "u"),
      ).rejects.toThrow("Indique el motivo del rechazo.");
      await service.rechazarJustificacion(
        "ses-1",
        { comentario: "No presentó documento" },
        "u-sub",
      );
      expect(repo.resolverJustificacion).toHaveBeenCalledWith(
        "ses-1",
        "rechazada",
        "u-sub",
        "No presentó documento",
      );
    });
  });

  describe("HU4: mis sesiones", () => {
    it("CP-RF011-25: lista mis sesiones con totales", async () => {
      repo.sesionesDeDocente!.mockResolvedValue([
        sesion({ estado: "cumplida" }),
        sesion({ estado: "parcial" }),
        sesion({ estado: "no_cumplida" }),
      ]);
      const r = await service.misSesiones(docenteUsuario, {
        desde: "2028-05-10",
        hasta: "2028-07-16",
      });
      expect(r.totales).toMatchObject({ cumplidas: 1, parciales: 1, noCumplidas: 1 });
    });

    it("CP-RF011-26: solicita la justificación de una sesión no cumplida", async () => {
      repo.findById!.mockResolvedValue(sesion({ estado: "no_cumplida" }));
      const r = await service.solicitarJustificacion(
        "ses-1",
        { motivo: "descanso_medico", documentoUrl: "https://x/cert.pdf" },
        docenteUsuario,
      );
      expect(r.mensaje).toBe("Su justificación fue enviada al subdirector.");
      expect(repo.solicitarJustificacion).toHaveBeenCalledWith("ses-1", {
        motivoCodigo: "descanso_medico",
        motivo: "Descanso médico",
        documentoUrl: "https://x/cert.pdf",
      });
    });

    it("CP-RF011-27: sin motivo no se envía", async () => {
      await expect(
        service.solicitarJustificacion("ses-1", { motivo: "" as never }, docenteUsuario),
      ).rejects.toThrow("Elija el motivo de la justificación.");
    });

    it("CP-RF011-28: bimestre cerrado bloquea justificar y corregir el tema", async () => {
      anios.sesionesBloqueadasEn!.mockResolvedValue(true);
      repo.findById!.mockResolvedValue(sesion({ estado: "no_cumplida" }));
      const mensaje = "El bimestre está cerrado. La sesión ya no se puede modificar.";
      await expect(
        service.solicitarJustificacion("ses-1", { motivo: "permiso_personal" }, docenteUsuario),
      ).rejects.toThrow(mensaje);
      await expect(service.corregirTema("ses-1", { tema: "y" }, docenteUsuario)).rejects.toThrow(
        mensaje,
      );
    });

    it("otro docente no puede justificar una sesión ajena", async () => {
      repo.findById!.mockResolvedValue(sesion({ estado: "no_cumplida", docenteId: "otro" }));
      await expect(
        service.solicitarJustificacion("ses-1", { motivo: "permiso_personal" }, docenteUsuario),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("RF-011 V3: justificaciones", () => {
    const noCumplida = () => sesion({ estado: "no_cumplida" });
    const solicitud = (p: Partial<NonNullable<SesionResponseDto["justificacion"]>> = {}) =>
      sesion({
        estado: "no_cumplida",
        justificacion: {
          estado: "solicitada",
          motivo: "Permiso personal",
          motivoCodigo: "permiso_personal",
          documentoUrl: null,
          comentario: null,
          solicitadaEn: `${HOY} 09:00:00`,
          revisadaEn: null,
          ...p,
        },
      });

    it("CP-RF011-44: el catálogo trae los seis motivos con su regla de documento", async () => {
      const motivos = await service.motivosJustificacion();
      expect(motivos.map((m) => m.etiqueta)).toEqual([
        "Descanso médico",
        "Permiso personal",
        "Comisión de servicio",
        "Licencia",
        "Caso fortuito o fuerza mayor",
        "Otro",
      ]);
      const porCodigo = Object.fromEntries(motivos.map((m) => [m.codigo, m]));
      expect(porCodigo.descanso_medico.requiereDocumento).toBe(true);
      expect(porCodigo.permiso_personal.requiereDocumento).toBe(false);
      expect(porCodigo.otro.requiereObservacion).toBe(true);
    });

    it("CP-RF011-45: descanso médico sin documento no se envía", async () => {
      repo.findById!.mockResolvedValue(noCumplida());
      await expect(
        service.solicitarJustificacion("ses-1", { motivo: "descanso_medico" }, docenteUsuario),
      ).rejects.toThrow("Para este motivo debe adjuntar un documento.");
      expect(repo.solicitarJustificacion).not.toHaveBeenCalled();
    });

    it("CP-RF011-46: permiso personal sin documento queda solicitada", async () => {
      repo.findById!.mockResolvedValue(noCumplida());
      const r = await service.solicitarJustificacion(
        "ses-1",
        { motivo: "permiso_personal" },
        docenteUsuario,
      );
      expect(r.mensaje).toBe("Su justificación fue enviada al subdirector.");
      expect(repo.solicitarJustificacion).toHaveBeenCalledWith(
        "ses-1",
        expect.objectContaining({ motivoCodigo: "permiso_personal", documentoUrl: null }),
      );
    });

    it("CP-RF011-47: el motivo «Otro» exige la observación y la guarda como texto", async () => {
      repo.findById!.mockResolvedValue(noCumplida());
      await expect(
        service.solicitarJustificacion("ses-1", { motivo: "otro" }, docenteUsuario),
      ).rejects.toThrow("Indique la observación del motivo «Otro».");
      await service.solicitarJustificacion(
        "ses-1",
        { motivo: "otro", observacion: " Cita en el juzgado " },
        docenteUsuario,
      );
      expect(repo.solicitarJustificacion).toHaveBeenCalledWith(
        "ses-1",
        expect.objectContaining({ motivoCodigo: "otro", motivo: "Cita en el juzgado" }),
      );
    });

    it("CP-RF011-43: permiso personal y licencia traen el aviso de la norma; descanso médico no", async () => {
      const motivos = await service.motivosJustificacion();
      const aviso = (c: string) => motivos.find((m) => m.codigo === c)?.aviso;
      expect(aviso("permiso_personal")).toBe(
        "Presentar la solicitud no da derecho al permiso o licencia; debe ser aprobada.",
      );
      expect(aviso("licencia")).toBeTruthy();
      expect(aviso("descanso_medico")).toBeNull();
    });

    it("CP-RF011-37: la bandeja va de la más antigua a la reciente y marca la vencida", async () => {
      // Martes 16/05/2028: hace 1, 2 y 4 días hábiles (jueves 11 → 4 hábiles; viernes 12 → 2... )
      const hace = (fecha: string, id: string) =>
        sesion({
          id,
          estado: "no_cumplida",
          justificacion: {
            estado: "solicitada",
            motivo: "Permiso personal",
            motivoCodigo: "permiso_personal",
            documentoUrl: null,
            comentario: null,
            solicitadaEn: `${fecha} 09:00:00`,
            revisadaEn: null,
          },
        });
      repo.justificacionesPorEstado!.mockResolvedValue([
        hace("2028-05-15", "reciente"), // lunes → 1 día hábil
        hace("2028-05-10", "antigua"), // miércoles → 4 días hábiles
        hace("2028-05-12", "media"), // viernes → 2 días hábiles
      ]);
      const bandeja = await service.justificacionesSolicitadas();
      expect(bandeja.map((b) => [b.id, b.antiguedadDias, b.vencida])).toEqual([
        ["antigua", 4, true],
        ["media", 2, false],
        ["reciente", 1, false],
      ]);
    });

    it("CP-RF011-38: filtra por motivo y por vencidas a la vez", async () => {
      const con = (id: string, codigo: string, fecha: string) => ({
        ...solicitud({ motivoCodigo: codigo, solicitadaEn: `${fecha} 09:00:00` }),
        id,
      });
      repo.justificacionesPorEstado!.mockResolvedValue([
        con("a", "descanso_medico", "2028-05-10"), // vencida
        con("b", "descanso_medico", "2028-05-15"), // reciente
        con("c", "permiso_personal", "2028-05-10"), // vencida, otro motivo
      ]);
      const r = await service.justificacionesSolicitadas({
        motivo: "descanso_medico",
        vencidas: "true",
      });
      expect(r.map((x) => x.id)).toEqual(["a"]);
    });

    it("los días sin clases no cuentan para la antigüedad", async () => {
      repo.diasSinClases!.mockResolvedValue(["2028-05-11", "2028-05-12"]);
      repo.justificacionesPorEstado!.mockResolvedValue([
        solicitud({ solicitadaEn: "2028-05-10 09:00:00" }),
      ]);
      const [item] = await service.justificacionesSolicitadas();
      expect(item.antiguedadDias).toBe(2); // solo lunes 15 y martes 16
      expect(item.vencida).toBe(false);
    });

    it("CP-RF011-40: al abrir la solicitud muestra cuántos días de permiso lleva", async () => {
      repo.findById!.mockResolvedValue(solicitud());
      repo.diasPermisoPersonal!.mockResolvedValue(["2028-04-03", "2028-04-20"]);
      const r = await service.detalleSolicitud("ses-1");
      expect(r.permisosPersonales).toEqual({
        usados: 2,
        tope: 3,
        mensaje: "Lleva 2 de 3 días de permiso personal este año.",
      });
    });

    it("el contador solo aplica al permiso personal", async () => {
      repo.findById!.mockResolvedValue(
        solicitud({ motivo: "Descanso médico", motivoCodigo: "descanso_medico" }),
      );
      const r = await service.detalleSolicitud("ses-1");
      expect(r.permisosPersonales).toBeNull();
    });

    it("CP-RF011-41: al superar el tope pide confirmar y, si confirma, aprueba y lo deja en la bitácora", async () => {
      repo.findById!.mockResolvedValue(solicitud());
      repo.diasPermisoPersonal!.mockResolvedValue(["2028-04-03", "2028-04-20", "2028-05-02"]);
      await expect(service.aprobarJustificacion("ses-1", "u-sub")).rejects.toMatchObject({
        response: {
          message:
            "Con esta aprobación superará los 3 días de permiso personal al año. ¿Desea continuar?",
          requiereConfirmacion: true,
        },
      });
      expect(repo.resolverJustificacion).not.toHaveBeenCalled();

      const r = await service.aprobarJustificacion("ses-1", "u-sub", undefined, {
        confirmarTope: true,
      });
      expect(r.mensaje).toBe("Sesión justificada.");
      expect(repo.resolverJustificacion).toHaveBeenCalledWith("ses-1", "aprobada", "u-sub", null);
      expect(argumento(audit.log, 0)).toMatchObject({
        valorNuevo: { topePermisosSuperado: true, tope: 3 },
      });
    });

    it("dentro del tope aprueba sin pedir confirmación", async () => {
      repo.findById!.mockResolvedValue(solicitud());
      repo.diasPermisoPersonal!.mockResolvedValue(["2028-04-03", "2028-04-20"]);
      const r = await service.aprobarJustificacion("ses-1", "u-sub");
      expect(r.mensaje).toBe("Sesión justificada.");
    });

    it("CP-RF011-42: varias sesiones del mismo día cuentan un solo día", async () => {
      // Ya hay 3 días justificados y uno de ellos es el mismo día de esta sesión: no suma otro.
      repo.findById!.mockResolvedValue(solicitud());
      repo.diasPermisoPersonal!.mockResolvedValue(["2028-04-03", "2028-04-20", HOY]);
      const r = await service.aprobarJustificacion("ses-1", "u-sub");
      expect(r.mensaje).toBe("Sesión justificada.");
    });
  });

  describe("RF-011 V3: alertas del panel", () => {
    let notificaciones: Mocks<NotificacionesService>;
    let conAlertas: SesionesClaseService;

    const enCurso = (p: Partial<SesionResponseDto> = {}) =>
      sesion({ estado: "en_curso", horaIngreso: "08:30", ...p });

    const configurar = (extra: Record<string, string> = {}) => {
      const base = new Map<string, string>([
        [VARIABLES_SESION.MINUTOS_ANTES_FIRMA_INGRESO, "15"],
        [VARIABLES_SESION.TOLERANCIA_INGRESO, "15"],
        [VARIABLES_SESION.TOLERANCIA_SALIDA, "15"],
        [VARIABLES_SESION.SALIDA_AUTOMATICA, "true"],
        [VARIABLES_ALERTA.SALIDA_MINUTOS, "10"],
        [VARIABLES_ALERTA.UMBRAL_DIA, "45"],
        [VARIABLES_ALERTA.UMBRAL_SEMANA, "120"],
      ]);
      for (const [k, v] of Object.entries(extra)) base.set(k, v);
      repo.valoresVariables!.mockResolvedValue(base);
    };

    beforeEach(() => {
      notificaciones = { enviar: jest.fn().mockResolvedValue(undefined) };
      conAlertas = new SesionesClaseService(
        repo as unknown as SesionesClaseRepository,
        equipos as unknown as EquiposService,
        marcaciones as unknown as MarcacionesService,
        anios as unknown as AniosAcademicosService,
        calendario as unknown as CalendarioService,
        audit as unknown as AuditService,
        undefined,
        undefined,
        notificaciones as unknown as NotificacionesService,
      );
      configurar();
    });

    it("CP-RF011-30: alerta la sesión por terminar sin firma de salida y avisa al Subdirector y al Director", async () => {
      reloj("09:50");
      repo.sesionesDelDia!.mockResolvedValue([enCurso()]);
      const panel = await conAlertas.panelDeHoy();
      expect(panel.sesiones[0].alertaSalida).toBe(
        "Matemática – 5.° A (prof. Quispe): faltan 10 minutos y no hay firma de salida.",
      );
      expect(panel.totalAlertas).toBe(1);
      expect(repo.registrarAlertaEnviada).toHaveBeenCalledWith("salida:ses-1");
      const llamadas = notificaciones.enviar!.mock.calls as [{ usuarioId: string }][];
      expect(llamadas.map(([n]) => n.usuarioId)).toEqual(["u-sub", "u-dir"]);
    });

    it("no alerta antes de la anticipación configurada", async () => {
      reloj("09:40");
      repo.sesionesDelDia!.mockResolvedValue([enCurso()]);
      const panel = await conAlertas.panelDeHoy();
      expect(panel.sesiones[0].alertaSalida).toBeNull();
      expect(notificaciones.enviar).not.toHaveBeenCalled();
    });

    it("CP-RF011-31: la alerta de salida sigue en el panel pero no se notifica dos veces", async () => {
      reloj("09:55");
      repo.sesionesDelDia!.mockResolvedValue([enCurso()]);
      repo.registrarAlertaEnviada!.mockResolvedValue(false); // ya se envió a las 09:50
      const panel = await conAlertas.panelDeHoy();
      expect(panel.sesiones[0].alertaSalida).toContain("faltan 5 minutos");
      expect(notificaciones.enviar).not.toHaveBeenCalled();
    });

    it("CP-RF011-32: al firmar la salida la alerta desaparece del panel", async () => {
      reloj("09:55");
      repo.sesionesDelDia!.mockResolvedValue([
        enCurso({ estado: "cumplida", horaSalida: "09:55" }),
      ]);
      const panel = await conAlertas.panelDeHoy();
      expect(panel.sesiones[0].alertaSalida).toBeNull();
      expect(panel.totalAlertas).toBe(0);
    });

    it("CP-RF011-33: alerta por minutos perdidos del día y una sola notificación por docente y día", async () => {
      reloj("12:00");
      repo.minutosPerdidosPorDocente!.mockImplementation((desde: string, hasta: string) =>
        Promise.resolve(
          desde === hasta
            ? [{ docenteId: "doc-1", docenteNombre: "Quispe, Juan", minutos: 60 }]
            : [],
        ),
      );
      const panel = await conAlertas.panelDeHoy();
      expect(panel.alertasMinutos).toHaveLength(1);
      expect(panel.alertasMinutos[0].mensaje).toBe(
        "El docente Quispe acumula 60 minutos perdidos hoy (umbral: 45).",
      );
      expect(repo.registrarAlertaEnviada).toHaveBeenCalledWith(`minutos-dia:doc-1:${HOY}`);
      expect(notificaciones.enviar).toHaveBeenCalledTimes(2); // Subdirector y Director
    });

    it("CP-RF011-34: alerta semanal con la semana de lunes a viernes", async () => {
      reloj("12:00");
      repo.minutosPerdidosPorDocente!.mockImplementation((desde: string, hasta: string) =>
        Promise.resolve(
          desde !== hasta
            ? [{ docenteId: "doc-1", docenteNombre: "Quispe, Juan", minutos: 125 }]
            : [],
        ),
      );
      const panel = await conAlertas.panelDeHoy();
      expect(repo.minutosPerdidosPorDocente).toHaveBeenCalledWith("2028-05-15", "2028-05-19");
      expect(panel.alertasMinutos[0]).toMatchObject({
        periodo: "semana",
        minutos: 125,
        umbral: 120,
      });
      expect(repo.registrarAlertaEnviada).toHaveBeenCalledWith("minutos-semana:doc-1:2028-05-15");
    });

    it("CP-RF011-36: con el umbral en 0 no se muestra ni se envía la alerta del día", async () => {
      reloj("12:00");
      configurar({ [VARIABLES_ALERTA.UMBRAL_DIA]: "0" });
      repo.minutosPerdidosPorDocente!.mockImplementation((desde: string, hasta: string) =>
        Promise.resolve(
          desde === hasta
            ? [{ docenteId: "doc-1", docenteNombre: "Quispe, Juan", minutos: 90 }]
            : [],
        ),
      );
      const panel = await conAlertas.panelDeHoy();
      expect(panel.alertasMinutos).toEqual([]);
      expect(notificaciones.enviar).not.toHaveBeenCalled();
    });

    it("sin las variables en la base el panel funciona y no alerta", async () => {
      reloj("09:55");
      repo.valoresVariables!.mockResolvedValue(
        new Map([
          [VARIABLES_SESION.MINUTOS_ANTES_FIRMA_INGRESO, "15"],
          [VARIABLES_SESION.TOLERANCIA_INGRESO, "15"],
          [VARIABLES_SESION.TOLERANCIA_SALIDA, "15"],
          [VARIABLES_SESION.SALIDA_AUTOMATICA, "true"],
        ]),
      );
      repo.sesionesDelDia!.mockResolvedValue([enCurso()]);
      const panel = await conAlertas.panelDeHoy();
      expect(panel.sesiones[0].alertaSalida).toBeNull();
      expect(panel.alertasMinutos).toEqual([]);
    });

    it("si falla el envío el panel igual responde", async () => {
      reloj("09:50");
      repo.sesionesDelDia!.mockResolvedValue([enCurso()]);
      notificaciones.enviar!.mockRejectedValue(new Error("redis caído"));
      await expect(conAlertas.panelDeHoy()).resolves.toMatchObject({ totalAlertas: 1 });
    });

    it("la tarea periódica envía las alertas sin abrir el panel", async () => {
      reloj("09:50");
      repo.sesionesDelDia!.mockResolvedValue([enCurso()]);
      await conAlertas.evaluarAlertas();
      expect(notificaciones.enviar).toHaveBeenCalledTimes(2);
    });
  });
});
