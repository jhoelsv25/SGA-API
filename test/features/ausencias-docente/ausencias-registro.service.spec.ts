import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import { MENSAJES_AUSENCIA } from "@/features/ausencias-docente/constants";
import {
  AusenciasDocenteRepository,
  AusenciasDocenteService,
  type AusenciaConDetalle,
  type AusenciaFila,
  type IAusenciasDocenteRepository,
  type RegistrarAusenciaDto,
  type SesionParaAusencia,
} from "@/features/ausencias-docente";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

describe("RF-012: Registro de ausencias docentes (HU1)", () => {
  let service: AusenciasDocenteService;
  let repo: Mocks<IAusenciasDocenteRepository>;
  let notificaciones: Mocks<NotificacionesService>;
  let audit: Mocks<AuditService>;
  let anioCls: Mocks<AnioLectivoCls>;

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

  const ausenciaCreada: AusenciaConDetalle = {
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
    registradoEn: "2027-05-13T09:15:00.000Z",
    sesion: sesionEjemplo,
    fotos: [
      {
        id: "ev-1",
        ausenciaId: "aus-1-uuid",
        archivoUrl: "/uploads/ausencias/foto1.png",
        tomadaEn: "2027-05-13T08:55:00.000Z",
        orden: 1,
        vigente: true,
      },
      {
        id: "ev-2",
        ausenciaId: "aus-1-uuid",
        archivoUrl: "/uploads/ausencias/foto2.png",
        tomadaEn: "2027-05-13T08:58:00.000Z",
        orden: 2,
        vigente: true,
      },
    ],
    registradoPorNombre: "Director Escolar",
  };

  function crearArchivoFoto(nombre: string, bytes: number, mimetype = "image/png"): Express.Multer.File {
    return {
      fieldname: "fotos",
      originalname: nombre,
      encoding: "7bit",
      mimetype,
      size: bytes,
      buffer: Buffer.alloc(10),
      destination: "",
      filename: nombre,
      path: "",
      stream: {} as Express.Multer.File["stream"],
    };
  }

  beforeEach(() => {
    repo = {
      buscarSesionParaAusencia: jest.fn().mockResolvedValue(sesionEjemplo),
      buscarAusenciasVigentesDeSesion: jest.fn().mockResolvedValue([]),
      buscarPorId: jest.fn().mockResolvedValue(ausenciaCreada),
      buscarVersionesDeRaiz: jest.fn().mockResolvedValue([ausenciaCreada]),
      crearAusenciaConFotos: jest.fn().mockResolvedValue(ausenciaCreada),
      crearNuevaVersion: jest.fn().mockResolvedValue(ausenciaCreada),
      anularAusencia: jest.fn().mockResolvedValue(ausenciaCreada),
      guardarDescargo: jest.fn().mockResolvedValue(undefined),
      listarSupervisor: jest.fn().mockResolvedValue([ausenciaCreada]),
      listarPorDocente: jest.fn().mockResolvedValue([ausenciaCreada]),
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
    jest.clearAllMocks();
  });

  describe("CP-RF012-01: Registrar una ausencia con fotos", () => {
    it("debe guardar la ausencia con 20 minutos y fotos, notificar al docente y auditar la mutación", async () => {
      // Dado que la sesión de Matemática de 5.° A es de 08:30 a 10:00 y el docente firmó el ingreso
      const dto: RegistrarAusenciaDto = {
        sesionClaseId: "ses-mate-5a",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "desayunando",
        observacion: "En la cafetería",
      };
      const fotos = [crearArchivoFoto("foto1.png", 1024), crearArchivoFoto("foto2.jpg", 2048, "image/jpeg")];

      // Cuando registro una ausencia de 08:50 a 09:10 con motivo y 2 fotos
      const resultado = await service.registrar(dto, fotos, "user-director-uuid", "192.168.1.50");

      // Entonces el sistema guarda la ausencia con 20 minutos y sus fotos
      expect(resultado.mensaje).toBe(MENSAJES_AUSENCIA.AUSENCIA_REGISTRADA(20));
      expect(resultado.ausencia.minutos).toBe(20);
      expect(resultado.ausencia.fotos).toHaveLength(2);

      // Y notifica al docente
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-quispe-uuid",
          titulo: "Nueva ausencia registrada",
          mensaje: "Se registró una ausencia de 20 minutos en su sesión de clase.",
          tipo: "alerta",
          sesionClaseId: "ses-mate-5a",
          enlaceUrl: "/admin/mis-ausencias",
        }),
      );

      // Y registra auditoría inmutable
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-director-uuid",
          accion: "crear",
          tabla: "ausencias_sesion",
          direccionIp: "192.168.1.50",
        }),
      );
    });

    it("debe lanzar NotFoundException si la sesión de clase no existe", async () => {
      // Dado que la sesión no existe en el sistema
      repo.buscarSesionParaAusencia = jest.fn().mockResolvedValue(null);
      const dto: RegistrarAusenciaDto = {
        sesionClaseId: "ses-inexistente",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "desayunando",
      };

      // Cuando intento registrar la ausencia
      // Entonces debe rechazar con NotFoundException
      await expect(service.registrar(dto, undefined, "user-director-uuid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("CP-RF012-02: Varios tramos en la misma sesión", () => {
    it("debe guardar otro tramo sin conflicto cuando no hay cruce de horarios", async () => {
      // Dado que la sesión ya tiene una ausencia previa registrada de 08:50 a 09:10
      const ausenciaPrevia: AusenciaFila = {
        id: "aus-prev-uuid",
        ausenciaRaizId: null,
        sesionClaseId: "ses-mate-5a",
        registradoPorId: "user-director-uuid",
        horaDesde: "08:50",
        horaHasta: "09:10",
        minutos: 20,
        motivo: "desayunando",
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
      };
      repo.buscarAusenciasVigentesDeSesion = jest.fn().mockResolvedValue([ausenciaPrevia]);

      const dtoSegundoTramo: RegistrarAusenciaDto = {
        sesionClaseId: "ses-mate-5a",
        horaDesde: "09:30",
        horaHasta: "09:40",
        motivo: "fuera_del_aula",
      };

      const respuestaSegundoTramo: AusenciaConDetalle = {
        ...ausenciaCreada,
        id: "aus-2-uuid",
        horaDesde: "09:30",
        horaHasta: "09:40",
        minutos: 10,
        motivo: "fuera_del_aula",
        fotos: [],
      };
      repo.crearAusenciaConFotos = jest.fn().mockResolvedValue(respuestaSegundoTramo);

      // Cuando registro otra de 09:30 a 09:40, motivo fuera_del_aula
      const resultado = await service.registrar(dtoSegundoTramo, undefined, "user-director-uuid");

      // Entonces el sistema la guarda exitosamente
      expect(resultado.mensaje).toBe(MENSAJES_AUSENCIA.AUSENCIA_REGISTRADA(10));
      expect(resultado.ausencia.minutos).toBe(10);
      expect(repo.crearAusenciaConFotos).toHaveBeenCalled();
    });
  });

  describe("CP-RF012-03: Tramos superpuestos", () => {
    it("debe rechazar con ConflictException si el tramo se cruza con otra ausencia registrada en la misma sesión", async () => {
      // Dado que la sesión ya tiene una ausencia de 08:50 a 09:10
      const ausenciaPrevia: AusenciaFila = {
        id: "aus-prev-uuid",
        ausenciaRaizId: null,
        sesionClaseId: "ses-mate-5a",
        registradoPorId: "user-director-uuid",
        horaDesde: "08:50",
        horaHasta: "09:10",
        minutos: 20,
        motivo: "desayunando",
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
      };
      repo.buscarAusenciasVigentesDeSesion = jest.fn().mockResolvedValue([ausenciaPrevia]);

      // Cuando registro otra de 09:00 a 09:20 (se solapa parcialmente de 09:00 a 09:10)
      const dtoSuperpuesto: RegistrarAusenciaDto = {
        sesionClaseId: "ses-mate-5a",
        horaDesde: "09:00",
        horaHasta: "09:20",
        motivo: "fuera_del_aula",
      };

      // Entonces el sistema impide guardar y muestra el mensaje exacto
      await expect(service.registrar(dtoSuperpuesto, undefined, "user-director-uuid")).rejects.toThrow(
        new ConflictException(MENSAJES_AUSENCIA.TRAMOS_SUPERPUESTOS),
      );
    });
  });

  describe("CP-RF012-04: Tramo fuera del horario de la sesión", () => {
    it("debe rechazar con BadRequestException si el tramo está fuera del horario de la sesión", async () => {
      // Dado que la sesión es de 08:30 a 10:00
      const dtoFueraDeHorario: RegistrarAusenciaDto = {
        sesionClaseId: "ses-mate-5a",
        horaDesde: "10:05",
        horaHasta: "10:15",
        motivo: "fuera_del_aula",
      };

      // Cuando registro un tramo de 10:05 a 10:15
      // Entonces el sistema impide guardar y muestra el mensaje formateado con las horas de la sesión
      await expect(service.registrar(dtoFueraDeHorario, undefined, "user-director-uuid")).rejects.toThrow(
        new BadRequestException(MENSAJES_AUSENCIA.FUERA_HORARIO_SESION("08:30 a 10:00")),
      );
    });
  });

  describe("CP-RF012-05: Horas invertidas", () => {
    it("debe rechazar con BadRequestException si la hora final es anterior o igual a la hora inicial", async () => {
      // Dado que estoy registrando una ausencia
      const dtoHorasInvertidas: RegistrarAusenciaDto = {
        sesionClaseId: "ses-mate-5a",
        horaDesde: "09:15",
        horaHasta: "09:00",
        motivo: "fuera_del_aula",
      };

      // Cuando la hora final es anterior a la inicial
      // Entonces el sistema impide guardar y muestra el mensaje exacto
      await expect(service.registrar(dtoHorasInvertidas, undefined, "user-director-uuid")).rejects.toThrow(
        new BadRequestException(MENSAJES_AUSENCIA.HORAS_INVERTIDAS),
      );

      // Y también si son exactamente iguales
      const dtoHorasIguales: RegistrarAusenciaDto = {
        sesionClaseId: "ses-mate-5a",
        horaDesde: "09:00",
        horaHasta: "09:00",
        motivo: "fuera_del_aula",
      };
      await expect(service.registrar(dtoHorasIguales, undefined, "user-director-uuid")).rejects.toThrow(
        new BadRequestException(MENSAJES_AUSENCIA.HORAS_INVERTIDAS),
      );
    });
  });

  describe("CP-RF012-06: Motivo «Otro» sin observación", () => {
    it("debe rechazar con BadRequestException si el motivo es «otro» y no se proporciona observación", async () => {
      // Dado que elegí el motivo «otro»
      const dtoOtroSinObs: RegistrarAusenciaDto = {
        sesionClaseId: "ses-mate-5a",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "otro",
      };

      // Cuando intento guardar sin observación
      // Entonces el sistema impide guardar y muestra el mensaje exacto
      await expect(service.registrar(dtoOtroSinObs, undefined, "user-director-uuid")).rejects.toThrow(
        new BadRequestException(MENSAJES_AUSENCIA.FALTA_OBSERVACION),
      );

      // Y también si la observación son solo espacios en blanco
      const dtoOtroEspacios: RegistrarAusenciaDto = {
        sesionClaseId: "ses-mate-5a",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "otro",
        observacion: "   ",
      };
      await expect(service.registrar(dtoOtroEspacios, undefined, "user-director-uuid")).rejects.toThrow(
        new BadRequestException(MENSAJES_AUSENCIA.FALTA_OBSERVACION),
      );
    });
  });

  describe("CP-RF012-07: Foto inválida", () => {
    it("debe rechazar con BadRequestException si se adjunta un archivo mayor a 5 MB", async () => {
      // Dado que estoy adjuntando fotos
      const dto: RegistrarAusenciaDto = {
        sesionClaseId: "ses-mate-5a",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "desayunando",
      };
      const fotoPesada = [crearArchivoFoto("foto_grande.png", 8 * 1024 * 1024)]; // 8 MB

      // Cuando adjunto un archivo de 8 MB
      // Entonces el sistema lo rechaza con el mensaje exacto
      await expect(service.registrar(dto, fotoPesada, "user-director-uuid")).rejects.toThrow(
        new BadRequestException(MENSAJES_AUSENCIA.FOTO_INVALIDA),
      );
    });

    it("debe rechazar con BadRequestException si se adjunta un formato no permitido (ej. PDF)", async () => {
      // Dado que estoy adjuntando fotos
      const dto: RegistrarAusenciaDto = {
        sesionClaseId: "ses-mate-5a",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "desayunando",
      };
      const archivoPdf = [crearArchivoFoto("documento.pdf", 500 * 1024, "application/pdf")];

      // Cuando adjunto un PDF
      // Entonces el sistema lo rechaza con el mensaje exacto
      await expect(service.registrar(dto, archivoPdf, "user-director-uuid")).rejects.toThrow(
        new BadRequestException(MENSAJES_AUSENCIA.FOTO_INVALIDA),
      );
    });
  });

  describe("CP-RF012-08: Tomar la foto desde el celular", () => {
    it("debe registrar la ausencia asociando la fecha y hora de captura tomadaEn de cada foto", async () => {
      // Dado que ingresé al portal desde mi celular y capturé fotos con fecha y hora
      const dtoConMetadatos: RegistrarAusenciaDto = {
        sesionClaseId: "ses-mate-5a",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "desayunando",
        metadatosFotos: JSON.stringify([{ tomadaEn: "2027-05-13T08:55:00.000Z" }]),
      };
      const fotos = [crearArchivoFoto("captura_camara.jpg", 1024, "image/jpeg")];

      // Cuando guardo la ausencia con la foto capturada
      await service.registrar(dtoConMetadatos, fotos, "user-director-uuid");

      // Entonces el sistema guarda la fecha y hora de la foto
      expect(repo.crearAusenciaConFotos).toHaveBeenCalledWith(
        expect.objectContaining({
          sesionClaseId: "ses-mate-5a",
          horaDesde: "08:50",
          horaHasta: "09:10",
          motivo: "desayunando",
        }),
        expect.arrayContaining([
          expect.objectContaining({
            tomadaEn: "2027-05-13T08:55:00.000Z",
          }),
        ]),
      );
    });
  });

  describe("CP-RF012-18: Bimestre cerrado o consolidado", () => {
    it("debe bloquear el registro con ForbiddenException si el bimestre está cerrado o consolidado", async () => {
      // Dado que el bimestre de la sesión ya se cerró o consolidó
      repo.bimestreEstaBloqueado = jest.fn().mockResolvedValue(true);
      const dto: RegistrarAusenciaDto = {
        sesionClaseId: "ses-mate-5a",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "desayunando",
      };

      // Cuando intento registrar una ausencia de ese bimestre
      // Entonces el sistema bloquea la acción y muestra el mensaje exacto
      await expect(service.registrar(dto, undefined, "user-director-uuid")).rejects.toThrow(
        new ForbiddenException(MENSAJES_AUSENCIA.BIMESTRE_CERRADO),
      );
    });
  });

  describe("CP-RF012-25: Otro perfil con permiso de registro (v2.0)", () => {
    it("debe permitir registrar a un usuario con rol distinto (ej. Coordinador) persistiendo su autoría", async () => {
      // Dado que el Coordinador tiene permiso y registra la ausencia
      const dto: RegistrarAusenciaDto = {
        sesionClaseId: "ses-mate-5a",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "fuera_del_aula",
      };
      const actorCoordinadorId = "user-coordinador-uuid";

      // Cuando el Coordinador registra una ausencia
      const resultado = await service.registrar(dto, undefined, actorCoordinadorId, "192.168.1.120");

      // Entonces el sistema la guarda igual que si la registrara el Director
      expect(resultado.mensaje).toBe(MENSAJES_AUSENCIA.AUSENCIA_REGISTRADA(20));
      expect(repo.crearAusenciaConFotos).toHaveBeenCalledWith(
        expect.objectContaining({
          registradoPorId: actorCoordinadorId,
        }),
        expect.anything(),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: actorCoordinadorId,
          accion: "crear",
          tabla: "ausencias_sesion",
        }),
      );
    });
  });
});
