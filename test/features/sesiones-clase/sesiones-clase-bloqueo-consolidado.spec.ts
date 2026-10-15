import { ForbiddenException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { AniosAcademicosService } from "@/features/anio-escolar/anios.service";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { CalendarioService } from "@/features/calendario/calendario.service";
import { EquiposService } from "@/features/equipos/equipos.service";
import { MarcacionesService } from "@/features/marcaciones/marcaciones.service";
import { ConsolidadoBloqueoService, MENSAJES_CONSOLIDADO } from "@/features/seguimiento-docente";
import {
  SesionesClaseRepository,
  SesionesClaseService,
  VARIABLES_SESION,
  type SesionResponseDto,
} from "@/features/sesiones-clase";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

const HOY = "2028-05-16";

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

describe("CP-RF013-06: Bloqueo de sesiones de clase por consolidado cerrado", () => {
  let service: SesionesClaseService;
  let repo: Mocks<SesionesClaseRepository>;
  let equipos: Mocks<EquiposService>;
  let marcaciones: Mocks<MarcacionesService>;
  let anios: Mocks<AniosAcademicosService>;
  let calendario: Mocks<CalendarioService>;
  let audit: Mocks<AuditService>;
  let bloqueo: Mocks<ConsolidadoBloqueoService>;

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
      solicitarJustificacion: jest.fn().mockResolvedValue(undefined),
      resolverJustificacion: jest.fn().mockResolvedValue(undefined),
      actualizarTema: jest.fn().mockResolvedValue(true),
      buscarPeriodoIdPorFecha: jest.fn().mockResolvedValue("periodo-bim-1"),
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
    bloqueo = {
      asegurarNoCerrado: jest.fn().mockResolvedValue(undefined),
      asegurarNoCerradoPorFecha: jest.fn().mockResolvedValue(undefined),
    };

    service = new SesionesClaseService(
      repo as unknown as SesionesClaseRepository,
      equipos as unknown as EquiposService,
      marcaciones as unknown as MarcacionesService,
      anios as unknown as AniosAcademicosService,
      calendario as unknown as CalendarioService,
      audit as unknown as AuditService,
      bloqueo as unknown as ConsolidadoBloqueoService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Operaciones bloqueadas cuando el consolidado está cerrado (403)", () => {
    beforeEach(() => {
      bloqueo.asegurarNoCerrado!.mockRejectedValue(
        new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO),
      );
    });

    it("asignarReemplazo: lanza 403 si el consolidado del titular está cerrado", async () => {
      await expect(
        service.asignarReemplazo("ses-1", { docenteId: "doc-reemplazo" }, "u-sub"),
      ).rejects.toThrow(new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO));

      expect(repo.reemplazar).not.toHaveBeenCalled();
    });

    it("asignarReemplazo: lanza 403 si el consolidado del reemplazo está cerrado", async () => {
      bloqueo
        .asegurarNoCerrado!.mockResolvedValueOnce(undefined) // titular pasa
        .mockRejectedValueOnce(new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO)); // reemplazo falla

      await expect(
        service.asignarReemplazo("ses-1", { docenteId: "doc-reemplazo" }, "u-sub"),
      ).rejects.toThrow(new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO));

      expect(repo.reemplazar).not.toHaveBeenCalled();
    });

    it("solicitarJustificacion: lanza 403 si el consolidado está cerrado", async () => {
      repo.findById!.mockResolvedValue(sesion({ estado: "no_cumplida" }));

      await expect(
        service.solicitarJustificacion("ses-1", { motivo: "Salud" }, docenteUsuario),
      ).rejects.toThrow(new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO));

      expect(repo.solicitarJustificacion).not.toHaveBeenCalled();
    });

    it("aprobarJustificacion: lanza 403 si el consolidado está cerrado", async () => {
      repo.findById!.mockResolvedValue(
        sesion({
          estado: "no_cumplida",
          justificacion: {
            estado: "solicitada",
            motivo: "Salud",
            documentoUrl: null,
            comentario: null,
            solicitadaEn: null,
            revisadaEn: null,
          },
        }),
      );

      await expect(service.aprobarJustificacion("ses-1", "u-sub")).rejects.toThrow(
        new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO),
      );

      expect(repo.resolverJustificacion).not.toHaveBeenCalled();
    });

    it("rechazarJustificacion: lanza 403 si el consolidado está cerrado", async () => {
      repo.findById!.mockResolvedValue(
        sesion({
          estado: "no_cumplida",
          justificacion: {
            estado: "solicitada",
            motivo: "Salud",
            documentoUrl: null,
            comentario: null,
            solicitadaEn: null,
            revisadaEn: null,
          },
        }),
      );

      await expect(
        service.rechazarJustificacion("ses-1", { comentario: "Sin sustento" }, "u-sub"),
      ).rejects.toThrow(new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO));

      expect(repo.resolverJustificacion).not.toHaveBeenCalled();
    });

    it("corregirTema: lanza 403 si el consolidado está cerrado", async () => {
      repo.findById!.mockResolvedValue(sesion({ tema: "Tema anterior" }));

      await expect(
        service.corregirTema("ses-1", { tema: "Nuevo tema" }, docenteUsuario),
      ).rejects.toThrow(new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO));

      expect(repo.actualizarTema).not.toHaveBeenCalled();
    });

    it("firmarIngreso: lanza 403 si el consolidado está cerrado", async () => {
      await expect(
        service.firmarIngreso("tok-kiosko", "ses-1", { ...credenciales, tema: "Álgebra" }),
      ).rejects.toThrow(new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO));

      expect(repo.firmarIngreso).not.toHaveBeenCalled();
    });

    it("firmarSalida: lanza 403 si el consolidado está cerrado", async () => {
      repo.findById!.mockResolvedValue(sesion({ estado: "en_curso" }));

      await expect(service.firmarSalida("tok-kiosko", "ses-1", credenciales)).rejects.toThrow(
        new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO),
      );

      expect(repo.firmarSalida).not.toHaveBeenCalled();
    });
  });

  describe("Operaciones permitidas cuando el consolidado está reabierto o inexistente", () => {
    beforeEach(() => {
      bloqueo.asegurarNoCerrado!.mockResolvedValue(undefined);
    });

    it("asignarReemplazo: procede con éxito", async () => {
      const res = await service.asignarReemplazo("ses-1", { docenteId: "doc-reemplazo" }, "u-sub");
      expect(res.id).toBe("ses-1");
      expect(repo.reemplazar).toHaveBeenCalledWith("ses-1", "doc-reemplazo");
      expect(bloqueo.asegurarNoCerrado).toHaveBeenCalledWith("doc-1", "periodo-bim-1");
      expect(bloqueo.asegurarNoCerrado).toHaveBeenCalledWith("doc-reemplazo", "periodo-bim-1");
    });

    it("solicitarJustificacion: procede con éxito", async () => {
      repo.findById!.mockResolvedValue(sesion({ estado: "no_cumplida" }));

      const res = await service.solicitarJustificacion(
        "ses-1",
        { motivo: "Cita médica" },
        docenteUsuario,
      );
      expect(res.mensaje).toBe("Su justificación fue enviada al subdirector.");
      expect(repo.solicitarJustificacion).toHaveBeenCalledWith("ses-1", "Cita médica", null);
    });

    it("aprobarJustificacion: procede con éxito", async () => {
      repo.findById!.mockResolvedValue(
        sesion({
          estado: "no_cumplida",
          justificacion: {
            estado: "solicitada",
            motivo: "Salud",
            documentoUrl: null,
            comentario: null,
            solicitadaEn: null,
            revisadaEn: null,
          },
        }),
      );

      const res = await service.aprobarJustificacion("ses-1", "u-sub");
      expect(res.mensaje).toBe("Sesión justificada.");
      expect(repo.resolverJustificacion).toHaveBeenCalledWith("ses-1", "aprobada", "u-sub", null);
    });

    it("rechazarJustificacion: procede con éxito", async () => {
      repo.findById!.mockResolvedValue(
        sesion({
          estado: "no_cumplida",
          justificacion: {
            estado: "solicitada",
            motivo: "Salud",
            documentoUrl: null,
            comentario: null,
            solicitadaEn: null,
            revisadaEn: null,
          },
        }),
      );

      const res = await service.rechazarJustificacion(
        "ses-1",
        { comentario: "Falta sustento" },
        "u-sub",
      );
      expect(res.mensaje).toBe("La justificación fue rechazada.");
      expect(repo.resolverJustificacion).toHaveBeenCalledWith(
        "ses-1",
        "rechazada",
        "u-sub",
        "Falta sustento",
      );
    });

    it("corregirTema: procede con éxito", async () => {
      repo.findById!.mockResolvedValue(sesion({ tema: "Tema anterior" }));

      const res = await service.corregirTema("ses-1", { tema: "Tema corregido" }, docenteUsuario);
      expect(res.id).toBe("ses-1");
      expect(repo.actualizarTema).toHaveBeenCalledWith("ses-1", "Tema corregido");
    });

    it("firmarIngreso: procede con éxito", async () => {
      const res = await service.firmarIngreso("tok-kiosko", "ses-1", {
        ...credenciales,
        tema: "Tema 1",
      });
      expect(res.mensaje).toContain("Ingreso firmado");
      expect(repo.firmarIngreso).toHaveBeenCalled();
    });

    it("firmarSalida: procede con éxito", async () => {
      reloj("10:00");
      repo.findById!.mockResolvedValue(sesion({ estado: "en_curso" }));

      const res = await service.firmarSalida("tok-kiosko", "ses-1", credenciales);
      expect(res.mensaje).toContain("Salida firmada");
      expect(repo.firmarSalida).toHaveBeenCalled();
    });
  });
});
