import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { OcrService } from "@/core/ocr/ocr.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import {
  MENSAJES_LIBRETAS,
  mensajeNoDisponible,
  mensajeProgramadas,
  mensajePublicadas,
  mensajeVistaPrevia,
} from "@/features/libretas/constants";
import type { ActorLibreta, LibretaSeccionRow } from "@/features/libretas/interfaces";
import { LibretasService } from "@/features/libretas/libretas.service";
import { LibretasRepository } from "@/features/libretas/repositories";
import { LibretaArchivoStore } from "@/features/libretas/utils";

const ANIO = "anio-2027";
const PERIODO = "periodo-2";
const SECCION = "sec-5a";

describe("LibretasService (RF-014)", () => {
  let service: LibretasService;
  let repository: jest.Mocked<LibretasRepository>;
  let archivos: jest.Mocked<LibretaArchivoStore>;
  let audit: jest.Mocked<Pick<AuditService, "log">>;
  let notificaciones: jest.Mocked<Pick<NotificacionesService, "enviar">>;

  const director: ActorLibreta = {
    id: "usr-dir",
    roleId: "rol-dir",
    role: "Director",
    personaId: "per-dir",
  };
  const docente: ActorLibreta = {
    id: "usr-doc",
    roleId: "rol-doc",
    role: "Docente",
    personaId: "per-doc",
  };
  const admin: ActorLibreta = {
    id: "usr-admin",
    roleId: "rol-admin",
    role: "Administrador",
    personaId: "per-admin",
  };
  const apoderado: ActorLibreta = {
    id: "usr-apo",
    roleId: "rol-apo",
    role: "Apoderado",
    personaId: "per-apo",
  };

  const pdf = (
    nombre: string,
    bytes = 100,
    buffer: Buffer = Buffer.from("%PDF-1.4\n"),
  ): { nombre: string; mime: string; tamanoBytes: number; buffer: Buffer } => ({
    nombre,
    mime: "application/pdf",
    tamanoBytes: bytes,
    buffer,
  });

  const fila = (
    codigo: string,
    estado: LibretaSeccionRow["estado"] = "pendiente",
  ): LibretaSeccionRow => ({
    matriculaId: `mat-${codigo}`,
    codigo,
    nombreCompleto: `Estudiante ${codigo}`,
    seccionId: SECCION,
    libretaId: `lib-${codigo}`,
    estado,
    fechaLimite: "2027-07-26",
    usuarioEstudianteId: `usr-est-${codigo}`,
    usuarioApoderadoId: `usr-apo-${codigo}`,
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2027-07-24T15:00:00Z"));

    repository = {
      anioDeTrabajo: jest.fn().mockResolvedValue(ANIO),
      obtenerPeriodo: jest.fn().mockResolvedValue({
        id: PERIODO,
        nombre: "II Bimestre",
        anioAcademicoId: ANIO,
      }),
      existeProgramacion: jest.fn().mockResolvedValue(true),
      programar: jest.fn().mockResolvedValue(168),
      cambiarFechaPendientes: jest.fn().mockResolvedValue(10),
      crearPendientesDeMatricula: jest.fn().mockResolvedValue(1),
      eliminarPendientesAntesDeLimite: jest.fn().mockResolvedValue(1),
      listarDeSeccion: jest.fn().mockResolvedValue([]),
      listarCodigosOtrasSecciones: jest.fn().mockResolvedValue([]),
      obtenerAlcance: jest.fn().mockResolvedValue("mis_secciones"),
      guardarAlcance: jest.fn().mockResolvedValue("mis_secciones"),
      listarAlcances: jest.fn(),
      esTutorDeSeccion: jest.fn().mockResolvedValue(true),
      dictaEnSeccion: jest.fn().mockResolvedValue(true),
      publicar: jest.fn().mockResolvedValue(undefined),
      seguimiento: jest.fn(),
      detalleSeccion: jest.fn(),
      misLibretas: jest.fn(),
      obtenerParaApertura: jest.fn(),
      registrarPrimeraVista: jest.fn(),
      historial: jest.fn(),
      listarPeriodos: jest.fn(),
      listarSecciones: jest.fn(),
      seccionesDePersona: jest.fn().mockResolvedValue([SECCION]),
    } as unknown as jest.Mocked<LibretasRepository>;

    archivos = {
      guardar: jest.fn().mockResolvedValue("/uploads/libretas/a.pdf"),
      rutaAbsoluta: jest.fn().mockReturnValue("/tmp/a.pdf"),
    };

    audit = { log: jest.fn().mockResolvedValue(undefined) };
    notificaciones = { enviar: jest.fn().mockResolvedValue(undefined) };

    service = new LibretasService(
      repository,
      archivos,
      audit as unknown as AuditService,
      { id: () => ANIO } as AnioLectivoCls,
      notificaciones as unknown as NotificacionesService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("CP-RF014-01 programa las libretas pendientes del bimestre", async () => {
    repository.existeProgramacion.mockResolvedValueOnce(false);
    const resultado = await service.programar(PERIODO, "2027-07-26", director);
    expect(repository.programar).toHaveBeenCalledWith(PERIODO, ANIO, "2027-07-26");
    expect(resultado.mensaje).toBe(mensajeProgramadas(168, "II Bimestre", "26/07/2027"));
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ accion: "crear", tabla: "libretas" }),
    );
  });

  it("CP-RF014-02 crea la libreta pendiente al matricular después", async () => {
    await expect(service.crearPendientesDeMatricula("mat-nueva")).resolves.toBe(1);
    expect(repository.crearPendientesDeMatricula).toHaveBeenCalledWith("mat-nueva");
  });

  it("CP-RF014-03 elimina la libreta pendiente si el retiro es antes de la fecha límite", async () => {
    await expect(service.eliminarPendientesPorRetiro("mat-1", "2027-07-20")).resolves.toBe(1);
    expect(repository.eliminarPendientesAntesDeLimite).toHaveBeenCalledWith("mat-1", "2027-07-20");
  });

  it("CP-RF014-04 cambia la fecha solo de las pendientes y lo audita", async () => {
    const resultado = await service.cambiarFecha(PERIODO, "2027-07-30", director);
    expect(repository.cambiarFechaPendientes).toHaveBeenCalledWith(PERIODO, "2027-07-30");
    expect(resultado.actualizadas).toBe(10);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ accion: "actualizar" }));
  });

  it("CP-RF014-05 publica a tiempo y notifica a la familia", async () => {
    const filas = Array.from({ length: 30 }, (_, i) => fila(String(1000 + i)));
    repository.listarDeSeccion.mockResolvedValue(filas);
    const resultado = await service.publicar(
      SECCION,
      PERIODO,
      filas.map((item) => pdf(`${item.codigo}.pdf`)),
      [],
      docente,
    );
    expect(resultado.mensaje).toBe(mensajePublicadas(30));
    expect(repository.publicar).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ estado: "a_tiempo", esReemplazo: false })]),
      docente.id,
    );
    expect(notificaciones.enviar).toHaveBeenCalled();
  });

  it("CP-RF014-06 publica fuera de plazo después de la fecha límite", async () => {
    jest.setSystemTime(new Date("2027-07-28T15:00:00Z"));
    repository.listarDeSeccion.mockResolvedValue([fila("2001")]);
    await service.publicar(SECCION, PERIODO, [pdf("2001.pdf")], [], docente);
    expect(repository.publicar).toHaveBeenCalledWith(
      [expect.objectContaining({ estado: "fuera_de_plazo" })],
      docente.id,
    );
  });

  it("CP-RF014-07 muestra la vista previa sin publicar", async () => {
    const enSeccion = Array.from({ length: 28 }, (_, i) => fila(String(3000 + i)));
    repository.listarDeSeccion.mockResolvedValue(enSeccion);
    repository.listarCodigosOtrasSecciones.mockResolvedValue([
      { matriculaId: "mat-otra", codigo: "9999", nombreCompleto: "Ana Otra" },
    ]);
    const archivosCarga = [
      ...enSeccion.map((item) => pdf(`${item.codigo}.pdf`)),
      pdf("sin-codigo-a.pdf"),
      pdf("sin-codigo-b.pdf"),
      pdf("9999.pdf"),
    ];
    const vista = await service.vistaPrevia(SECCION, PERIODO, archivosCarga, docente);
    expect(vista.mensaje).toBe(mensajeVistaPrevia(28, 2, 1));
    expect(repository.publicar).not.toHaveBeenCalled();
  });

  it("CP-RF014-08 asigna a mano un archivo no reconocido", async () => {
    repository.listarDeSeccion.mockResolvedValue([fila("4001")]);
    await service.publicar(
      SECCION,
      PERIODO,
      [pdf("desconocido.pdf")],
      [{ nombreArchivo: "desconocido.pdf", matriculaId: "mat-4001" }],
      docente,
    );
    expect(repository.publicar).toHaveBeenCalledWith(
      [expect.objectContaining({ asignacion: "manual", codigoLeido: null })],
      docente.id,
    );
  });

  it("CP-RF014-09 rechaza JPG o un PDF de más de 5 MB", async () => {
    await expect(
      service.vistaPrevia(
        SECCION,
        PERIODO,
        [{ nombre: "foto.jpg", mime: "image/jpeg", tamanoBytes: 100, buffer: Buffer.from("x") }],
        docente,
      ),
    ).rejects.toThrow(new BadRequestException(MENSAJES_LIBRETAS.ARCHIVO_INVALIDO));
    await expect(
      service.vistaPrevia(SECCION, PERIODO, [pdf("grande.pdf", 8 * 1024 * 1024)], docente),
    ).rejects.toThrow(MENSAJES_LIBRETAS.ARCHIVO_INVALIDO);
    await expect(
      service.vistaPrevia(
        SECCION,
        PERIODO,
        [pdf("falso.pdf", 100, Buffer.from("<html>no es pdf</html>"))],
        docente,
      ),
    ).rejects.toThrow(MENSAJES_LIBRETAS.ARCHIVO_INVALIDO);
  });

  it("CP-RF014-10 rechaza más de 50 archivos", async () => {
    const muchos = Array.from({ length: 60 }, (_, i) => pdf(`${i}.pdf`));
    await expect(service.vistaPrevia(SECCION, PERIODO, muchos, docente)).rejects.toThrow(
      MENSAJES_LIBRETAS.DEMASIADOS_ARCHIVOS,
    );
  });

  it("CP-RF014-11 bloquea la carga si el bimestre no está programado", async () => {
    repository.existeProgramacion.mockResolvedValue(false);
    await expect(service.vistaPrevia(SECCION, PERIODO, [pdf("1.pdf")], docente)).rejects.toThrow(
      MENSAJES_LIBRETAS.SIN_PROGRAMAR,
    );
  });

  it("CP-RF014-12 rechaza la sección fuera del alcance mis_secciones", async () => {
    repository.obtenerAlcance.mockResolvedValue("mis_secciones");
    repository.esTutorDeSeccion.mockResolvedValue(false);
    repository.dictaEnSeccion.mockResolvedValue(false);
    await expect(service.vistaPrevia("sec-4b", PERIODO, [pdf("1.pdf")], docente)).rejects.toThrow(
      new ForbiddenException(MENSAJES_LIBRETAS.SIN_PERMISO_SECCION),
    );
  });

  it("CP-RF014-13 guarda el cambio de alcance y desde entonces solo el tutor sube", async () => {
    await service.cambiarAlcance("rol-doc", "tutoria", admin);
    expect(repository.guardarAlcance).toHaveBeenCalledWith("rol-doc", "tutoria", admin.id);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ tabla: "libreta_alcances" }));

    repository.obtenerAlcance.mockResolvedValue("tutoria");
    repository.esTutorDeSeccion.mockResolvedValue(false);
    await expect(service.vistaPrevia(SECCION, PERIODO, [pdf("1.pdf")], docente)).rejects.toThrow(
      MENSAJES_LIBRETAS.SIN_PERMISO_SECCION,
    );
  });

  it("CP-RF014-14 reemplaza con motivo y conserva el estado a_tiempo", async () => {
    repository.listarDeSeccion.mockResolvedValue([fila("5001", "a_tiempo")]);
    await service.publicar(
      SECCION,
      PERIODO,
      [pdf("5001.pdf")],
      [
        {
          nombreArchivo: "5001.pdf",
          matriculaId: "mat-5001",
          motivo: "Corrección de nota en el SIAGIE",
        },
      ],
      docente,
    );
    expect(repository.publicar).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          esReemplazo: true,
          estado: "a_tiempo",
          motivo: "Corrección de nota en el SIAGIE",
        }),
      ],
      docente.id,
    );
  });

  it("CP-RF014-15 impide el reemplazo sin motivo", async () => {
    repository.listarDeSeccion.mockResolvedValue([fila("5002", "a_tiempo")]);
    await expect(
      service.publicar(SECCION, PERIODO, [pdf("5002.pdf")], [], docente),
    ).rejects.toThrow(MENSAJES_LIBRETAS.REEMPLAZO_SIN_MOTIVO);
    expect(repository.publicar).not.toHaveBeenCalled();
  });

  it("CP-RF014-16 lista el historial con vigencia y quién subió cada archivo", async () => {
    repository.obtenerParaApertura.mockResolvedValue({
      id: "lib-1",
      estado: "a_tiempo",
      bimestre: "II Bimestre",
      archivoUrl: "/uploads/libretas/b.pdf",
      nombreArchivo: "b.pdf",
      vistoEn: null,
      seccionId: SECCION,
      estudiantePersonaId: "per-est",
      apoderadoPersonaIds: [],
    });
    repository.historial.mockResolvedValue([
      {
        id: "arc-2",
        nombreOriginal: "nueva.pdf",
        asignacion: "automatica",
        vigente: true,
        motivo: "Corrección de nota en el SIAGIE",
        subidoPorNombre: "Tutor A",
        subidoEn: "2027-07-28T10:00:00",
      },
      {
        id: "arc-1",
        nombreOriginal: "vieja.pdf",
        asignacion: "automatica",
        vigente: false,
        motivo: null,
        subidoPorNombre: "Tutor A",
        subidoEn: "2027-07-24T10:00:00",
      },
    ]);
    const historial = await service.historial("lib-1", director);
    expect(historial.archivos[0].vigencia).toBe(1);
    expect(historial.archivos[1].vigencia).toBe(0);
    expect(historial.archivos[1].subidoPorNombre).toBe("Tutor A");
  });

  it("CP-RF014-17 registra la primera vista de la familia", async () => {
    repository.obtenerParaApertura.mockResolvedValue({
      id: "lib-hijo",
      estado: "a_tiempo",
      bimestre: "II Bimestre",
      archivoUrl: "/uploads/libretas/hijo.pdf",
      nombreArchivo: "hijo.pdf",
      vistoEn: null,
      seccionId: SECCION,
      estudiantePersonaId: "per-hijo",
      apoderadoPersonaIds: [apoderado.personaId],
    });
    const abierto = await service.abrir("lib-hijo", apoderado);
    expect(abierto.ruta).toBe("/tmp/a.pdf");
    expect(repository.registrarPrimeraVista).toHaveBeenCalledWith("lib-hijo", apoderado.id);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ valorNuevo: { primeraVista: true } }),
    );
  });

  it("CP-RF014-18 informa que la libreta pendiente aún no está disponible", async () => {
    repository.misLibretas.mockResolvedValue([
      {
        id: "lib-p",
        periodoId: PERIODO,
        bimestre: "II Bimestre",
        estado: "pendiente",
        fechaLimite: "2027-07-26",
        archivoUrl: null,
        vistoEn: null,
        estudianteNombre: "Luis",
      },
    ]);
    const mias = await service.misLibretas({
      ...apoderado,
      role: "Estudiante",
      personaId: "per-est",
    });
    expect(mias.libretas[0].mensaje).toBe(mensajeNoDisponible("II Bimestre"));
    expect(mias.libretas[0].disponible).toBe(false);
  });

  it("CP-RF014-19 rechaza la libreta de otro estudiante", async () => {
    repository.obtenerParaApertura.mockResolvedValue({
      id: "lib-ajena",
      estado: "a_tiempo",
      bimestre: "II Bimestre",
      archivoUrl: "/uploads/libretas/ajena.pdf",
      nombreArchivo: "ajena.pdf",
      vistoEn: null,
      seccionId: "sec-otra",
      estudiantePersonaId: "per-otro",
      apoderadoPersonaIds: ["per-otro-apo"],
    });
    repository.obtenerAlcance.mockResolvedValue(null);
    await expect(service.abrir("lib-ajena", apoderado)).rejects.toThrow(ForbiddenException);
  });

  it("CP-RF014-20 resume el avance por sección con el porcentaje a tiempo", async () => {
    repository.obtenerAlcance.mockResolvedValue("colegio");
    repository.seguimiento.mockResolvedValue([
      {
        seccionId: SECCION,
        seccionNombre: "A",
        gradoNombre: "5.°",
        aTiempo: 20,
        fueraDePlazo: 5,
        pendientes: 5,
        vistas: 12,
      },
    ]);
    const resumen = await service.seguimiento(PERIODO, director);
    expect(resumen.secciones[0]).toEqual(
      expect.objectContaining({
        programadas: 30,
        porcentajeATiempo: 67,
        vistas: 12,
        pendientes: 5,
      }),
    );
  });

  it("no permite programar a un docente", async () => {
    await expect(service.programar(PERIODO, "2027-07-26", docente)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("rechaza programar dos veces el mismo bimestre", async () => {
    repository.existeProgramacion.mockResolvedValue(true);
    await expect(service.programar(PERIODO, "2027-07-26", director)).rejects.toThrow(
      ConflictException,
    );
  });

  describe("respaldo OCR en vista previa y publicación", () => {
    let ocrMock: jest.Mocked<Pick<OcrService, "estaHabilitado" | "extraerDatos">>;
    let serviceConOcr: LibretasService;

    beforeEach(() => {
      ocrMock = {
        estaHabilitado: jest.fn().mockReturnValue(true),
        extraerDatos: jest.fn(),
      };
      serviceConOcr = new LibretasService(
        repository,
        archivos,
        audit as unknown as AuditService,
        { id: () => ANIO } as AnioLectivoCls,
        notificaciones as unknown as NotificacionesService,
        ocrMock as unknown as OcrService,
      );
    });

    it("no invoca OCR cuando el nombre del archivo ya contiene el código", async () => {
      repository.listarDeSeccion.mockResolvedValue([fila("EST001")]);

      const vista = await serviceConOcr.vistaPrevia(
        SECCION,
        PERIODO,
        [pdf("libreta_EST001.pdf")],
        docente,
      );

      expect(vista.asignadas).toHaveLength(1);
      expect(vista.asignadas[0].metodoReconocimiento).toBe("nombre");
      expect(ocrMock.extraerDatos).not.toHaveBeenCalled();
    });

    it("usa OCR cuando el nombre no se reconoce y empareja por DNI", async () => {
      repository.listarDeSeccion.mockResolvedValue([
        { ...fila("EST001"), numeroDocumento: "74125896", nombreCompleto: "Pérez García, Ana" },
      ]);
      ocrMock.extraerDatos.mockResolvedValue({
        estrategia: "mistral",
        modelo: "mistral-ocr-latest",
        textoCrudo: "{}",
        datos: { codigoEstudiante: null, dni: "74125896", nombreCompleto: "Ana Pérez García" },
      });

      const vista = await serviceConOcr.vistaPrevia(
        SECCION,
        PERIODO,
        [pdf("scan_001.pdf")],
        docente,
      );

      expect(ocrMock.extraerDatos).toHaveBeenCalledTimes(1);
      expect(vista.asignadas).toEqual([
        expect.objectContaining({
          nombreArchivo: "scan_001.pdf",
          matriculaId: "mat-EST001",
          asignacion: "automatica",
          metodoReconocimiento: "ocr",
        }),
      ]);
      expect(vista.sinReconocer).toHaveLength(0);
    });

    it("empareja por nombre completo vía OCR sin importar tildes ni orden", async () => {
      repository.listarDeSeccion.mockResolvedValue([
        { ...fila("EST002"), nombreCompleto: "Quispe López, María Fernanda" },
      ]);
      ocrMock.extraerDatos.mockResolvedValue({
        estrategia: "mistral",
        modelo: "mistral-ocr-latest",
        textoCrudo: "{}",
        datos: {
          codigoEstudiante: null,
          dni: null,
          nombreCompleto: "MARIA FERNANDA QUISPE LOPEZ",
        },
      });

      const vista = await serviceConOcr.vistaPrevia(
        SECCION,
        PERIODO,
        [pdf("documento.pdf")],
        docente,
      );

      expect(vista.asignadas).toHaveLength(1);
      expect(vista.asignadas[0].matriculaId).toBe("mat-EST002");
    });

    it("clasifica como otra_seccion si OCR identifica a un estudiante de otra sección", async () => {
      repository.listarDeSeccion.mockResolvedValue([fila("EST001")]);
      repository.listarCodigosOtrasSecciones.mockResolvedValue([
        {
          matriculaId: "mat-EST999",
          codigo: "EST999",
          numeroDocumento: "88776655",
          nombreCompleto: "Rojas Díaz, Lucía",
        },
      ]);
      ocrMock.extraerDatos.mockResolvedValue({
        estrategia: "mistral",
        modelo: "mistral-ocr-latest",
        textoCrudo: "{}",
        datos: { codigoEstudiante: "EST999", dni: "88776655", nombreCompleto: null },
      });

      const vista = await serviceConOcr.vistaPrevia(
        SECCION,
        PERIODO,
        [pdf("sin_codigo.pdf")],
        docente,
      );

      expect(vista.asignadas).toHaveLength(0);
      expect(vista.otraSeccion).toHaveLength(1);
      expect(vista.otraSeccion[0].nombreEstudiante).toBe("Rojas Díaz, Lucía");
    });

    it("deja el archivo en sinReconocer si el OCR falla, sin romper la carga", async () => {
      repository.listarDeSeccion.mockResolvedValue([fila("EST001")]);
      ocrMock.extraerDatos.mockRejectedValue(new Error("timeout OCR"));

      const vista = await serviceConOcr.vistaPrevia(
        SECCION,
        PERIODO,
        [pdf("scan_fallido.pdf")],
        docente,
      );

      expect(vista.asignadas).toHaveLength(0);
      expect(vista.sinReconocer).toHaveLength(1);
    });

    it("no llama a OCR si está deshabilitado", async () => {
      ocrMock.estaHabilitado.mockReturnValue(false);
      repository.listarDeSeccion.mockResolvedValue([fila("EST001")]);

      const vista = await serviceConOcr.vistaPrevia(
        SECCION,
        PERIODO,
        [pdf("scan_002.pdf")],
        docente,
      );

      expect(ocrMock.extraerDatos).not.toHaveBeenCalled();
      expect(vista.sinReconocer).toHaveLength(1);
    });

    it("publica correctamente un archivo reconocido por OCR sin asignación manual", async () => {
      repository.listarDeSeccion.mockResolvedValue([
        { ...fila("EST001"), numeroDocumento: "74125896" },
      ]);
      ocrMock.extraerDatos.mockResolvedValue({
        estrategia: "mistral",
        modelo: "mistral-ocr-latest",
        textoCrudo: "{}",
        datos: { codigoEstudiante: "EST001", dni: "74125896", nombreCompleto: null },
      });

      const resultado = await serviceConOcr.publicar(
        SECCION,
        PERIODO,
        [pdf("scan_001.pdf")],
        [],
        docente,
      );

      expect(resultado.cantidad).toBe(1);
      expect(repository.publicar).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            libretaId: "lib-EST001",
            asignacion: "automatica",
            codigoLeido: "EST001",
          }),
        ],
        docente.id,
      );
    });

    it("no repite OCR al publicar si el cliente reenvía la asignación resuelta con origen ocr", async () => {
      repository.listarDeSeccion.mockResolvedValue([fila("EST001")]);

      const resultado = await serviceConOcr.publicar(
        SECCION,
        PERIODO,
        [pdf("scan_001.pdf")],
        [{ nombreArchivo: "scan_001.pdf", matriculaId: "mat-EST001", origen: "ocr" }],
        docente,
      );

      expect(resultado.cantidad).toBe(1);
      expect(ocrMock.extraerDatos).not.toHaveBeenCalled();
      expect(repository.publicar).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            libretaId: "lib-EST001",
            asignacion: "automatica",
            codigoLeido: "EST001",
          }),
        ],
        docente.id,
      );
    });
  });
});
