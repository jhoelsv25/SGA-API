import { ForbiddenException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import { ConsolidadoBloqueoService, MENSAJES_CONSOLIDADO } from "@/features/seguimiento-docente";
import {
  AusenciasDocenteRepository,
  AusenciasDocenteService,
  type AnularAusenciaDto,
  type AusenciaConDetalle,
  type CorregirAusenciaDto,
  type IAusenciasDocenteRepository,
  type RegistrarAusenciaDto,
  type RegistrarDescargoDto,
  type SesionParaAusencia,
} from "@/features/ausencias-docente";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

describe("CP-RF013-06: Bloqueo de ausencias docentes por consolidado cerrado", () => {
  let service: AusenciasDocenteService;
  let repo: Mocks<IAusenciasDocenteRepository>;
  let notificaciones: Mocks<NotificacionesService>;
  let audit: Mocks<AuditService>;
  let anioCls: Mocks<AnioLectivoCls>;
  let bloqueo: Mocks<ConsolidadoBloqueoService>;

  const supervisorActorId = "user-director-uuid";
  const docentePersonaId = "per-quispe-uuid";
  const docenteActorId = "user-quispe-uuid";

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

  const ausenciaBase: AusenciaConDetalle = {
    id: "aus-1-uuid",
    ausenciaRaizId: "aus-1-uuid",
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
    registradoEn: new Date().toISOString(),
    sesion: sesionEjemplo,
    registradoPorNombre: "Director General",
    fotos: [],
  };

  const dtoRegistro: RegistrarAusenciaDto = {
    sesionClaseId: "ses-mate-5a",
    horaDesde: "08:50",
    horaHasta: "09:10",
    motivo: "desayunando",
    observacion: "En la cafetería",
  };

  const dtoCorreccion: CorregirAusenciaDto = {
    horaHasta: "09:05",
    motivoCambio: "Corrección de minutos según cámaras",
  };

  const dtoAnulacion: AnularAusenciaDto = {
    motivoAnulacion: "Se confirmó permiso previo de dirección",
  };

  const dtoDescargo: RegistrarDescargoDto = {
    descargo: "Fui a atender un asunto justificado de coordinación.",
  };

  beforeEach(() => {
    repo = {
      buscarSesionParaAusencia: jest.fn().mockResolvedValue(sesionEjemplo),
      buscarAusenciasVigentesDeSesion: jest.fn().mockResolvedValue([]),
      buscarPorId: jest.fn().mockResolvedValue(ausenciaBase),
      buscarVersionesDeRaiz: jest.fn().mockResolvedValue([ausenciaBase]),
      crearAusenciaConFotos: jest.fn().mockResolvedValue(ausenciaBase),
      crearNuevaVersion: jest.fn().mockResolvedValue({ ...ausenciaBase, version: 2 }),
      anularAusencia: jest.fn().mockResolvedValue({
        ...ausenciaBase,
        anulada: true,
        anuladaPorId: "user-director-uuid",
        anuladaEn: new Date().toISOString(),
        motivoAnulacion: "Se confirmó permiso previo de dirección",
      }),
      guardarDescargo: jest.fn().mockResolvedValue(undefined),
      listarSupervisor: jest.fn().mockResolvedValue([ausenciaBase]),
      listarPorDocente: jest.fn().mockResolvedValue([ausenciaBase]),
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

  describe("Operaciones bloqueadas cuando el consolidado está cerrado (403)", () => {
    beforeEach(() => {
      bloqueo.asegurarNoCerrado!.mockRejectedValue(
        new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO),
      );
    });

    it("registrar: lanza 403 cuando el consolidado está cerrado", async () => {
      await expect(service.registrar(dtoRegistro, undefined, supervisorActorId)).rejects.toThrow(
        new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO),
      );

      expect(repo.crearAusenciaConFotos).not.toHaveBeenCalled();
    });

    it("corregir: lanza 403 cuando el consolidado está cerrado", async () => {
      await expect(
        service.corregir("aus-1-uuid", dtoCorreccion, undefined, supervisorActorId),
      ).rejects.toThrow(new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO));

      expect(repo.crearNuevaVersion).not.toHaveBeenCalled();
    });

    it("anular: lanza 403 cuando el consolidado está cerrado", async () => {
      await expect(service.anular("aus-1-uuid", dtoAnulacion, supervisorActorId)).rejects.toThrow(
        new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO),
      );

      expect(repo.anularAusencia).not.toHaveBeenCalled();
    });

    it("presentarDescargo: lanza 403 cuando el consolidado está cerrado", async () => {
      await expect(
        service.presentarDescargo("aus-1-uuid", dtoDescargo, docentePersonaId, docenteActorId),
      ).rejects.toThrow(new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO));

      expect(repo.guardarDescargo).not.toHaveBeenCalled();
    });
  });

  describe("Operaciones permitidas cuando el consolidado está reabierto o inexistente", () => {
    beforeEach(() => {
      bloqueo.asegurarNoCerrado!.mockResolvedValue(undefined);
    });

    it("registrar: procede con éxito", async () => {
      const res = await service.registrar(dtoRegistro, undefined, supervisorActorId);

      expect(res.ausencia.id).toBe("aus-1-uuid");
      expect(repo.crearAusenciaConFotos).toHaveBeenCalled();
      expect(bloqueo.asegurarNoCerrado).toHaveBeenCalledWith(
        "doc-quispe-uuid",
        "periodo-2027-uuid",
      );
    });

    it("corregir: procede con éxito", async () => {
      const res = await service.corregir("aus-1-uuid", dtoCorreccion, undefined, supervisorActorId);

      expect(res.id).toBeDefined();
      expect(repo.crearNuevaVersion).toHaveBeenCalled();
      expect(bloqueo.asegurarNoCerrado).toHaveBeenCalledWith(
        "doc-quispe-uuid",
        "periodo-2027-uuid",
      );
    });

    it("anular: procede con éxito", async () => {
      const res = await service.anular("aus-1-uuid", dtoAnulacion, supervisorActorId);

      expect(res.anulada).toBe(true);
      expect(repo.anularAusencia).toHaveBeenCalled();
      expect(bloqueo.asegurarNoCerrado).toHaveBeenCalledWith(
        "doc-quispe-uuid",
        "periodo-2027-uuid",
      );
    });

    it("presentarDescargo: procede con éxito", async () => {
      const res = await service.presentarDescargo(
        "aus-1-uuid",
        dtoDescargo,
        docentePersonaId,
        docenteActorId,
      );

      expect(res.mensaje).toBe("Su descargo fue registrado.");
      expect(repo.guardarDescargo).toHaveBeenCalledWith("aus-1-uuid", dtoDescargo.descargo);
      expect(bloqueo.asegurarNoCerrado).toHaveBeenCalledWith(
        "doc-quispe-uuid",
        "periodo-2027-uuid",
      );
    });
  });
});
