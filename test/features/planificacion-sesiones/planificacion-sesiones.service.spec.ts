import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import {
  MENSAJES_PLANIFICACION,
  PlanificacionSesionesService,
  SupervisionPlanificacionService,
  type DatosGuardarPlanificacion,
  type GuardarPlanificacionDto,
} from "@/features/planificacion-sesiones";

const DOCENTE = "doc-1";
const actorDocente = { id: "u-1", roleId: "r", role: "Docente", personaId: "p-1" };
const supervisor = { id: "u-2", roleId: "r", role: "Subdirector", personaId: "p-2" };

// 2027-03-18 es jueves (día 4); el bloque dura 90 min.
const bloque = {
  horarioId: "h-1",
  cursoSeccionId: "cs-1",
  docenteId: DOCENTE,
  diaSemana: 4,
  horaInicio: "08:00:00",
  horaFin: "09:30:00",
  cursoNombre: "Educación Física",
  areaCurricular: "educacion_fisica",
  seccionNombre: "Única",
  gradoNumero: 1,
  gradoNombre: "1.° año",
};
const fila = (p: Record<string, unknown> = {}) => ({
  id: "pl-1",
  docenteId: DOCENTE,
  docentePersonaId: "p-1",
  docenteNombre: "José Candiotti",
  cursoSeccionId: "cs-1",
  horarioId: "h-1",
  sesionClaseId: null,
  fecha: "2027-03-18",
  numero: 1,
  unidad: null,
  titulo: "Juegos ancestrales",
  proposito: "Explora juegos",
  evidencia: "Ficha",
  criterios: ["c1"],
  instrumentoCodigo: null,
  competenciasTransversales: [],
  enfoques: [],
  materiales: {},
  referencias: [],
  estado: "borrador",
  copiadaDeId: null,
  actualizadoEn: "2027-03-17 10:00:00",
  ...p,
});
const dto = (p: Partial<GuardarPlanificacionDto> = {}): GuardarPlanificacionDto => ({
  horarioId: "h-1",
  fecha: "2027-03-18",
  titulo: "Juegos ancestrales",
  competencias: [
    {
      competenciaId: "c-1",
      capacidades: ["Comprende su cuerpo"],
      desempenos: [{ texto: "Adapta movimientos" }],
    },
  ],
  ...p,
});

function armar() {
  const repo = {
    docenteDePersona: jest.fn().mockResolvedValue({ id: DOCENTE, activo: true }),
    bloque: jest.fn().mockResolvedValue(bloque),
    periodoDeFecha: jest.fn().mockResolvedValue({ id: "pe-1", estado: "en_curso" }),
    planificacionDeBloque: jest.fn().mockResolvedValue(null),
    planificacion: jest.fn().mockResolvedValue(fila()),
    competenciasPorIds: jest
      .fn()
      .mockResolvedValue([
        { id: "c-1", nombre: "Se desenvuelve…", tipo: "area", areaCodigo: "educacion_fisica" },
      ]),
    desempenosPorIds: jest.fn().mockResolvedValue([]),
    guardar: jest.fn().mockResolvedValue("pl-1"),
    cambiarEstado: jest.fn().mockResolvedValue(undefined),
    competenciasDe: jest.fn().mockResolvedValue([]),
    momentosDe: jest.fn().mockResolvedValue([]),
    comentariosDe: jest.fn().mockResolvedValue([]),
    sesion: jest.fn(),
    agregarComentario: jest.fn().mockResolvedValue("co-1"),
    guardarVerificacion: jest.fn().mockResolvedValue(undefined),
    verificacionDeSesion: jest.fn().mockResolvedValue({ id: "v-1" }),
    usuarioDeDocente: jest.fn().mockResolvedValue("u-1"),
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const institucion = { get: jest.fn().mockResolvedValue({ nombre: "I.E.", director: "Dir" }) };
  const noti = { enviar: jest.fn().mockResolvedValue(undefined) };
  const service = new PlanificacionSesionesService(
    repo as never,
    audit as never,
    institucion as never,
  );
  const supervision = new SupervisionPlanificacionService(
    repo as never,
    service,
    audit as never,
    noti as never,
  );
  return { repo, audit, service, supervision, noti };
}

describe("RF-024 V1: planificar la sesión (docente)", () => {
  it("guarda como borrador y copia los textos del catálogo", async () => {
    const { service, repo } = armar();
    const r = await service.guardar(dto(), actorDocente);
    expect(r.mensaje).toBe(MENSAJES_PLANIFICACION.GUARDADA);
    const [datos] = repo.guardar.mock.calls[0] as [DatosGuardarPlanificacion];
    expect(datos.estado).toBe("borrador");
    expect(datos.competencias[0].competenciaTexto).toBe("Se desenvuelve…");
  });

  it("permite planificar en cualquier momento para una fecha futura", async () => {
    const { service, repo } = armar();
    await service.guardar(dto(), actorDocente);
    expect(repo.guardar).toHaveBeenCalled();
  });

  it("rechaza un bloque de otro docente", async () => {
    const { service, repo } = armar();
    repo.bloque.mockResolvedValue({ ...bloque, docenteId: "otro" });
    await expect(service.guardar(dto(), actorDocente)).rejects.toThrow(ForbiddenException);
  });

  it("rechaza si el usuario no es docente activo", async () => {
    const { service, repo } = armar();
    repo.docenteDePersona.mockResolvedValue(null);
    await expect(service.guardar(dto(), actorDocente)).rejects.toThrow(ForbiddenException);
  });

  it("rechaza una fecha que no es el día del bloque", async () => {
    const { service } = armar();
    await expect(service.guardar(dto({ fecha: "2027-03-17" }), actorDocente)).rejects.toThrow(
      MENSAJES_PLANIFICACION.DIA_NO_COINCIDE,
    );
  });

  it("no modifica una planificación ejecutada", async () => {
    const { service, repo } = armar();
    repo.planificacionDeBloque.mockResolvedValue(fila({ estado: "ejecutada" }));
    await expect(service.guardar(dto(), actorDocente)).rejects.toThrow(ConflictException);
  });

  it("no modifica con el bimestre cerrado", async () => {
    const { service, repo } = armar();
    repo.periodoDeFecha.mockResolvedValue({ id: "pe-1", estado: "cerrado" });
    await expect(service.guardar(dto(), actorDocente)).rejects.toThrow(
      MENSAJES_PLANIFICACION.BIMESTRE_CERRADO,
    );
  });

  it("rechaza una competencia de otra área", async () => {
    const { service, repo } = armar();
    repo.competenciasPorIds.mockResolvedValue([
      { id: "c-1", nombre: "Resuelve", tipo: "area", areaCodigo: "matematica" },
    ]);
    await expect(service.guardar(dto(), actorDocente)).rejects.toThrow(BadRequestException);
  });

  it("rechaza momentos repetidos", async () => {
    const { service } = armar();
    await expect(
      service.guardar(
        dto({
          momentos: [
            { momento: "inicio", minutos: 10 },
            { momento: "inicio", minutos: 10 },
          ],
        }),
        actorDocente,
      ),
    ).rejects.toThrow(MENSAJES_PLANIFICACION.MOMENTOS_REPETIDOS);
  });

  it("no la deja lista si los tiempos no cuadran", async () => {
    const { service, repo } = armar();
    repo.bloque.mockResolvedValue(bloque);
    repo.competenciasDe.mockResolvedValue([
      {
        orden: 1,
        competenciaId: "c-1",
        competenciaTexto: "x",
        capacidades: [],
        desempenos: [{ texto: "d" }],
        campoTematico: null,
      },
    ]);
    repo.momentosDe.mockResolvedValue([
      { momento: "inicio", actividades: "a", minutos: 15 },
      { momento: "desarrollo", actividades: "b", minutos: 45 },
      { momento: "cierre", actividades: "c", minutos: 10 },
    ]);
    await expect(service.marcarLista("pl-1", actorDocente)).rejects.toThrow(BadRequestException);
    expect(repo.cambiarEstado).not.toHaveBeenCalled();
  });

  it("la deja lista cuando está completa", async () => {
    const { service, repo } = armar();
    repo.competenciasDe.mockResolvedValue([
      {
        orden: 1,
        competenciaId: "c-1",
        competenciaTexto: "x",
        capacidades: [],
        desempenos: [{ texto: "d" }],
        campoTematico: null,
      },
    ]);
    repo.momentosDe.mockResolvedValue([
      { momento: "inicio", actividades: "a", minutos: 15 },
      { momento: "desarrollo", actividades: "b", minutos: 65 },
      { momento: "cierre", actividades: "c", minutos: 10 },
    ]);
    const r = await service.marcarLista("pl-1", actorDocente);
    expect(r.mensaje).toBe(MENSAJES_PLANIFICACION.LISTA);
    expect(repo.cambiarEstado).toHaveBeenCalledWith("pl-1", "lista");
  });

  it("copia solo a bloques del mismo grado y área", async () => {
    const { service, repo } = armar();
    repo.bloque.mockImplementation((id: string) =>
      Promise.resolve(
        id === "h-1" ? bloque : { ...bloque, horarioId: "h-2", areaCurricular: "matematica" },
      ),
    );
    await expect(
      service.copiar(
        "pl-1",
        { destinos: [{ horarioId: "h-2", fecha: "2027-03-18" }] },
        actorDocente,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("copia a otra fecha como borrador", async () => {
    const { service, repo } = armar();
    const r = await service.copiar(
      "pl-1",
      { destinos: [{ horarioId: "h-1", fecha: "2027-03-25" }] },
      actorDocente,
    );
    expect(r.mensaje).toBe(MENSAJES_PLANIFICACION.COPIA_HECHA(1));
    expect((repo.guardar.mock.calls[0] as [DatosGuardarPlanificacion])[0]).toMatchObject({
      estado: "borrador",
      copiadaDeId: "pl-1",
    });
  });

  it("al firmar, la planificación del bloque pasa a ejecutada y queda ligada a la sesión", async () => {
    const { service, repo } = armar();
    repo.sesion.mockResolvedValue({ id: "s-1", horarioId: "h-1", fecha: "2027-03-18" });
    repo.planificacionDeBloque.mockResolvedValue(fila({ estado: "lista" }));
    await service.vincularConSesion("s-1");
    expect(repo.cambiarEstado).toHaveBeenCalledWith("pl-1", "ejecutada", "s-1");
  });

  it("al firmar sin planificación no hace nada", async () => {
    const { service, repo } = armar();
    repo.sesion.mockResolvedValue({ id: "s-1", horarioId: "h-1", fecha: "2027-03-18" });
    await service.vincularConSesion("s-1");
    expect(repo.cambiarEstado).not.toHaveBeenCalled();
  });
});

describe("RF-024 V1: supervisión (solo ver, comentar y horas reales)", () => {
  it("comenta y avisa al docente", async () => {
    const { supervision, repo, noti } = armar();
    const r = await supervision.comentar("pl-1", " Buen trabajo ", supervisor);
    expect(r.mensaje).toBe(MENSAJES_PLANIFICACION.COMENTARIO_ENVIADO);
    expect(repo.agregarComentario).toHaveBeenCalledWith("pl-1", "u-2", "Buen trabajo");
    expect(noti.enviar).toHaveBeenCalled();
  });

  it("un fallo del aviso no deshace el comentario", async () => {
    const { supervision, noti } = armar();
    noti.enviar.mockRejectedValue(new Error("cola caída"));
    await expect(supervision.comentar("pl-1", "ok", supervisor)).resolves.toBeDefined();
  });

  it("nadie comenta su propia planificación", async () => {
    const { supervision } = armar();
    await expect(supervision.comentar("pl-1", "ok", actorDocente)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("registra las horas reales en el aula", async () => {
    const { supervision, repo } = armar();
    repo.sesion.mockResolvedValue({ id: "s-1" });
    await supervision.registrarHorasReales(
      "s-1",
      { enAula: true, horaInicio: "08:10", horaFin: "09:00" },
      supervisor,
    );
    expect(repo.guardarVerificacion).toHaveBeenCalledWith("s-1", {
      enAula: true,
      horaInicio: "08:10",
      horaFin: "09:00",
      observacion: null,
      usuarioId: "u-2",
    });
  });

  it("«no estuvo en el aula» no exige horas", async () => {
    const { supervision, repo } = armar();
    repo.sesion.mockResolvedValue({ id: "s-1" });
    await supervision.registrarHorasReales(
      "s-1",
      { enAula: false, observacion: "Ausente" },
      supervisor,
    );
    expect(repo.guardarVerificacion).toHaveBeenCalledWith(
      "s-1",
      expect.objectContaining({ enAula: false, horaInicio: null, horaFin: null }),
    );
  });

  it("exige hora de inicio y fin cuando estuvo en el aula, y que fin sea posterior", async () => {
    const { supervision, repo } = armar();
    repo.sesion.mockResolvedValue({ id: "s-1" });
    await expect(
      supervision.registrarHorasReales("s-1", { enAula: true, horaInicio: "08:10" }, supervisor),
    ).rejects.toThrow(MENSAJES_PLANIFICACION.HORAS_FALTAN);
    await expect(
      supervision.registrarHorasReales(
        "s-1",
        { enAula: true, horaInicio: "09:00", horaFin: "08:10" },
        supervisor,
      ),
    ).rejects.toThrow(MENSAJES_PLANIFICACION.HORAS_INVALIDAS);
  });
});
