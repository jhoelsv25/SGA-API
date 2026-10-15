import * as fs from "node:fs";
import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import { MENSAJES_AUSENCIA } from "@/features/ausencias-docente/constants";
import {
  AusenciasDocenteRepository,
  AusenciasDocenteService,
  type AusenciaConDetalle,
  type IAusenciasDocenteRepository,
  type RegistrarAusenciaDto,
  type SesionParaAusencia,
} from "@/features/ausencias-docente";
import { ConsolidadoBloqueoService } from "@/features/seguimiento-docente";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

describe("AusenciasDocente - Pruebas defensivas del registro de ausencias", () => {
  let service: AusenciasDocenteService;
  let repo: Mocks<IAusenciasDocenteRepository>;
  let notificaciones: Mocks<NotificacionesService>;
  let audit: Mocks<AuditService>;
  let anioCls: Mocks<AnioLectivoCls>;
  let bloqueo: Mocks<ConsolidadoBloqueoService>;

  const sesionBase: SesionParaAusencia = {
    id: "ses-101",
    fecha: "2027-05-13",
    horaInicio: "08:30",
    horaFin: "10:00",
    horaInicioReal: "08:28",
    horaFinReal: null,
    estado: "iniciada",
    docenteId: "doc-uuid",
    docenteNombre: "Perez, Juan",
    docentePersonaId: "per-uuid",
    docenteUsuarioId: "usr-uuid",
    cursoNombre: "Historia",
    seccionNombre: "4.° B",
    anioAcademicoId: "anio-2027-uuid",
  };

  const ausenciaMock: AusenciaConDetalle = {
    id: "aus-101",
    ausenciaRaizId: "aus-101",
    sesionClaseId: "ses-101",
    registradoPorId: "usr-director",
    horaDesde: "08:50",
    horaHasta: "09:10",
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
    registradoEn: "2027-05-13T09:15:00.000Z",
    sesion: sesionBase,
    fotos: [],
    registradoPorNombre: "Director de Prueba",
  };

  function crearArchivo(
    originalname: string,
    mimetype: string,
    bufferContenido = Buffer.alloc(10),
  ): Express.Multer.File {
    return {
      fieldname: "fotos",
      originalname,
      encoding: "7bit",
      mimetype,
      size: bufferContenido.length,
      buffer: bufferContenido,
      destination: "",
      filename: originalname,
      path: "",
      stream: {} as Express.Multer.File["stream"],
    };
  }

  beforeEach(() => {
    repo = {
      buscarSesionParaAusencia: jest.fn().mockResolvedValue(sesionBase),
      buscarAusenciasVigentesDeSesion: jest.fn().mockResolvedValue([]),
      buscarPorId: jest.fn().mockResolvedValue(ausenciaMock),
      crearAusenciaConFotos: jest.fn().mockResolvedValue(ausenciaMock),
      bimestreEstaBloqueado: jest.fn().mockResolvedValue(false),
      obtenerVariableSistema: jest.fn().mockResolvedValue(null),
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
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe("Derivación de extensión exclusivamente por mimetype", () => {
    it("debe guardar la extensión .png ignorando un originalname malicioso con extensión .html", async () => {
      const dto: RegistrarAusenciaDto = {
        sesionClaseId: "ses-101",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "fuera_del_aula",
      };
      const fotoMaliciosa = [crearArchivo("script_peligroso.html", "image/png")];

      await service.registrar(dto, fotoMaliciosa, "usr-director");

      expect(repo.crearAusenciaConFotos).toHaveBeenCalled();
      const llamadasMock = (repo.crearAusenciaConFotos as jest.Mock).mock.calls as unknown as Array<
        [unknown, Array<{ archivoUrl: string }>]
      >;
      const primeraFoto = llamadasMock[0][1][0];
      expect(primeraFoto.archivoUrl.endsWith(".png")).toBe(true);
      expect(primeraFoto.archivoUrl.includes(".html")).toBe(false);
    });

    it("debe guardar la extensión .jpg cuando el mimetype es image/jpeg aunque originalname sea .exe", async () => {
      const dto: RegistrarAusenciaDto = {
        sesionClaseId: "ses-101",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "fuera_del_aula",
      };
      const fotoJpeg = [crearArchivo("payload.exe", "image/jpeg")];

      await service.registrar(dto, fotoJpeg, "usr-director");

      expect(repo.crearAusenciaConFotos).toHaveBeenCalled();
      const llamadasMock = (repo.crearAusenciaConFotos as jest.Mock).mock.calls as unknown as Array<
        [unknown, Array<{ archivoUrl: string }>]
      >;
      const primeraFoto = llamadasMock[0][1][0];
      expect(primeraFoto.archivoUrl.endsWith(".jpg")).toBe(true);
      expect(primeraFoto.archivoUrl.includes(".exe")).toBe(false);
    });
  });

  describe("Persistencia en base de datos antes que en disco y prevención de archivos huérfanos", () => {
    it("debe invocar la persistencia en BD antes de escribir en disco y limpiar archivos si la escritura en disco falla", async () => {
      const dto: RegistrarAusenciaDto = {
        sesionClaseId: "ses-101",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "fuera_del_aula",
      };
      const fotos = [
        crearArchivo("foto1.png", "image/png"),
        crearArchivo("foto2.png", "image/png"),
      ];

      let bdEjecutadaAntes = false;
      repo.crearAusenciaConFotos = jest.fn().mockImplementation(() => {
        bdEjecutadaAntes = true;
        return Promise.resolve(ausenciaMock);
      });

      // Simular fallo en la segunda escritura de archivo
      let conteoEscrituras = 0;
      jest.spyOn(fs.promises, "writeFile").mockImplementation(() => {
        conteoEscrituras++;
        if (conteoEscrituras === 2) {
          return Promise.reject(new Error("Fallo de I/O en disco"));
        }
        return Promise.resolve();
      });
      const unlinkSpy = jest.spyOn(fs.promises, "unlink").mockResolvedValue(undefined);

      await expect(service.registrar(dto, fotos, "usr-director")).rejects.toThrow(
        new InternalServerErrorException(
          "No se pudieron guardar las evidencias fotográficas en disco.",
        ),
      );

      // Comprobar que la base de datos se ejecutó primero
      expect(bdEjecutadaAntes).toBe(true);
      expect(repo.crearAusenciaConFotos).toHaveBeenCalled();

      // Comprobar que el archivo escrito previamente fue limpiado con unlink
      expect(unlinkSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Rechazo de sesiones de fecha futura", () => {
    it("debe rechazar con BadRequestException si la fecha de la sesión es posterior a la fecha actual", async () => {
      // Sesión programada en un año o fecha futura lejana
      repo.buscarSesionParaAusencia = jest.fn().mockResolvedValue({
        ...sesionBase,
        fecha: "2035-12-01",
      });

      const dto: RegistrarAusenciaDto = {
        sesionClaseId: "ses-101",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "fuera_del_aula",
      };

      await expect(service.registrar(dto, undefined, "usr-director")).rejects.toThrow(
        new BadRequestException(MENSAJES_AUSENCIA.SESION_FUTURA),
      );
    });
  });

  describe("Validación de metadatos de fotos (metadatosFotos)", () => {
    it("debe rechazar con BadRequestException cuando el JSON de metadatosFotos es sintácticamente inválido", async () => {
      const dto: RegistrarAusenciaDto = {
        sesionClaseId: "ses-101",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "fuera_del_aula",
        metadatosFotos: "{ json_invalido_sin_comillas: ",
      };

      await expect(service.registrar(dto, undefined, "usr-director")).rejects.toThrow(
        new BadRequestException(MENSAJES_AUSENCIA.METADATOS_FOTOS_INVALIDOS),
      );
    });

    it("debe rechazar con BadRequestException cuando el JSON de metadatosFotos no es un arreglo", async () => {
      const dto: RegistrarAusenciaDto = {
        sesionClaseId: "ses-101",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "fuera_del_aula",
        metadatosFotos: JSON.stringify({ objeto: "invalido_no_es_arreglo" }),
      };

      await expect(service.registrar(dto, undefined, "usr-director")).rejects.toThrow(
        new BadRequestException(MENSAJES_AUSENCIA.METADATOS_FOTOS_INVALIDOS),
      );
    });
  });
});
