import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { AniosAcademicosService } from "@/features/anio-escolar/anios.service";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { CalendarioService } from "@/features/calendario/calendario.service";
import { EquiposService } from "@/features/equipos/equipos.service";
import { MarcacionesService } from "@/features/marcaciones/marcaciones.service";
import {
  SesionesClaseRepository,
  SesionesClaseService,
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
        { motivo: "Descanso médico", documentoUrl: "https://x/cert.pdf" },
        docenteUsuario,
      );
      expect(r.mensaje).toBe("Su justificación fue enviada al subdirector.");
      expect(repo.solicitarJustificacion).toHaveBeenCalledWith(
        "ses-1",
        "Descanso médico",
        "https://x/cert.pdf",
      );
    });

    it("CP-RF011-27: sin motivo no se envía", async () => {
      await expect(
        service.solicitarJustificacion("ses-1", { motivo: "" }, docenteUsuario),
      ).rejects.toThrow("Indique el motivo de la justificación.");
    });

    it("CP-RF011-28: bimestre cerrado bloquea justificar y corregir el tema", async () => {
      anios.sesionesBloqueadasEn!.mockResolvedValue(true);
      repo.findById!.mockResolvedValue(sesion({ estado: "no_cumplida" }));
      const mensaje = "El bimestre está cerrado. La sesión ya no se puede modificar.";
      await expect(
        service.solicitarJustificacion("ses-1", { motivo: "x" }, docenteUsuario),
      ).rejects.toThrow(mensaje);
      await expect(service.corregirTema("ses-1", { tema: "y" }, docenteUsuario)).rejects.toThrow(
        mensaje,
      );
    });

    it("otro docente no puede justificar una sesión ajena", async () => {
      repo.findById!.mockResolvedValue(sesion({ estado: "no_cumplida", docenteId: "otro" }));
      await expect(
        service.solicitarJustificacion("ses-1", { motivo: "x" }, docenteUsuario),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("Firma web del docente (header)", () => {
    it("miJornadaHoy devuelve sesiones de hoy con destacadaId y minutosAntes", async () => {
      repo.sesionesDeDocente!.mockResolvedValue([sesion()]);
      const r = await service.miJornadaHoy(docenteUsuario);
      expect(r.fecha).toBe(HOY);
      expect(r.destacadaId).toBe("ses-1");
      expect(r.minutosAntes).toBe(15);
      expect(r.firmaWebHabilitada).toBe(true);
      expect(r.sesiones).toHaveLength(1);
    });

    it("permite firmar ingreso y salida desde la web sin equipoId", async () => {
      const ingreso = await service.firmarIngresoWeb(
        "ses-1",
        { tema: "Fracciones" },
        docenteUsuario,
        "127.0.0.1",
      );
      expect(ingreso.mensaje).toBe("Ingreso firmado a las 08:30. Matemática – 5.° A.");
      expect(repo.firmarIngreso).toHaveBeenCalledWith("ses-1", "doc-1", {
        hora: "08:30:00",
        tema: "Fracciones",
        minutosRetraso: 0,
        equipoId: null,
      });

      reloj("10:00");
      repo.findById!.mockResolvedValue(sesion({ estado: "en_curso" }));
      const salida = await service.firmarSalidaWeb("ses-1", docenteUsuario, "127.0.0.1");
      expect(salida.mensaje).toBe("Salida firmada a las 10:00. Sesión cumplida.");
      expect(repo.firmarSalida).toHaveBeenCalledWith("ses-1", "doc-1", {
        hora: "10:00:00",
        minutosPerdidos: 0,
        estado: "cumplida",
        equipoId: null,
      });
    });

    it("bloquea la firma web si el usuario está en vista simulada", async () => {
      const simulado: AuthenticatedUser = {
        ...docenteUsuario,
        impersonatedBy: {
          userId: "u-admin",
          username: "admin",
          roleId: "r-admin",
          role: "Administrador",
        },
      };
      await expect(service.firmarIngresoWeb("ses-1", { tema: "x" }, simulado)).rejects.toThrow(
        "No puede firmar sesiones de clase mientras usa la vista simulada.",
      );
      await expect(service.firmarSalidaWeb("ses-1", simulado)).rejects.toThrow(
        "No puede firmar sesiones de clase mientras usa la vista simulada.",
      );
      expect(repo.firmarIngreso).not.toHaveBeenCalled();
    });
  });
});
