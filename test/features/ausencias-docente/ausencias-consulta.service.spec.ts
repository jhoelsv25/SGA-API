import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import { MENSAJES_AUSENCIA } from "@/features/ausencias-docente/constants";
import {
  AusenciasDocenteRepository,
  AusenciasDocenteService,
  type AusenciaConDetalle,
  type AusenciaResponseDto,
  type FiltroAusenciasQueryDto,
  type IAusenciasDocenteRepository,
  type RegistrarDescargoDto,
  type ResumenAusenciasSupervisorResponseDto,
  type SesionParaAusencia,
} from "@/features/ausencias-docente";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

describe("RF-012: Consultas, privacidad y descargo docente (HU3 y HU4)", () => {
  let service: AusenciasDocenteService;
  let repo: Mocks<IAusenciasDocenteRepository>;
  let notificaciones: Mocks<NotificacionesService>;
  let audit: Mocks<AuditService>;
  let anioCls: Mocks<AnioLectivoCls>;

  const sesionDocenteQuispe: SesionParaAusencia = {
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

  const sesionOtroDocente: SesionParaAusencia = {
    id: "ses-com-5b",
    fecha: "2027-05-13",
    horaInicio: "10:30",
    horaFin: "12:00",
    horaInicioReal: "10:28",
    horaFinReal: null,
    estado: "iniciada",
    docenteId: "doc-otro-uuid",
    docenteNombre: "Alvarez, Pedro",
    docentePersonaId: "per-docente-otro-uuid",
    docenteUsuarioId: "user-otro-uuid",
    cursoNombre: "Comunicación",
    seccionNombre: "5.° B",
    anioAcademicoId: "anio-2027-uuid",
  };

  const ausenciaVigenteDocenteQuispe: AusenciaConDetalle = {
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
    sesion: sesionDocenteQuispe,
    fotos: [
      {
        id: "ev-1",
        ausenciaId: "aus-quispe-v1",
        archivoUrl: "/uploads/ausencias/foto1.png",
        tomadaEn: "2027-05-13T08:55:00.000Z",
        orden: 1,
        vigente: true,
      },
    ],
    registradoPorNombre: "Director General",
  };

  const ausenciaOtroDocente: AusenciaConDetalle = {
    id: "aus-otro-v1",
    ausenciaRaizId: "aus-otro-v1",
    sesionClaseId: "ses-com-5b",
    registradoPorId: "user-director-uuid",
    horaDesde: "10:40",
    horaHasta: "11:00",
    minutos: 20,
    motivo: "fuera_del_aula",
    observacion: null,
    descargo: null,
    descargoEn: null,
    version: 1,
    vigente: true,
    motivoCambio: null,
    anulada: false,
    anuladaPorId: null,
    anuladaEn: null,
    motivoAnulacion: null,
    registradoEn: "2027-05-13T11:05:00.000Z",
    sesion: sesionOtroDocente,
    fotos: [],
    registradoPorNombre: "Director General",
  };

  beforeEach(() => {
    repo = {
      buscarSesionParaAusencia: jest.fn().mockResolvedValue(sesionDocenteQuispe),
      buscarAusenciasVigentesDeSesion: jest.fn().mockResolvedValue([]),
      buscarPorId: jest.fn().mockImplementation((id: string) => {
        if (id === "aus-quispe-v1") return Promise.resolve(ausenciaVigenteDocenteQuispe);
        if (id === "aus-otro-v1") return Promise.resolve(ausenciaOtroDocente);
        return Promise.resolve(null);
      }),
      buscarVersionesDeRaiz: jest.fn().mockResolvedValue([ausenciaVigenteDocenteQuispe]),
      crearAusenciaConFotos: jest.fn().mockResolvedValue(ausenciaVigenteDocenteQuispe),
      crearNuevaVersion: jest.fn().mockResolvedValue(ausenciaVigenteDocenteQuispe),
      anularAusencia: jest.fn().mockResolvedValue(ausenciaVigenteDocenteQuispe),
      guardarDescargo: jest.fn().mockResolvedValue(undefined),
      listarSupervisor: jest.fn().mockResolvedValue([ausenciaVigenteDocenteQuispe]),
      listarPorDocente: jest.fn().mockResolvedValue([ausenciaVigenteDocenteQuispe]),
      docentePorPersonaId: jest.fn().mockImplementation((personaId: string) => {
        if (personaId === "per-docente-quispe-uuid") return Promise.resolve({ id: "doc-quispe-uuid" });
        if (personaId === "per-docente-otro-uuid") return Promise.resolve({ id: "doc-otro-uuid" });
        return Promise.resolve(null);
      }),
      usuarioPorPersonaId: jest.fn().mockResolvedValue({ id: "user-quispe-uuid" }),
      bimestreEstaBloqueado: jest.fn().mockResolvedValue(false),
      obtenerVariableSistema: jest.fn().mockImplementation((codigo: string) => {
        if (codigo === "ausencia.plazo_descargo_dias") return Promise.resolve("7");
        if (codigo === "ausencia.plazo_correccion_horas") return Promise.resolve("24");
        return Promise.resolve(null);
      }),
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

  describe("CP-RF012-13: El docente solo ve la versión vigente", () => {
    it("debe retornar únicamente versiones con vigente=true y excluir versiones obsoletas", async () => {
      // Dado que una ausencia tiene una versión obsoleta (v1 con vigente=false) y una vigente (v2 con vigente=true)
      const versionVigente: AusenciaConDetalle = {
        ...ausenciaVigenteDocenteQuispe,
        id: "aus-quispe-v2",
        version: 2,
        vigente: true,
      };

      repo.listarPorDocente = jest.fn().mockResolvedValue([versionVigente]);

      // Cuando el docente consulta "Mis ausencias"
      const resultado: AusenciaResponseDto[] = await service.misAusencias("per-docente-quispe-uuid");

      // Entonces el sistema muestra solo la versión vigente
      expect(resultado).toHaveLength(1);
      expect(resultado[0].version).toBe(2);
      expect(resultado[0].vigente).toBe(true);
      expect(resultado.some((a) => !a.vigente)).toBe(false);
    });
  });

  describe("CP-RF012-19: Ver mis ausencias", () => {
    it("debe mostrar sesión, tramo, minutos, motivo, fotos y fecha límite formateada para descargo", async () => {
      // Dado que me registraron una ausencia con fecha de registro 2027-05-13
      // Cuando abro "Mis ausencias" o el detalle de la ausencia
      const resultado: AusenciaResponseDto = await service.obtenerDetalleDocente(
        "aus-quispe-v1",
        "per-docente-quispe-uuid",
      );

      // Entonces el sistema muestra sesión, tramo, minutos, motivo, fotos y fecha límite formateada
      expect(resultado.sesion.cursoNombre).toBe("Matemática");
      expect(resultado.sesion.seccionNombre).toBe("5.° A");
      expect(resultado.horaDesde).toBe("08:50");
      expect(resultado.horaHasta).toBe("09:10");
      expect(resultado.minutos).toBe(20);
      expect(resultado.motivo).toBe("desayunando");
      expect(resultado.observacion).toBe("En la cafetería");
      expect(resultado.fotos).toHaveLength(1);
      expect(resultado.puedeDescargar).toBe(true);
      expect(resultado.fechaLimiteDescargoFormateada).toBe("20/05/2027");
    });
  });

  describe("CP-RF012-20: Presentar el descargo", () => {
    it("debe guardar el descargo con la fecha y auditar la actualización dentro del plazo", async () => {
      // Dado que la ausencia se registró hace 3 días (13 de mayo) y hoy es 16 de mayo
      jest.useFakeTimers({ now: new Date("2027-05-16T10:00:00-05:00") });

      const dto: RegistrarDescargoDto = {
        descargo: "Fui a la dirección a recoger material para la clase",
      };
      const actorUsuarioDocenteId = "user-quispe-uuid";

      // Cuando escribo el descargo y lo envío
      const respuesta = await service.presentarDescargo(
        "aus-quispe-v1",
        dto,
        "per-docente-quispe-uuid",
        actorUsuarioDocenteId,
        "192.168.1.33",
      );

      // Entonces el sistema guarda el descargo con la fecha y muestra el mensaje exacto
      expect(respuesta.mensaje).toBe(MENSAJES_AUSENCIA.DESCARGO_ENVIADO);
      expect(repo.guardarDescargo).toHaveBeenCalledWith(
        "aus-quispe-v1",
        "Fui a la dirección a recoger material para la clase",
      );

      // Y audita la mutación
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: actorUsuarioDocenteId,
          accion: "actualizar",
          tabla: "ausencias_sesion",
        }),
      );
    });
  });

  describe("CP-RF012-21: Descargo fuera de plazo", () => {
    it("debe rechazar con BadRequestException si el plazo de 7 días ya venció al intentar presentar el descargo", async () => {
      // Dado que la ausencia se registró el 13/05/2027 (venció el 20/05/2027)
      // Y hoy es 21/05/2027
      jest.useFakeTimers({ now: new Date("2027-05-21T10:00:00-05:00") });

      const dto: RegistrarDescargoDto = {
        descargo: "Descargo tardío",
      };

      // Cuando intento presentar el descargo el 21/05/2027
      // Entonces el sistema bloquea el envío y muestra el mensaje con la fecha de vencimiento exacta
      await expect(
        service.presentarDescargo("aus-quispe-v1", dto, "per-docente-quispe-uuid", "user-quispe-uuid"),
      ).rejects.toThrow(new BadRequestException(MENSAJES_AUSENCIA.DESCARGO_FUERA_DE_PLAZO("20/05/2027")));
    });
  });

  describe("CP-RF012-22: Descargo repetido", () => {
    it("debe rechazar con BadRequestException si el docente ya había registrado un descargo previamente", async () => {
      // Dado que ya presenté mi descargo para esa ausencia
      const ausenciaYaDescargada: AusenciaConDetalle = {
        ...ausenciaVigenteDocenteQuispe,
        descargo: "Fui a la dirección a recoger material",
        descargoEn: "2027-05-15T10:00:00.000Z",
      };
      repo.buscarPorId = jest.fn().mockResolvedValue(ausenciaYaDescargada);

      const dtoSegundoDescargo: RegistrarDescargoDto = {
        descargo: "Intento enviar otro descargo",
      };

      // Cuando intento enviar otro
      // Entonces el sistema bloquea el envío con el mensaje exacto
      await expect(
        service.presentarDescargo("aus-quispe-v1", dtoSegundoDescargo, "per-docente-quispe-uuid", "user-quispe-uuid"),
      ).rejects.toThrow(new BadRequestException(MENSAJES_AUSENCIA.DESCARGO_REPETIDO));
    });
  });

  describe("CP-RF012-23: Ausencias de otro docente", () => {
    it("debe rechazar con ForbiddenException si un docente intenta ver el detalle de una ausencia de otro docente", async () => {
      // Dado que soy el Docente Quispe (per-docente-quispe-uuid)
      // Cuando intento ver el detalle de una ausencia del Docente Alvarez (aus-otro-v1)
      // Entonces el sistema rechaza el acceso con ForbiddenException
      await expect(
        service.obtenerDetalleDocente("aus-otro-v1", "per-docente-quispe-uuid"),
      ).rejects.toThrow(new ForbiddenException("No tiene acceso a las ausencias de otro docente."));
    });

    it("debe rechazar con ForbiddenException si un docente intenta presentar descargo para la ausencia de otro docente", async () => {
      // Dado que soy el Docente Quispe
      const dto: RegistrarDescargoDto = {
        descargo: "Descargo indebido en ausencia ajena",
      };

      // Cuando intento presentar descargo en la ausencia del Docente Alvarez
      // Entonces el sistema rechaza el acceso
      await expect(
        service.presentarDescargo("aus-otro-v1", dto, "per-docente-quispe-uuid", "user-quispe-uuid"),
      ).rejects.toThrow(new ForbiddenException("No tiene acceso a las ausencias de otro docente."));
    });
  });

  describe("CP-RF012-24: Listado de ausencias", () => {
    it("debe listar ausencias con filtros y calcular el total de minutos sin contar las anuladas", async () => {
      // Dado que estoy en "Ausencias docentes" y existen ausencias vigentes y anuladas
      const ausencia1Vigente: AusenciaConDetalle = {
        ...ausenciaVigenteDocenteQuispe,
        id: "aus-1",
        minutos: 20,
        anulada: false,
      };
      const ausencia2Vigente: AusenciaConDetalle = {
        ...ausenciaVigenteDocenteQuispe,
        id: "aus-2",
        minutos: 15,
        anulada: false,
      };
      const ausencia3Anulada: AusenciaConDetalle = {
        ...ausenciaVigenteDocenteQuispe,
        id: "aus-3",
        minutos: 30,
        anulada: true,
        anuladaPorId: "user-director-uuid",
        anuladaEn: "2027-05-14T10:00:00.000Z",
        motivoAnulacion: "Error de digitación",
      };

      repo.listarSupervisor = jest.fn().mockResolvedValue([ausencia1Vigente, ausencia2Vigente, ausencia3Anulada]);

      const filtro: FiltroAusenciasQueryDto = {
        periodoId: "per-bimestre-2",
        docenteId: "doc-quispe-uuid",
      };

      // Cuando filtro por el bimestre II y el docente Quispe
      const resultado: ResumenAusenciasSupervisorResponseDto = await service.listarSupervisor(filtro);

      // Entonces el sistema lista cada ausencia con indicadores
      expect(resultado.data).toHaveLength(3);
      expect(resultado.totalAusencias).toBe(3);
      expect(resultado.totalAnuladas).toBe(1);

      // Y muestra el total de minutos SIN CONTAR las anuladas (20 + 15 = 35 minutos, excluye 30)
      expect(resultado.totalMinutos).toBe(35);
    });
  });
});
