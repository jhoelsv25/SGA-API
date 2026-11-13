import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import {
  ObservacionesEjecucionService,
  type ObservacionesAulaRepository,
} from "@/features/observaciones-aula";
import {
  calificacion,
  comunSimulado,
  compromiso,
  director,
  docente,
  observacion,
  repositorioSimulado,
  subdirectora,
  type Mocks,
} from "./fixtures";

describe("RF-023 V1: notas, calificación, retroalimentación y seguimiento (HU2 a HU5)", () => {
  let repo: Mocks<ObservacionesAulaRepository>;
  let service: ObservacionesEjecucionService;
  let notificaciones: ReturnType<typeof comunSimulado>["notificaciones"];
  let audit: ReturnType<typeof comunSimulado>["audit"];

  const conEstado = (estado: Parameters<typeof observacion>[0] = {}) => {
    repo.obtener = jest.fn().mockResolvedValue(observacion(estado));
  };

  beforeEach(() => {
    // Jueves 20/05/2027, día de la observación.
    jest.useFakeTimers({ now: new Date("2027-05-20T08:00:00-05:00") });
    repo = repositorioSimulado();
    const c = comunSimulado(repo);
    notificaciones = c.notificaciones;
    audit = c.audit;
    service = new ObservacionesEjecucionService(c.comun);
  });
  afterEach(() => jest.useRealTimers());

  describe("HU2: ficha de toma de notas", () => {
    it("inicia el día programado: pasa a en_observacion y entrega la ficha con los 5 desempeños", async () => {
      const r = await service.iniciar(
        "obs-1",
        { horaInicio: "08:32", estudiantesPresentes: 16 },
        subdirectora,
      );
      expect(repo.actualizar).toHaveBeenCalledWith("obs-1", {
        estado: "en_observacion",
        horaInicioReal: "08:32",
        estudiantesPresentes: 16,
      });
      expect(r.fichaDeNotas).toHaveLength(5);
    });

    it("no inicia otro día ni con el bimestre cerrado", async () => {
      conEstado({ fecha: "2027-05-21" });
      await expect(
        service.iniciar("obs-1", { horaInicio: "08:32", estudiantesPresentes: 16 }, subdirectora),
      ).rejects.toThrow("Solo se puede iniciar la observación el día programado.");
      conEstado({ periodoEstado: "cerrado" });
      await expect(
        service.iniciar("obs-1", { horaInicio: "08:32", estudiantesPresentes: 16 }, subdirectora),
      ).rejects.toThrow("El bimestre está cerrado");
    });

    it("guarda varias notas por desempeño mientras está en observación", async () => {
      conEstado({ estado: "en_observacion" });
      await service.registrarNota(
        "obs-1",
        { desempeno: 1, texto: "De 16 estudiantes, 12 realizan la actividad con afán" },
        subdirectora,
      );
      await service.registrarNota(
        "obs-1",
        { desempeno: 1, texto: "2 juegan con una pelota" },
        subdirectora,
      );
      expect(repo.agregarNota).toHaveBeenCalledTimes(2);
    });

    it("rechaza una nota vacía o que califica", async () => {
      conEstado({ estado: "en_observacion" });
      const mensaje = "Escriba la conducta observada. No se aceptan calificaciones en las notas.";
      await expect(
        service.registrarNota("obs-1", { desempeno: 1, texto: "   " }, subdirectora),
      ).rejects.toThrow(mensaje);
      await expect(
        service.registrarNota(
          "obs-1",
          { desempeno: 1, texto: "Alcanza el nivel III" },
          subdirectora,
        ),
      ).rejects.toThrow(mensaje);
      expect(repo.agregarNota).not.toHaveBeenCalled();
    });

    it("rechaza un desempeño fuera de 1 a 5", async () => {
      conEstado({ estado: "en_observacion" });
      await expect(
        service.registrarNota("obs-1", { desempeno: 6, texto: "x" }, subdirectora),
      ).rejects.toThrow("El desempeño debe estar entre 1 y 5.");
    });

    it("no admite notas fuera de la etapa de toma de notas", async () => {
      conEstado({ estado: "notas_cerradas" });
      await expect(
        service.registrarNota("obs-1", { desempeno: 1, texto: "algo" }, subdirectora),
      ).rejects.toThrow("La toma de notas no está abierta.");
    });

    it("no admite notas con el bimestre cerrado", async () => {
      conEstado({ estado: "en_observacion", periodoEstado: "cerrado" });
      await expect(
        service.registrarNota("obs-1", { desempeno: 1, texto: "algo" }, subdirectora),
      ).rejects.toThrow("El bimestre está cerrado");
    });

    it("cierra la toma de notas calculando los minutos (53)", async () => {
      conEstado({ estado: "en_observacion", horaInicioReal: "08:32:00" });
      const r = await service.cerrarNotas("obs-1", { horaFin: "09:25" }, subdirectora);
      expect(repo.cerrarNotas).toHaveBeenCalledWith("obs-1", "09:25", 53);
      expect(r.mensaje).toBe("Toma de notas cerrada. Ya puede calificar la observación.");
      expect(r.advertenciaDuracion).toBeNull();
    });

    it("avisa si la duración es atípica y deja confirmar", async () => {
      conEstado({ estado: "en_observacion", horaInicioReal: "08:30:00" });
      await expect(
        service.cerrarNotas("obs-1", { horaFin: "09:00" }, subdirectora),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.cerrarNotas("obs-1", { horaFin: "09:00" }, subdirectora),
      ).rejects.toThrow("La observación duró 30 minutos; lo habitual es entre 45 y 90.");
      expect(repo.cerrarNotas).not.toHaveBeenCalled();
      const r = await service.cerrarNotas(
        "obs-1",
        { horaFin: "09:00", confirmarDuracion: true },
        subdirectora,
      );
      expect(repo.cerrarNotas).toHaveBeenCalledWith("obs-1", "09:00", 30);
      expect(r.advertenciaDuracion).toContain("30 minutos");
    });

    it("rechaza una hora de fin anterior al inicio", async () => {
      conEstado({ estado: "en_observacion", horaInicioReal: "08:32:00" });
      await expect(
        service.cerrarNotas("obs-1", { horaFin: "08:00" }, subdirectora),
      ).rejects.toThrow("La hora de fin debe ser posterior");
    });
  });

  describe("HU3: calificación", () => {
    it("no habilita calificar antes de cerrar la toma de notas", async () => {
      conEstado({ estado: "en_observacion" });
      await expect(
        service.calificar("obs-1", 1, { nivel: 3, fundamento: "x" }, subdirectora),
      ).rejects.toThrow("Cierre la toma de notas para poder calificar.");
      await expect(service.fichaCalificacion("obs-1", subdirectora)).rejects.toThrow(
        "Cierre la toma de notas para poder calificar.",
      );
    });

    it("el docente evaluado no abre la calificación", async () => {
      conEstado({ estado: "notas_cerradas" });
      await expect(service.fichaCalificacion("obs-1", docente)).rejects.toThrow(ForbiddenException);
    });

    it("muestra la descripción del nivel y las notas del desempeño", async () => {
      conEstado({ estado: "notas_cerradas" });
      repo.notas = jest
        .fn()
        .mockResolvedValue([
          { id: "n1", observacionId: "obs-1", desempeno: 3, texto: "monitorea 20 min" },
        ]);
      repo.calificacionesVigentes = jest.fn().mockResolvedValue([calificacion(3, 3)]);
      const r = await service.calificar(
        "obs-1",
        3,
        { nivel: 3, fundamento: "Monitorea más del 25 % y da retroalimentación descriptiva" },
        subdirectora,
      );
      expect(r.calificacion).toMatchObject({
        nivelRomano: "III",
        grupo: "satisfactorio",
        descripcionNivel: "Descripción nivel 3",
      });
      expect(r.notas).toHaveLength(1);
      expect(r.advertencia).toBeNull();
    });

    it("exige el fundamento", async () => {
      conEstado({ estado: "notas_cerradas" });
      await expect(
        service.calificar("obs-1", 4, { nivel: 2, fundamento: "  " }, subdirectora),
      ).rejects.toThrow("Explique el fundamento del nivel con base en las notas.");
      expect(repo.guardarBorrador).not.toHaveBeenCalled();
    });

    it("avisa que no hay evidencias pero guarda con el fundamento", async () => {
      conEstado({ estado: "notas_cerradas" });
      repo.calificacionesVigentes = jest.fn().mockResolvedValue([calificacion(5, 2)]);
      const r = await service.calificar(
        "obs-1",
        5,
        { nivel: 2, fundamento: "No hubo situaciones de conducta que observar" },
        subdirectora,
      );
      expect(repo.guardarBorrador).toHaveBeenCalledWith(
        "obs-1",
        5,
        2,
        "No hubo situaciones de conducta que observar",
        "u-sub",
      );
      expect(r.advertencia).toBe(
        "No hay notas en este desempeño; se requiere el fundamento de todas formas.",
      );
    });

    it("no cierra la calificación con menos de 5 desempeños", async () => {
      conEstado({ estado: "notas_cerradas" });
      repo.calificacionesVigentes = jest
        .fn()
        .mockResolvedValue([1, 2, 3, 4].map((n) => calificacion(n, 3)));
      await expect(service.cerrarCalificacion("obs-1", subdirectora)).rejects.toThrow(
        "Califique los 5 desempeños para cerrar la calificación.",
      );
    });

    it("cierra la calificación: pasa a calificada y resume los 5 niveles sin nota global", async () => {
      conEstado({ estado: "notas_cerradas" });
      repo.calificacionesVigentes = jest
        .fn()
        .mockResolvedValue([1, 2, 3, 4, 5].map((n) => calificacion(n, n <= 2 ? 2 : 3)));
      const r = await service.cerrarCalificacion("obs-1", subdirectora);
      expect(repo.actualizar).toHaveBeenCalledWith(
        "obs-1",
        expect.objectContaining({ estado: "calificada" }),
      );
      expect(r.resumen.map((x) => x.grupo)).toEqual([
        "insatisfactorio",
        "insatisfactorio",
        "satisfactorio",
        "satisfactorio",
        "satisfactorio",
      ]);
      expect(r).not.toHaveProperty("puntaje");
    });

    it("una calificación cerrada solo la corrige el Director", async () => {
      conEstado({ estado: "calificada" });
      await expect(
        service.calificar("obs-1", 2, { nivel: 3, fundamento: "x" }, subdirectora),
      ).rejects.toThrow("La calificación ya está cerrada");
      await expect(
        service.corregirCalificacion("obs-1", 2, { nivel: 3, motivo: "x" }, subdirectora),
      ).rejects.toThrow("Solo el Director puede corregir esta etapa.");
    });

    it("la corrección crea la versión 2 y no avisa al docente si aún no la ve", async () => {
      conEstado({ estado: "calificada" });
      repo.calificacionesVigentes = jest.fn().mockResolvedValue([calificacion(2, 2)]);
      const r = await service.corregirCalificacion(
        "obs-1",
        2,
        { nivel: 3, motivo: "Faltaba considerar la nota 3" },
        director,
      );
      expect(repo.nuevaVersionCalificacion).toHaveBeenCalledWith(
        expect.objectContaining({ desempeno: 2 }),
        { nivel: 3, fundamento: "Según las notas" },
        "Faltaba considerar la nota 3",
        "u-dir",
      );
      expect(r.mensaje).toBe("Se generó la versión 2 de la calificación.");
      expect(notificaciones.enviar).not.toHaveBeenCalled();
    });

    it("la corrección sin motivo se rechaza", async () => {
      conEstado({ estado: "calificada" });
      await expect(
        service.corregirCalificacion("obs-1", 2, { nivel: 3, motivo: " " }, director),
      ).rejects.toThrow("Indique el motivo del cambio.");
    });

    it("avisa al docente si la observación ya era visible para él", async () => {
      conEstado({ estado: "retroalimentada" });
      repo.calificacionesVigentes = jest.fn().mockResolvedValue([calificacion(2, 2)]);
      await service.corregirCalificacion("obs-1", 2, { nivel: 4, motivo: "Error" }, director);
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: "u-doc" }),
      );
    });

    it("el Director evaluado (con ficha de docente) no corrige su propia observación", async () => {
      conEstado({ estado: "calificada", docentePersonaId: "p-dir" });
      await expect(
        service.corregirCalificacion("obs-1", 2, { nivel: 3, motivo: "x" }, director),
      ).rejects.toThrow(ForbiddenException);
    });

    it("la corrección sin cambios se rechaza", async () => {
      conEstado({ estado: "calificada" });
      repo.calificacionesVigentes = jest.fn().mockResolvedValue([calificacion(2, 2)]);
      await expect(
        service.corregirCalificacion("obs-1", 2, { nivel: 2, motivo: "x" }, director),
      ).rejects.toThrow("No hay cambios que guardar.");
    });

    it("el cierre del bimestre no impide completar la calificación (P-69)", async () => {
      conEstado({ estado: "notas_cerradas", periodoEstado: "cerrado" });
      await expect(
        service.calificar("obs-1", 1, { nivel: 3, fundamento: "ok" }, subdirectora),
      ).resolves.toBeDefined();
    });
  });

  describe("HU4: retroalimentación y compromisos", () => {
    it("registra la reunión sobre una observación calificada", async () => {
      conEstado({ estado: "calificada" });
      await service.registrarReunion(
        "obs-1",
        { fecha: "2027-05-21", horaInicio: "10:00", horaFin: "10:30", resumen: " Se dialogó " },
        subdirectora,
      );
      expect(repo.actualizar).toHaveBeenCalledWith("obs-1", {
        retroFecha: "2027-05-21",
        retroHoraInicio: "10:00",
        retroHoraFin: "10:30",
        retroResumen: "Se dialogó",
      });
    });

    it("no agrega compromisos sin reunión", async () => {
      conEstado({ estado: "calificada", retroFecha: null });
      await expect(
        service.agregarCompromiso(
          "obs-1",
          { desempeno: 3, descripcion: "Usar preguntas", fechaRevision: "2027-06-30" },
          subdirectora,
        ),
      ).rejects.toThrow("Registre la reunión antes de agregar compromisos.");
    });

    it("guarda el compromiso pendiente cuando la fecha es posterior a la reunión", async () => {
      conEstado({ estado: "calificada", retroFecha: "2027-05-21" });
      await service.agregarCompromiso(
        "obs-1",
        { desempeno: 3, descripcion: " Usar preguntas ", fechaRevision: "2027-06-30" },
        subdirectora,
      );
      expect(repo.crearCompromiso).toHaveBeenCalledWith(
        expect.objectContaining({ descripcion: "Usar preguntas", desempeno: 3 }),
      );
    });

    it("rechaza el compromiso incompleto o con revisión anterior a la reunión", async () => {
      conEstado({ estado: "calificada", retroFecha: "2027-05-21" });
      await expect(
        service.agregarCompromiso(
          "obs-1",
          { desempeno: 3, descripcion: "  ", fechaRevision: "2027-06-30" },
          subdirectora,
        ),
      ).rejects.toThrow("Indique el desempeño, el compromiso y la fecha de revisión.");
      await expect(
        service.agregarCompromiso(
          "obs-1",
          { desempeno: 3, descripcion: "Algo", fechaRevision: "2027-05-10" },
          subdirectora,
        ),
      ).rejects.toThrow("La fecha de revisión debe ser posterior a la reunión.");
    });

    it("no cierra sin compromisos si hay desempeños bajo el nivel IV", async () => {
      conEstado({ estado: "calificada", retroFecha: "2027-05-21" });
      repo.calificacionesVigentes = jest
        .fn()
        .mockResolvedValue([1, 2, 3, 4, 5].map((n) => calificacion(n, n === 3 ? 3 : 4)));
      await expect(
        service.cerrarRetroalimentacion("obs-1", { sinCompromisos: true }, subdirectora),
      ).rejects.toThrow("Agregue al menos un compromiso");
    });

    it("permite cerrar sin compromisos cuando todo está en nivel IV y se confirma", async () => {
      conEstado({ estado: "calificada", retroFecha: "2027-05-21" });
      repo.calificacionesVigentes = jest
        .fn()
        .mockResolvedValue([1, 2, 3, 4, 5].map((n) => calificacion(n, 4)));
      await expect(
        service.cerrarRetroalimentacion("obs-1", { sinCompromisos: true }, subdirectora),
      ).resolves.toBeDefined();
      await expect(service.cerrarRetroalimentacion("obs-1", {}, subdirectora)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("cierra la retroalimentación: retroalimentada, avisa al docente y muestra el mensaje", async () => {
      conEstado({ estado: "calificada", retroFecha: "2027-05-21" });
      repo.compromisosVigentes = jest.fn().mockResolvedValue([compromiso()]);
      const r = await service.cerrarRetroalimentacion("obs-1", {}, subdirectora);
      expect(repo.actualizar).toHaveBeenCalledWith(
        "obs-1",
        expect.objectContaining({ estado: "retroalimentada" }),
      );
      expect(r.mensaje).toBe(
        "Retroalimentación registrada. El docente ya puede ver su observación.",
      );
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "u-doc",
          enlaceUrl: expect.stringMatching(/\/obs-1$/) as string,
        }),
      );
    });

    it("el director corrige un compromiso retroalimentado con motivo: versión nueva y aviso", async () => {
      conEstado({ estado: "retroalimentada", retroFecha: "2027-05-21" });
      await service.corregirCompromiso(
        "obs-1",
        "comp-1",
        { descripcion: "Redacción precisa", motivo: "Precisión de la redacción" },
        director,
      );
      expect(repo.nuevaVersionCompromiso).toHaveBeenCalledWith(
        expect.objectContaining({ compromisoId: "comp-1" }),
        expect.objectContaining({ descripcion: "Redacción precisa" }),
        "Precisión de la redacción",
        "u-dir",
      );
      expect(notificaciones.enviar).toHaveBeenCalled();
    });

    it("corregir un compromiso retroalimentado exige motivo y ser Director", async () => {
      conEstado({ estado: "retroalimentada", retroFecha: "2027-05-21" });
      await expect(
        service.corregirCompromiso("obs-1", "comp-1", { descripcion: "Otro" }, director),
      ).rejects.toThrow("Indique el motivo del cambio.");
      await expect(
        service.corregirCompromiso(
          "obs-1",
          "comp-1",
          { descripcion: "Otro", motivo: "x" },
          subdirectora,
        ),
      ).rejects.toThrow("Solo el Director");
    });

    it("antes de cerrar la retroalimentación el observador edita el compromiso sin versión", async () => {
      conEstado({ estado: "calificada", retroFecha: "2027-05-21" });
      await service.corregirCompromiso(
        "obs-1",
        "comp-1",
        { descripcion: "Nuevo texto" },
        subdirectora,
      );
      expect(repo.editarCompromisoEnSitio).toHaveBeenCalledWith(
        "fila-comp-1",
        "Nuevo texto",
        "2027-06-30",
      );
      expect(repo.nuevaVersionCompromiso).not.toHaveBeenCalled();
    });

    describe("archivo firmado", () => {
      const archivo = (mimetype: string, size = 1000) =>
        ({
          mimetype,
          size,
          buffer: Buffer.from("x"),
          originalname: "firmado",
        }) as Express.Multer.File;

      it("rechaza un archivo de otro tipo o de más de 5 MB", async () => {
        conEstado({ estado: "retroalimentada" });
        const mensaje = "El archivo debe ser PDF, PNG o JPG de hasta 5 MB.";
        await expect(
          service.subirArchivoFirmado("obs-1", archivo("application/zip"), subdirectora),
        ).rejects.toThrow(mensaje);
        await expect(
          service.subirArchivoFirmado(
            "obs-1",
            archivo("application/pdf", 6 * 1024 * 1024),
            subdirectora,
          ),
        ).rejects.toThrow(mensaje);
        await expect(service.subirArchivoFirmado("obs-1", undefined, subdirectora)).rejects.toThrow(
          mensaje,
        );
      });

      it("solo se sube a una observación retroalimentada", async () => {
        conEstado({ estado: "calificada" });
        await expect(
          service.subirArchivoFirmado("obs-1", archivo("application/pdf"), subdirectora),
        ).rejects.toThrow("aún no está retroalimentada");
      });
    });
  });

  describe("HU5: seguimiento", () => {
    it("marca un compromiso como cumplido aunque el bimestre esté cerrado", async () => {
      conEstado({ periodoEstado: "cerrado", estado: "retroalimentada" });
      const r = await service.cerrarCompromiso(
        "comp-1",
        { resultado: "cumplido", observacion: "Se vio en la clase del 28/04" },
        subdirectora,
      );
      expect(repo.cerrarCompromiso).toHaveBeenCalledWith(
        "fila-comp-1",
        "cumplido",
        "Se vio en la clase del 28/04",
        "u-sub",
      );
      expect(r.mensaje).toBe("Compromiso marcado como cumplido.");
      expect(r.sugerirReobservacion).toBe(false);
    });

    it("al marcar no cumplido sugiere la reobservación", async () => {
      conEstado({ estado: "retroalimentada" });
      const r = await service.cerrarCompromiso(
        "comp-1",
        { resultado: "no_cumplido", observacion: "No se evidenció" },
        director,
      );
      expect(r.sugerirReobservacion).toBe(true);
    });

    it("exige la observación y no vuelve a cerrar uno cerrado", async () => {
      conEstado({ estado: "retroalimentada" });
      await expect(
        service.cerrarCompromiso("comp-1", { resultado: "cumplido", observacion: " " }, director),
      ).rejects.toThrow("Indique el motivo.");
      repo.compromisoVigente = jest.fn().mockResolvedValue(compromiso({ estado: "cumplido" }));
      await expect(
        service.cerrarCompromiso("comp-1", { resultado: "cumplido", observacion: "x" }, director),
      ).rejects.toThrow(ConflictException);
    });

    it("el docente evaluado no cierra sus propios compromisos", async () => {
      conEstado({ estado: "retroalimentada" });
      await expect(
        service.cerrarCompromiso("comp-1", { resultado: "cumplido", observacion: "x" }, docente),
      ).rejects.toThrow(ForbiddenException);
    });

    describe("recordatorio de la fecha de revisión", () => {
      const pendiente = {
        ...compromiso(),
        docenteApellido: "Quispe",
        docenteNombre: "Carlos Quispe",
        observadorUsuarioId: "u-sub",
        docenteId: "doc-1",
      };

      it("avisa al observador y a quien tenga la opción, una sola notificación por persona", async () => {
        repo.compromisosPorRevisar = jest.fn().mockResolvedValue([pendiente]);
        const enviados = await service.recordarRevisiones("2027-06-30");
        // u-sub es el observador y también tiene la opción: se cuenta una vez.
        expect(enviados).toBe(2);
        const destinatarios = notificaciones.enviar?.mock.calls.map(
          (c: Array<{ usuarioId: string }>) => c[0].usuarioId,
        );
        expect(destinatarios?.sort()).toEqual(["u-dir", "u-sub"]);
      });

      it("no repite el aviso del mismo compromiso y fecha", async () => {
        repo.compromisosPorRevisar = jest.fn().mockResolvedValue([pendiente]);
        repo.registrarAlertaEnviada = jest.fn().mockResolvedValue(false);
        expect(await service.recordarRevisiones("2027-06-30")).toBe(0);
        expect(notificaciones.enviar).not.toHaveBeenCalled();
      });

      it("lista los seguimientos por revisar marcando los vencidos", async () => {
        repo.compromisosPorRevisar = jest
          .fn()
          .mockResolvedValue([{ ...pendiente, fechaRevision: "2027-05-01" }]);
        const r = await service.seguimientosPorRevisar();
        expect(r[0].vencido).toBe(true);
      });
    });
  });

  it("deja bitácora de las acciones relevantes", async () => {
    conEstado({ estado: "en_observacion" });
    await service.registrarNota(
      "obs-1",
      { desempeno: 2, texto: "Los estudiantes preguntan" },
      subdirectora,
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ tabla: "observaciones_aula_notas", accion: "crear" }),
    );
  });
});
