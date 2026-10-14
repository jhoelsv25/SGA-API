import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "../../../src/features/notificaciones/notificaciones.service";
import { MENSAJES_AUSENCIA } from "@/features/ausencias-docente/constants";
import {
  AusenciasDocenteRepository,
  AusenciasDocenteService,
  type AusenciaConDetalle,
  type IAusenciasDocenteRepository,
  type RegistrarDescargoDto,
  type SesionParaAusencia,
} from "@/features/ausencias-docente";
import {
  MENSAJE_DESCARGO_AUSENCIA_ANULADA,
  MENSAJE_DESCARGO_AUSENCIA_NO_VIGENTE,
} from "../../../src/features/ausencias-docente/ausencias-consulta.service";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

describe("RF-012: Pruebas adicionales de defensa para AusenciasConsultaService (T05)", () => {
  let service: AusenciasDocenteService;
  let repo: Mocks<IAusenciasDocenteRepository>;
  let notificaciones: Mocks<NotificacionesService>;
  let audit: Mocks<AuditService>;
  let anioCls: Mocks<AnioLectivoCls>;

  const sesionDocente: SesionParaAusencia = {
    id: "ses-mate-5a",
    fecha: "2027-05-13",
    horaInicio: "08:30",
    horaFin: "10:00",
    horaInicioReal: "08:28",
    horaFinReal: null,
    estado: "iniciada",
    docenteId: "doc-quispe-uuid",
    docenteNombre: "Quispe, Juan",
    docentePersonaId: "per-docente-quispe-uuid",
    docenteUsuarioId: "user-quispe-uuid",
    cursoNombre: "Matemática",
    seccionNombre: "5.° A",
    anioAcademicoId: "anio-2027-uuid",
  };

  const ausenciaVigente: AusenciaConDetalle = {
    id: "aus-quispe-v1",
    ausenciaRaizId: "aus-quispe-v1",
    sesionClaseId: "ses-mate-5a",
    registradoPorId: "user-director-uuid",
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
    registradoEn: "2027-05-13T09:15:00.000Z",
    sesion: sesionDocente,
    fotos: [],
    registradoPorNombre: "Director General",
  };

  beforeEach(() => {
    repo = {
      buscarSesionParaAusencia: jest.fn().mockResolvedValue(sesionDocente),
      buscarAusenciasVigentesDeSesion: jest.fn().mockResolvedValue([]),
      buscarPorId: jest.fn().mockResolvedValue(ausenciaVigente),
      buscarVersionesDeRaiz: jest.fn().mockResolvedValue([ausenciaVigente]),
      crearAusenciaConFotos: jest.fn().mockResolvedValue(ausenciaVigente),
      crearNuevaVersion: jest.fn().mockResolvedValue(ausenciaVigente),
      anularAusencia: jest.fn().mockResolvedValue(ausenciaVigente),
      guardarDescargo: jest.fn().mockResolvedValue(undefined),
      listarSupervisor: jest.fn().mockResolvedValue([ausenciaVigente]),
      listarPorDocente: jest.fn().mockResolvedValue([ausenciaVigente]),
      docentePorPersonaId: jest.fn().mockResolvedValue({ id: "doc-quispe-uuid" }),
      usuarioPorPersonaId: jest.fn().mockResolvedValue({ id: "user-quispe-uuid" }),
      bimestreEstaBloqueado: jest.fn().mockResolvedValue(false),
      obtenerVariableSistema: jest.fn().mockResolvedValue(null),
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

    service = new AusenciasDocenteService(
      repo as unknown as AusenciasDocenteRepository,
      notificaciones as unknown as NotificacionesService,
      audit as unknown as AuditService,
      anioCls as unknown as AnioLectivoCls,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("Defensa: persona sin registro de docente asociado", () => {
    it("misAusencias debe lanzar ForbiddenException si no existe registro de docente", async () => {
      repo.docentePorPersonaId = jest.fn().mockResolvedValue(null);

      await expect(service.misAusencias("per-no-docente-uuid")).rejects.toThrow(
        new ForbiddenException("El usuario no tiene un registro de docente asociado."),
      );
    });

    it("obtenerDetalleDocente debe lanzar ForbiddenException si no existe registro de docente", async () => {
      repo.docentePorPersonaId = jest.fn().mockResolvedValue(null);

      await expect(
        service.obtenerDetalleDocente("aus-quispe-v1", "per-no-docente-uuid"),
      ).rejects.toThrow(
        new ForbiddenException("El usuario no tiene un registro de docente asociado."),
      );
    });

    it("presentarDescargo debe lanzar ForbiddenException si no existe registro de docente", async () => {
      repo.docentePorPersonaId = jest.fn().mockResolvedValue(null);

      const dto: RegistrarDescargoDto = { descargo: "Texto descargo" };

      await expect(
        service.presentarDescargo("aus-quispe-v1", dto, "per-no-docente-uuid", "user-uuid"),
      ).rejects.toThrow(
        new ForbiddenException("El usuario no tiene un registro de docente asociado."),
      );
    });
  });

  describe("Defensa: ausencia inexistente o no vigente en detalle docente", () => {
    it("obtenerDetalleDocente debe lanzar NotFoundException si no existe la ausencia", async () => {
      repo.buscarPorId = jest.fn().mockResolvedValue(null);

      await expect(
        service.obtenerDetalleDocente("aus-inexistente-uuid", "per-docente-quispe-uuid"),
      ).rejects.toThrow(new NotFoundException("Ausencia no encontrada."));
    });

    it("obtenerDetalleDocente debe lanzar NotFoundException si la ausencia no es vigente", async () => {
      repo.buscarPorId = jest.fn().mockResolvedValue({
        ...ausenciaVigente,
        vigente: false,
      });

      await expect(
        service.obtenerDetalleDocente("aus-quispe-v1", "per-docente-quispe-uuid"),
      ).rejects.toThrow(new NotFoundException("Ausencia no encontrada."));
    });
  });

  describe("Reparación T05 (VAL-3): Rechazo de descargo en ausencia anulada o no vigente", () => {
    it("presentarDescargo debe rechazar con BadRequestException si la ausencia está anulada", async () => {
      repo.buscarPorId = jest.fn().mockResolvedValue({
        ...ausenciaVigente,
        anulada: true,
      });

      const dto: RegistrarDescargoDto = { descargo: "Intento descargo en ausencia anulada" };

      await expect(
        service.presentarDescargo(
          "aus-quispe-v1",
          dto,
          "per-docente-quispe-uuid",
          "user-quispe-uuid",
        ),
      ).rejects.toThrow(new BadRequestException(MENSAJE_DESCARGO_AUSENCIA_ANULADA));
    });

    it("presentarDescargo debe rechazar con BadRequestException si la versión no es vigente", async () => {
      repo.buscarPorId = jest.fn().mockResolvedValue({
        ...ausenciaVigente,
        vigente: false,
      });

      const dto: RegistrarDescargoDto = { descargo: "Intento descargo en versión obsoleta" };

      await expect(
        service.presentarDescargo(
          "aus-quispe-v1",
          dto,
          "per-docente-quispe-uuid",
          "user-quispe-uuid",
        ),
      ).rejects.toThrow(new BadRequestException(MENSAJE_DESCARGO_AUSENCIA_NO_VIGENTE));
    });
  });

  describe("Defensa: CP-RF012-18 Bimestre cerrado o consolidado en descargo", () => {
    it("presentarDescargo debe lanzar ForbiddenException si el bimestre está cerrado", async () => {
      repo.bimestreEstaBloqueado = jest.fn().mockResolvedValue(true);

      const dto: RegistrarDescargoDto = { descargo: "Descargo en bimestre cerrado" };

      await expect(
        service.presentarDescargo(
          "aus-quispe-v1",
          dto,
          "per-docente-quispe-uuid",
          "user-quispe-uuid",
        ),
      ).rejects.toThrow(new ForbiddenException(MENSAJES_AUSENCIA.BIMESTRE_CERRADO));
    });
  });

  describe("Defensa: descargo con texto vacío o solo espacios", () => {
    it("presentarDescargo debe rechazar con BadRequestException si descargo está vacío", async () => {
      const dto: RegistrarDescargoDto = { descargo: "    " };

      await expect(
        service.presentarDescargo(
          "aus-quispe-v1",
          dto,
          "per-docente-quispe-uuid",
          "user-quispe-uuid",
        ),
      ).rejects.toThrow(new BadRequestException("El texto del descargo es obligatorio."));
    });
  });
});
