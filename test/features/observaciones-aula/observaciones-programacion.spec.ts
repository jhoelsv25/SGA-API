import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import type { AnioLectivoCls } from "@/common/anio-lectivo";
import {
  ObservacionesProgramacionService,
  type ObservacionesAulaRepository,
} from "@/features/observaciones-aula";
import {
  comunSimulado,
  director,
  observacion,
  repositorioSimulado,
  subdirectora,
  type Mocks,
} from "./fixtures";

// «Hoy» es el lunes 10/05/2027 (bimestre II en curso). El jueves 20/05/2027 está a 10 días.
const dto = {
  docenteId: "doc-1",
  cursoSeccionId: "cs-1",
  fecha: "2027-05-20",
  observadorUsuarioId: "u-sub",
};

describe("RF-023 V1: cronograma de observaciones (HU1)", () => {
  let repo: Mocks<ObservacionesAulaRepository>;
  let service: ObservacionesProgramacionService;
  let notificaciones: ReturnType<typeof comunSimulado>["notificaciones"];
  let audit: ReturnType<typeof comunSimulado>["audit"];

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date("2027-05-10T12:00:00-05:00") });
    repo = repositorioSimulado();
    repo.obtener = jest.fn().mockResolvedValue(observacion());
    const { comun, notificaciones: n, audit: a } = comunSimulado(repo);
    notificaciones = n;
    audit = a;
    service = new ObservacionesProgramacionService(comun, {
      id: () => undefined,
    } as unknown as AnioLectivoCls);
  });
  afterEach(() => jest.useRealTimers());

  describe("programar", () => {
    it("crea la observación con el bloque del horario, avisa al docente y deja bitácora", async () => {
      const r = await service.programar(dto, director);
      expect(repo.crear).toHaveBeenCalledWith(
        expect.objectContaining({
          docenteId: "doc-1",
          horarioId: "hor-1",
          instrumentoId: "ins-1",
          periodoId: "per-2",
          horaInicio: "08:30:00",
          observadorUsuarioId: "u-sub",
        }),
      );
      expect(r.mensaje).toBe(
        "Observación programada para el 20/05/2027 a las 08:30. Se avisó al docente.",
      );
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "u-doc",
          enlaceUrl: expect.not.stringMatching(/obs-/) as string,
          mensaje: expect.stringContaining("Matemática") as string,
        }),
      );
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          mensaje: expect.stringContaining("Observador: Sara Rojas") as string,
        }),
      );
      expect(audit.log).toHaveBeenCalled();
    });

    it("el observador por defecto es quien programa", async () => {
      await service.programar({ ...dto, observadorUsuarioId: undefined }, subdirectora);
      expect(repo.crear).toHaveBeenCalledWith(
        expect.objectContaining({ observadorUsuarioId: "u-sub" }),
      );
    });

    it("exige la anticipación mínima (2 días por defecto)", async () => {
      await expect(service.programar({ ...dto, fecha: "2027-05-11" }, director)).rejects.toThrow(
        "La observación debe programarse con al menos 2 días de anticipación.",
      );
      expect(repo.crear).not.toHaveBeenCalled();
    });

    it("usa la anticipación configurada en la variable del sistema", async () => {
      repo.valoresVariables = jest
        .fn()
        .mockResolvedValue(new Map([["observacion.anticipacion_minima_dias", "15"]]));
      await expect(service.programar({ ...dto, fecha: "2027-05-20" }, director)).rejects.toThrow(
        "al menos 15 días",
      );
    });

    it("nadie observa su propia clase", async () => {
      repo.obtenerUsuario = jest
        .fn()
        .mockResolvedValue({ id: "u-doble", personaId: "p-doc", estado: "activo" });
      await expect(
        service.programar({ ...dto, observadorUsuarioId: "u-doble" }, director),
      ).rejects.toThrow("No puede observar su propia clase.");
    });

    it("rechaza un observador de la propia ficha aunque sea quien programa", async () => {
      const yo = { ...director, personaId: "p-doc" };
      await expect(
        service.programar({ ...dto, observadorUsuarioId: undefined }, yo),
      ).rejects.toThrow(BadRequestException);
    });

    it("rechaza un observador sin la opción «Observaciones de aula»", async () => {
      repo.usuarioTieneOpcion = jest.fn().mockResolvedValue(false);
      await expect(service.programar(dto, director)).rejects.toThrow(
        "no tiene la opción «Observaciones de aula»",
      );
    });

    it("rechaza el cruce con otra observación del mismo observador", async () => {
      repo.observacionesDelObservador = jest
        .fn()
        .mockResolvedValue([{ id: "otra", horaInicio: "08:30:00", horaFin: "10:00:00" }]);
      await expect(service.programar(dto, director)).rejects.toThrow(ConflictException);
      await expect(service.programar(dto, director)).rejects.toThrow(
        "El observador ya tiene una observación programada en ese horario.",
      );
    });

    it("bloquea el bimestre cerrado", async () => {
      repo.periodoDeFecha = jest
        .fn()
        .mockResolvedValue({ id: "per-1", estado: "cerrado", anioAcademicoId: "a", nombre: "I" });
      await expect(service.programar(dto, director)).rejects.toThrow(ForbiddenException);
      await expect(service.programar(dto, director)).rejects.toThrow(
        "El bimestre está cerrado. No se pueden programar ni modificar observaciones en él.",
      );
    });

    it("pide la hora cuando el curso tiene varios bloques ese día", async () => {
      repo.bloquesDelCurso = jest.fn().mockResolvedValue([
        { id: "h1", horaInicio: "08:30:00", horaFin: "09:15:00" },
        { id: "h2", horaInicio: "10:30:00", horaFin: "11:15:00" },
      ]);
      await expect(service.programar(dto, director)).rejects.toThrow("Indique la hora de inicio");
      await service.programar({ ...dto, horaInicio: "10:30" }, director);
      expect(repo.crear).toHaveBeenCalledWith(expect.objectContaining({ horarioId: "h2" }));
    });

    it("rechaza una fecha en que el docente no dicta el curso", async () => {
      repo.bloquesDelCurso = jest.fn().mockResolvedValue([]);
      await expect(service.programar(dto, director)).rejects.toThrow("no dicta ese curso");
    });

    it("rechaza un curso que no es del docente", async () => {
      repo.obtenerCursoSeccion = jest.fn().mockResolvedValue({ id: "cs-1", docenteId: "otro" });
      await expect(service.programar(dto, director)).rejects.toThrow(BadRequestException);
    });

    it("sin una versión vigente del instrumento no se programa", async () => {
      repo.instrumentoVigente = jest.fn().mockResolvedValue(null);
      await expect(service.programar(dto, director)).rejects.toThrow(
        "No hay una versión vigente del instrumento",
      );
    });

    it("la observación nueva usa la versión vigente del instrumento en ese momento", async () => {
      repo.instrumentoVigente = jest.fn().mockResolvedValue({ id: "ins-NUEVA" });
      await service.programar(dto, director);
      expect(repo.crear).toHaveBeenCalledWith(
        expect.objectContaining({ instrumentoId: "ins-NUEVA" }),
      );
    });
  });

  describe("reprogramar y cancelar", () => {
    it("reprograma con motivo: guarda el historial y avisa al docente", async () => {
      const r = await service.reprogramar(
        "obs-1",
        { fecha: "2027-05-27", motivo: "Paseo de la sección" },
        subdirectora,
      );
      expect(repo.registrarCambio).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: "reprogramacion",
          fechaAnterior: "2027-05-20",
          fechaNueva: "2027-05-27",
          motivo: "Paseo de la sección",
        }),
      );
      expect(repo.actualizar).toHaveBeenCalledWith(
        "obs-1",
        expect.objectContaining({ fecha: "2027-05-27" }),
      );
      expect(r.mensaje).toBe("Observación reprogramada para el 27/05/2027. Se avisó al docente.");
      expect(notificaciones.enviar).toHaveBeenCalled();
    });

    it("no reprograma ni cancela sin motivo", async () => {
      await expect(
        service.reprogramar("obs-1", { fecha: "2027-05-27", motivo: "  " }, subdirectora),
      ).rejects.toThrow("Indique el motivo.");
      await expect(service.cancelar("obs-1", { motivo: "" }, subdirectora)).rejects.toThrow(
        "Indique el motivo.",
      );
    });

    it("cancela con motivo y la observación queda en el historial", async () => {
      await service.cancelar("obs-1", { motivo: "Docente con descanso médico" }, subdirectora);
      expect(repo.actualizar).toHaveBeenCalledWith(
        "obs-1",
        expect.objectContaining({
          estado: "cancelada",
          motivoCancelacion: "Docente con descanso médico",
        }),
      );
      expect(repo.registrarCambio).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: "cancelacion" }),
      );
      expect(notificaciones.enviar).toHaveBeenCalled();
    });

    it("solo se reprograma o cancela una observación programada", async () => {
      repo.obtener = jest.fn().mockResolvedValue(observacion({ estado: "en_observacion" }));
      await expect(service.cancelar("obs-1", { motivo: "x" }, subdirectora)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("con el bimestre cerrado no se reprograma ni se cancela", async () => {
      repo.obtener = jest.fn().mockResolvedValue(observacion({ periodoEstado: "cerrado" }));
      await expect(service.cancelar("obs-1", { motivo: "x" }, subdirectora)).rejects.toThrow(
        "El bimestre está cerrado",
      );
      await expect(
        service.reprogramar("obs-1", { fecha: "2027-05-27", motivo: "x" }, subdirectora),
      ).rejects.toThrow("El bimestre está cerrado");
    });

    it("solo el observador asignado (o el Administrador) la modifica", async () => {
      await expect(service.cancelar("obs-1", { motivo: "x" }, director)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("el docente evaluado no participa aunque su cuenta tenga la opción", async () => {
      const mismoDocente = { ...subdirectora, personaId: "p-doc" };
      await expect(service.cancelar("obs-1", { motivo: "x" }, mismoDocente)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("reobservación", () => {
    it("crea una observación nueva enlazada a la retroalimentada", async () => {
      repo.obtener = jest
        .fn()
        .mockResolvedValue(
          observacion({ estado: "retroalimentada", observadorUsuarioId: "u-sub" }),
        );
      await service.programarReobservacion("obs-1", { fecha: "2027-06-17" }, subdirectora);
      expect(repo.crear).toHaveBeenCalledWith(
        expect.objectContaining({ observacionAnteriorId: "obs-1", docenteId: "doc-1" }),
      );
    });

    it("solo desde una observación retroalimentada", async () => {
      await expect(
        service.programarReobservacion("obs-1", { fecha: "2027-06-17" }, subdirectora),
      ).rejects.toThrow("aún no está retroalimentada");
    });
  });

  describe("listado y cobertura", () => {
    it("marca como vencida la programada cuya fecha ya pasó", async () => {
      repo.listar = jest
        .fn()
        .mockResolvedValue([
          observacion({ id: "a", fecha: "2027-05-03" }),
          observacion({ id: "b", fecha: "2027-05-20" }),
          observacion({ id: "c", fecha: "2027-05-03", estado: "cancelada" }),
        ]);
      const r = await service.listar({});
      expect(r.map((o) => o.vencida)).toEqual([true, false, false]);
    });

    it("cuenta realizadas, programadas y lo que falta para la meta", async () => {
      repo.docentesActivos = jest.fn().mockResolvedValue([
        { id: "doc-1", nombre: "Carlos Quispe" },
        { id: "doc-2", nombre: "Lucía Flores" },
      ]);
      repo.conteosPorDocente = jest.fn().mockResolvedValue([
        { docenteId: "doc-1", estado: "retroalimentada" },
        { docenteId: "doc-1", estado: "programada" },
        { docenteId: "doc-2", estado: "calificada" },
      ]);
      const r = await service.cronograma("anio-1");
      expect(r.meta).toBe(2);
      expect(r.docentes[0]).toMatchObject({
        realizadas: 1,
        programadas: 1,
        faltanParaMeta: 1,
        faltanPorProgramar: 0,
      });
      expect(r.docentes[1]).toMatchObject({ realizadas: 1, programadas: 0, faltanPorProgramar: 1 });
      expect(r.total).toEqual({ realizadas: 2, programadas: 1, meta: 4, porcentaje: 50 });
    });

    it("la meta sale de la variable del sistema", async () => {
      repo.valoresVariables = jest
        .fn()
        .mockResolvedValue(new Map([["observacion.cantidad_objetivo_anual", "3"]]));
      repo.docentesActivos = jest.fn().mockResolvedValue([{ id: "doc-1", nombre: "C" }]);
      const r = await service.cronograma("anio-1");
      expect(r.docentes[0].meta).toBe(3);
    });
  });
});
