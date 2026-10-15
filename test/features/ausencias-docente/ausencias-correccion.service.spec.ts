import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import { MENSAJES_AUSENCIA } from "@/features/ausencias-docente/constants";
import {
  AusenciasDocenteRepository,
  AusenciasDocenteService,
  type AnularAusenciaDto,
  type AusenciaConDetalle,
  type CorregirAusenciaDto,
  type HistorialAusenciaResponseDto,
  type IAusenciasDocenteRepository,
  type SesionParaAusencia,
} from "@/features/ausencias-docente";
import { ConsolidadoBloqueoService } from "@/features/seguimiento-docente";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

describe("RF-012: Corrección, anulación e historial de ausencias (HU2)", () => {
  let service: AusenciasDocenteService;
  let repo: Mocks<IAusenciasDocenteRepository>;
  let notificaciones: Mocks<NotificacionesService>;
  let audit: Mocks<AuditService>;
  let anioCls: Mocks<AnioLectivoCls>;
  let bloqueo: Mocks<ConsolidadoBloqueoService>;

  const sesionEjemplo: SesionParaAusencia = {
    id: "ses-mate-5a",
    fecha: "2027-05-13",
    horaInicio: "08:30",
    horaFin: "10:00",
    horaInicioReal: "08:28",
    horaFinReal: null,
    estado: "iniciada",
    docenteId: "doc-quispe-uuid",
    docenteNombre: "Quispe, Juan",
    docentePersonaId: "per-quispe-uuid",
    docenteUsuarioId: "user-quispe-uuid",
    cursoNombre: "Matemática",
    seccionNombre: "5.° A",
    anioAcademicoId: "anio-2027-uuid",
  };

  const ausenciaV1Original: AusenciaConDetalle = {
    id: "aus-v1-uuid",
    ausenciaRaizId: "aus-v1-uuid",
    sesionClaseId: "ses-mate-5a",
    registradoPorId: "user-subdirector-uuid",
    horaDesde: "08:50",
    horaHasta: "09:10",
    minutos: 20,
    motivo: "desayunando",
    observacion: "En la cafetería",
    descargo: null,
    descargoEn: null,
    version: 1,
    vigente: true,
    motivoCambio: null,
    anulada: false,
    anuladaPorId: null,
    anuladaEn: null,
    motivoAnulacion: null,
    registradoEn: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // hace 2 horas
    sesion: sesionEjemplo,
    fotos: [
      {
        id: "ev-1",
        ausenciaId: "aus-v1-uuid",
        archivoUrl: "/uploads/ausencias/foto1.png",
        tomadaEn: "2027-05-13T08:55:00.000Z",
        orden: 1,
        vigente: true,
      },
    ],
    registradoPorNombre: "Subdirector Académico",
  };

  const ausenciaV2Corregida: AusenciaConDetalle = {
    ...ausenciaV1Original,
    id: "aus-v2-uuid",
    horaHasta: "09:05",
    minutos: 15,
    version: 2,
    vigente: true,
    motivoCambio: "Error al anotar la hora",
    registradoEn: new Date().toISOString(),
  };

  beforeEach(() => {
    repo = {
      buscarSesionParaAusencia: jest.fn().mockResolvedValue(sesionEjemplo),
      buscarAusenciasVigentesDeSesion: jest.fn().mockResolvedValue([]),
      buscarPorId: jest.fn().mockResolvedValue(ausenciaV1Original),
      buscarVersionesDeRaiz: jest.fn().mockResolvedValue([ausenciaV1Original]),
      crearAusenciaConFotos: jest.fn().mockResolvedValue(ausenciaV1Original),
      crearNuevaVersion: jest.fn().mockResolvedValue(ausenciaV2Corregida),
      anularAusencia: jest.fn().mockResolvedValue({
        ...ausenciaV1Original,
        anulada: true,
        anuladaPorId: "user-director-uuid",
        anuladaEn: new Date().toISOString(),
        motivoAnulacion: "Se confirmó que estaba en reunión con un apoderado",
      }),
      guardarDescargo: jest.fn().mockResolvedValue(undefined),
      listarSupervisor: jest.fn().mockResolvedValue([ausenciaV1Original]),
      listarPorDocente: jest.fn().mockResolvedValue([ausenciaV1Original]),
      docentePorPersonaId: jest.fn().mockResolvedValue({ id: "doc-quispe-uuid" }),
      usuarioPorPersonaId: jest.fn().mockResolvedValue({ id: "user-quispe-uuid" }),
      bimestreEstaBloqueado: jest.fn().mockResolvedValue(false),
      obtenerVariableSistema: jest.fn().mockResolvedValue("24"),
      buscarPeriodoIdPorFecha: jest.fn().mockResolvedValue("periodo-2027-uuid"),
    };

    notificaciones = {
      enviar: jest.fn().mockResolvedValue(undefined),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    anioCls = {
      id: jest.fn().mockReturnValue("anio-2027-uuid"),
    };

    bloqueo = {
      asegurarNoCerrado: jest.fn().mockResolvedValue(undefined),
      asegurarNoCerradoPorFecha: jest.fn().mockResolvedValue(undefined),
    };

    service = new AusenciasDocenteService(
      repo as unknown as AusenciasDocenteRepository,
      notificaciones as unknown as NotificacionesService,
      audit as unknown as AuditService,
      anioCls as unknown as AnioLectivoCls,
      bloqueo as unknown as ConsolidadoBloqueoService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("CP-RF012-10: Corregir dentro del plazo", () => {
    it("debe crear la versión 2 vigente con 15 minutos, dejar versión 1 con vigente=false y auditar", async () => {
      // Dado que registré una ausencia hace 2 horas y el docente no presentó descargo
      const dto: CorregirAusenciaDto = {
        horaHasta: "09:05",
        motivoCambio: "Error al anotar la hora",
      };
      const actorId = "user-subdirector-uuid";

      // Cuando cambio la hora final de 09:10 a 09:05, indico el motivo y guardo
      const resultado = await service.corregir(
        "aus-v1-uuid",
        dto,
        undefined,
        actorId,
        "192.168.1.10",
      );

      // Entonces el sistema crea la versión 2 vigente con 15 minutos
      expect(resultado.version).toBe(2);
      expect(resultado.minutos).toBe(15);
      expect(resultado.vigente).toBe(true);
      expect(resultado.motivoCambio).toBe("Error al anotar la hora");

      // Y persiste la nueva versión a través del repositorio
      expect(repo.crearNuevaVersion).toHaveBeenCalledWith(
        "aus-v1-uuid",
        expect.objectContaining({
          horaHasta: "09:05",
          motivoCambio: "Error al anotar la hora",
          registradoPorId: actorId,
          version: 2,
        }),
        expect.anything(),
        expect.anything(),
      );

      // Y audita la mutación
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: actorId,
          accion: "actualizar",
          tabla: "ausencias_sesion",
        }),
      );
    });

    it("debe lanzar NotFoundException si la ausencia a corregir no existe", async () => {
      // Dado que la ausencia no existe en el repositorio
      repo.buscarPorId = jest.fn().mockResolvedValue(null);
      const dto: CorregirAusenciaDto = {
        motivoCambio: "Corrección",
      };

      // Cuando intento corregirla
      // Entonces debe lanzar NotFoundException
      await expect(
        service.corregir("aus-inexistente", dto, undefined, "user-subdirector-uuid"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("CP-RF012-11: Corrección sin motivo del cambio", () => {
    it("debe rechazar con BadRequestException si no se indica el motivo del cambio", async () => {
      // Dado que estoy corrigiendo una ausencia dentro del plazo
      const dtoSinMotivo: CorregirAusenciaDto = {
        horaHasta: "09:05",
        motivoCambio: "",
      };

      // Cuando guardo sin indicar el motivo del cambio
      // Entonces el sistema impide guardar y muestra el mensaje exacto
      await expect(
        service.corregir("aus-v1-uuid", dtoSinMotivo, undefined, "user-subdirector-uuid"),
      ).rejects.toThrow(new BadRequestException(MENSAJES_AUSENCIA.CORRECCION_SIN_MOTIVO));

      // Y también si son solo espacios en blanco
      const dtoEspacios: CorregirAusenciaDto = {
        horaHasta: "09:05",
        motivoCambio: "    ",
      };
      await expect(
        service.corregir("aus-v1-uuid", dtoEspacios, undefined, "user-subdirector-uuid"),
      ).rejects.toThrow(new BadRequestException(MENSAJES_AUSENCIA.CORRECCION_SIN_MOTIVO));
    });
  });

  describe("CP-RF012-12: Ver el historial de una ausencia", () => {
    it("debe listar las versiones ordenadas de más reciente a más antigua marcando la versión vigente", async () => {
      // Dado que una ausencia fue corregida dos veces (3 versiones v3, v2, v1)
      const v3: AusenciaConDetalle = {
        ...ausenciaV1Original,
        id: "aus-v3-uuid",
        version: 3,
        vigente: true,
        minutos: 15,
        motivoCambio: "Ajuste final",
      };
      const v2: AusenciaConDetalle = {
        ...ausenciaV1Original,
        id: "aus-v2-uuid",
        version: 2,
        vigente: false,
        minutos: 18,
        motivoCambio: "Primera corrección",
      };
      const v1: AusenciaConDetalle = {
        ...ausenciaV1Original,
        id: "aus-v1-uuid",
        version: 1,
        vigente: false,
        minutos: 20,
        motivoCambio: null,
      };

      repo.buscarVersionesDeRaiz = jest.fn().mockResolvedValue([v3, v2, v1]);

      // Cuando el Director abre "Historial" en esa ausencia
      const historial: HistorialAusenciaResponseDto = await service.obtenerHistorial("aus-v1-uuid");

      // Entonces el sistema muestra las 3 versiones de la más reciente a la más antigua
      expect(historial.versiones).toHaveLength(3);
      expect(historial.versiones[0].version).toBe(3);
      expect(historial.versiones[0].vigente).toBe(true);
      expect(historial.versiones[1].version).toBe(2);
      expect(historial.versiones[1].vigente).toBe(false);
      expect(historial.versiones[2].version).toBe(1);
      expect(historial.versiones[2].vigente).toBe(false);
    });
  });

  describe("CP-RF012-14: Corregir fuera del plazo", () => {
    it("debe rechazar con BadRequestException si transcurrieron más de 24 horas desde el registro", async () => {
      // Dado que la ausencia se registró hace 2 días (48 horas)
      const ausenciaAntigua: AusenciaConDetalle = {
        ...ausenciaV1Original,
        registradoEn: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      };
      repo.buscarPorId = jest.fn().mockResolvedValue(ausenciaAntigua);

      const dto: CorregirAusenciaDto = {
        horaHasta: "09:05",
        motivoCambio: "Intento tardío",
      };

      // Cuando intento corregirla
      // Entonces el sistema bloquea la acción y muestra el mensaje exacto
      await expect(
        service.corregir("aus-v1-uuid", dto, undefined, "user-subdirector-uuid"),
      ).rejects.toThrow(new BadRequestException(MENSAJES_AUSENCIA.CORRECCION_FUERA_DE_PLAZO));
    });

    it("debe rechazar con BadRequestException si el docente ya presentó su descargo aunque esté dentro de 24 horas", async () => {
      // Dado que el docente ya presentó descargo
      const ausenciaConDescargo: AusenciaConDetalle = {
        ...ausenciaV1Original,
        descargo: "Estaba recogiendo copias en dirección",
        descargoEn: new Date().toISOString(),
      };
      repo.buscarPorId = jest.fn().mockResolvedValue(ausenciaConDescargo);

      const dto: CorregirAusenciaDto = {
        horaHasta: "09:05",
        motivoCambio: "Intento con descargo existente",
      };

      // Cuando intento corregirla
      // Entonces el sistema bloquea la acción y muestra el mensaje exacto
      await expect(
        service.corregir("aus-v1-uuid", dto, undefined, "user-subdirector-uuid"),
      ).rejects.toThrow(new BadRequestException(MENSAJES_AUSENCIA.CORRECCION_FUERA_DE_PLAZO));
    });
  });

  describe("CP-RF012-15: Corregir la ausencia de otro supervisor", () => {
    it("debe rechazar con ForbiddenException si un supervisor intenta corregir la ausencia registrada por otro", async () => {
      // Dado que la ausencia la registró el Subdirector (user-subdirector-uuid)
      repo.buscarPorId = jest.fn().mockResolvedValue(ausenciaV1Original);
      const dto: CorregirAusenciaDto = {
        horaHasta: "09:05",
        motivoCambio: "Director intentando corregir",
      };

      // Cuando el Director (user-director-uuid) intenta corregirla
      // Entonces el sistema bloquea la acción con ForbiddenException
      await expect(
        service.corregir("aus-v1-uuid", dto, undefined, "user-director-uuid"),
      ).rejects.toThrow(
        new ForbiddenException("Solo quien registró la ausencia puede corregirla."),
      );
    });
  });

  describe("CP-RF012-16: Anular una ausencia", () => {
    it("debe marcar la ausencia como anulada, registrar quién y cuándo y auditar la acción", async () => {
      // Dado que una ausencia ya no se puede corregir y se procede a anular
      const dto: AnularAusenciaDto = {
        motivoAnulacion: "Se confirmó que estaba en reunión con un apoderado",
      };
      const actorDirectorId = "user-director-uuid";

      // Cuando la anulo con el motivo indicado
      const resultado = await service.anular("aus-v1-uuid", dto, actorDirectorId, "192.168.1.15");

      // Entonces la ausencia queda marcada como Anulada
      expect(resultado.anulada).toBe(true);
      expect(resultado.motivoAnulacion).toBe("Se confirmó que estaba en reunión con un apoderado");

      // Y se persiste la anulación en el repositorio
      expect(repo.anularAusencia).toHaveBeenCalledWith(
        "aus-v1-uuid",
        actorDirectorId,
        "Se confirmó que estaba en reunión con un apoderado",
      );

      // Y audita la acción
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: actorDirectorId,
          accion: "actualizar",
          tabla: "ausencias_sesion",
        }),
      );
    });

    it("debe lanzar NotFoundException si la ausencia a anular no existe", async () => {
      // Dado que la ausencia no existe
      repo.buscarPorId = jest.fn().mockResolvedValue(null);
      const dto: AnularAusenciaDto = {
        motivoAnulacion: "Motivo cualquiera",
      };

      // Cuando intento anularla
      // Entonces debe rechazar con NotFoundException
      await expect(service.anular("aus-inexistente", dto, "user-director-uuid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("CP-RF012-17: Anular sin motivo", () => {
    it("debe rechazar con BadRequestException si no se indica el motivo de la anulación", async () => {
      // Dado que estoy anulando una ausencia
      const dtoVacio: AnularAusenciaDto = {
        motivoAnulacion: "",
      };

      // Cuando confirmo sin motivo
      // Entonces el sistema impide la acción y muestra el mensaje exacto
      await expect(service.anular("aus-v1-uuid", dtoVacio, "user-director-uuid")).rejects.toThrow(
        new BadRequestException(MENSAJES_AUSENCIA.ANULACION_SIN_MOTIVO),
      );

      // Y también si son solo espacios en blanco
      const dtoEspacios: AnularAusenciaDto = {
        motivoAnulacion: "    ",
      };
      await expect(
        service.anular("aus-v1-uuid", dtoEspacios, "user-director-uuid"),
      ).rejects.toThrow(new BadRequestException(MENSAJES_AUSENCIA.ANULACION_SIN_MOTIVO));
    });
  });

  describe("CP-RF012-18: Bimestre cerrado o consolidado", () => {
    it("debe bloquear la corrección con ForbiddenException si el bimestre está cerrado o consolidado", async () => {
      // Dado que el bimestre de la ausencia ya se cerró o consolidó
      repo.bimestreEstaBloqueado = jest.fn().mockResolvedValue(true);
      const dtoCorregir: CorregirAusenciaDto = {
        horaHasta: "09:05",
        motivoCambio: "Ajuste de hora",
      };

      // Cuando intento corregir una ausencia de ese bimestre
      // Entonces el sistema bloquea la acción con el mensaje exacto
      await expect(
        service.corregir("aus-v1-uuid", dtoCorregir, undefined, "user-subdirector-uuid"),
      ).rejects.toThrow(new ForbiddenException(MENSAJES_AUSENCIA.BIMESTRE_CERRADO));
    });

    it("debe bloquear la anulación con ForbiddenException si el bimestre está cerrado o consolidado", async () => {
      // Dado que el bimestre de la ausencia ya se cerró o consolidó
      repo.bimestreEstaBloqueado = jest.fn().mockResolvedValue(true);
      const dtoAnular: AnularAusenciaDto = {
        motivoAnulacion: "Se anula sesión",
      };

      // Cuando intento anular una ausencia de ese bimestre
      // Entonces el sistema bloquea la acción con el mensaje exacto
      await expect(service.anular("aus-v1-uuid", dtoAnular, "user-director-uuid")).rejects.toThrow(
        new ForbiddenException(MENSAJES_AUSENCIA.BIMESTRE_CERRADO),
      );
    });
  });
});
