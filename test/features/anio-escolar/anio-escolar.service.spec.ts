import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuditService } from "@/common/services/audit.service";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import { RolePermissionsService } from "@/common/services/role-permissions.service";
import { MENSAJES } from "@/features/anio-escolar/constants";
import { AniosAcademicosService } from "@/features/anio-escolar/anios.service";
import { CalendarioService } from "@/features/anio-escolar/calendario.service";
import {
  AnioPersistido,
  BimestrePersistido,
  EventoPersistido,
} from "@/features/anio-escolar/interfaces";
import { AniosAcademicosRepository } from "@/features/anio-escolar/repositories/anios.repository";
import { CalendarioRepository } from "@/features/anio-escolar/repositories/calendario.repository";
import type { ExecutionContext } from "@nestjs/common";

const ACTOR = "admin-1";

const FECHAS = [
  ["2027-03-01", "2027-05-09"],
  ["2027-05-10", "2027-07-16"],
  ["2027-08-02", "2027-10-01"],
  ["2027-10-04", "2027-12-17"],
] as const;

function bimestre(
  numero: 1 | 2 | 3 | 4,
  estado: BimestrePersistido["estado"] = "planificado",
  fechas?: readonly [string, string],
): BimestrePersistido {
  const rango = fechas ?? FECHAS[numero - 1];
  return {
    id: `bim-${numero}`,
    anioAcademicoId: "anio-2027",
    numero,
    nombre: ["I", "II", "III", "IV"][numero - 1],
    fechaInicio: rango[0],
    fechaFin: rango[1],
    estado,
  };
}

function anio(parcial: Partial<AnioPersistido> = {}): AnioPersistido {
  return {
    id: "anio-2027",
    anio: 2027,
    nombre: "2027",
    fechaInicio: "2027-03-01",
    fechaFin: "2027-12-19",
    estado: "planificado",
    reabiertoHasta: null,
    motivoReapertura: null,
    bimestres: [bimestre(1), bimestre(2), bimestre(3), bimestre(4)],
    ...parcial,
  };
}

function evento(parcial: Partial<EventoPersistido> = {}): EventoPersistido {
  return {
    id: "evt-1",
    anioAcademicoId: "anio-2027",
    titulo: "Fiestas Patrias",
    descripcion: null,
    tipo: "feriado",
    fechaInicio: "2027-07-28",
    fechaFin: "2027-07-29",
    suspendeClases: true,
    creadoPorId: ACTOR,
    ...parcial,
  };
}

describe("AniosAcademicosService (RF-005)", () => {
  let service: AniosAcademicosService;
  let repo: jest.Mocked<AniosAcademicosRepository>;
  let audit: jest.Mocked<Pick<AuditService, "log">>;

  beforeEach(() => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByAnio: jest.fn(),
      findEnCurso: jest.fn(),
      findReabierto: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      guardarBimestres: jest.fn(),
      cambiarEstadoAnio: jest.fn(),
      findBimestre: jest.fn(),
      cambiarEstadoBimestre: jest.fn(),
      hayOtroBimestreEnCurso: jest.fn(),
      bimestreCerradoEn: jest.fn(),
      cerrarReaperturasVencidas: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<AniosAcademicosRepository>;

    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new AniosAcademicosService(repo, audit as unknown as AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const bimestresDto = FECHAS.map(([fechaInicio, fechaFin], indice) => ({
    numero: indice + 1,
    fechaInicio,
    fechaFin,
  }));

  describe("crear el año escolar", () => {
    it("crea el año y sus 4 bimestres en planificado", async () => {
      repo.findByAnio.mockResolvedValue(null);
      repo.create.mockImplementation((data) =>
        Promise.resolve(
          anio({
            bimestres: data.bimestres.map((item) =>
              bimestre(item.numero as 1 | 2 | 3 | 4, "planificado", [
                item.fechaInicio,
                item.fechaFin,
              ]),
            ),
          }),
        ),
      );

      const creado = await service.create(
        {
          anio: 2027,
          fechaInicio: "2027-03-01",
          fechaFin: "2027-12-19",
          bimestres: bimestresDto,
        },
        ACTOR,
      );

      expect(creado.estado).toBe("planificado");
      expect(creado.bimestres).toHaveLength(4);
      expect(creado.bimestres.every((item) => item.estado === "planificado")).toBe(true);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "crear", tabla: "anios_academicos" }),
      );
    });

    it("rechaza un año repetido", async () => {
      repo.findByAnio.mockResolvedValue(anio());

      await expect(
        service.create({ anio: 2027, fechaInicio: "2027-03-01", fechaFin: "2027-12-19" }, ACTOR),
      ).rejects.toThrow(new ConflictException(MENSAJES.anioRepetido(2027)));
    });

    it("rechaza fechas de fin anteriores o iguales al inicio", async () => {
      await expect(
        service.create({ anio: 2027, fechaInicio: "2027-12-19", fechaFin: "2027-03-01" }, ACTOR),
      ).rejects.toThrow(new BadRequestException(MENSAJES.fechasInvertidas));

      await expect(
        service.create({ anio: 2027, fechaInicio: "2027-03-01", fechaFin: "2027-03-01" }, ACTOR),
      ).rejects.toThrow(new BadRequestException(MENSAJES.fechasInvertidas));
    });

    it("rechaza un bimestre fuera del año", async () => {
      const fuera = bimestresDto.map((item) =>
        item.numero === 4 ? { ...item, fechaFin: "2027-12-22" } : item,
      );

      await expect(
        service.create(
          { anio: 2027, fechaInicio: "2027-03-01", fechaFin: "2027-12-19", bimestres: fuera },
          ACTOR,
        ),
      ).rejects.toThrow(new BadRequestException(MENSAJES.bimestreFuera));
    });

    it("rechaza bimestres superpuestos o que empiezan el mismo día", async () => {
      const superpuestos = bimestresDto.map((item) =>
        item.numero === 2 ? { ...item, fechaInicio: "2027-05-05" } : item,
      );

      await expect(
        service.create(
          {
            anio: 2027,
            fechaInicio: "2027-03-01",
            fechaFin: "2027-12-19",
            bimestres: superpuestos,
          },
          ACTOR,
        ),
      ).rejects.toThrow(new BadRequestException(MENSAJES.bimestresSuperpuestos));
    });
  });

  describe("iniciar y cerrar el año", () => {
    it("pasa el año a en curso cuando los 4 bimestres están fechados", async () => {
      repo.findById.mockResolvedValue(anio());
      repo.findEnCurso.mockResolvedValue(null);
      repo.cambiarEstadoAnio.mockResolvedValue(anio({ estado: "en_curso" }));

      const iniciado = await service.iniciar("anio-2027", ACTOR);

      expect(iniciado.estado).toBe("en_curso");
      expect(repo.cambiarEstadoAnio).toHaveBeenCalledWith("anio-2027", "en_curso");
    });

    it("expone el año en curso y, si no hay, el reabierto", async () => {
      repo.findEnCurso.mockResolvedValue(anio({ estado: "en_curso" }));
      await expect(service.findEnCurso()).resolves.toMatchObject({ estado: "en_curso" });

      repo.findEnCurso.mockResolvedValue(null);
      repo.findReabierto.mockResolvedValue(anio({ estado: "reabierto" }));
      await expect(service.findEnCurso()).resolves.toMatchObject({ estado: "reabierto" });
    });

    it("responde que no hay año en curso cuando no existe ninguno vigente", async () => {
      repo.findEnCurso.mockResolvedValue(null);
      repo.findReabierto.mockResolvedValue(null);

      await expect(service.findEnCurso()).rejects.toThrow(
        new NotFoundException("No hay un año escolar en curso."),
      );
    });

    it("bloquea el inicio si falta un bimestre", async () => {
      repo.findById.mockResolvedValue(anio({ bimestres: [bimestre(1), bimestre(2), bimestre(3)] }));

      await expect(service.iniciar("anio-2027", ACTOR)).rejects.toThrow(
        new BadRequestException(MENSAJES.bimestresIncompletos),
      );
    });

    it("bloquea el inicio si ya hay otro año en curso", async () => {
      repo.findById.mockResolvedValue(anio());
      repo.findEnCurso.mockResolvedValue(anio({ id: "anio-2026", anio: 2026, estado: "en_curso" }));

      await expect(service.iniciar("anio-2027", ACTOR)).rejects.toThrow(
        new ConflictException(MENSAJES.otroAnioEnCurso),
      );
    });

    it("cierra el año cuando los 4 bimestres están cerrados", async () => {
      const cerrados = [1, 2, 3, 4].map((numero) => bimestre(numero as 1 | 2 | 3 | 4, "cerrado"));
      repo.findById.mockResolvedValue(anio({ estado: "en_curso", bimestres: cerrados }));
      repo.cambiarEstadoAnio.mockResolvedValue(anio({ estado: "cerrado", bimestres: cerrados }));

      const cerrado = await service.cerrar("anio-2027", ACTOR);
      expect(cerrado.estado).toBe("cerrado");
    });

    it("impide cerrar el año si queda un bimestre abierto", async () => {
      repo.findById.mockResolvedValue(
        anio({
          estado: "en_curso",
          bimestres: [
            bimestre(1, "cerrado"),
            bimestre(2, "cerrado"),
            bimestre(3, "cerrado"),
            bimestre(4, "en_curso"),
          ],
        }),
      );

      await expect(service.cerrar("anio-2027", ACTOR)).rejects.toThrow(
        new BadRequestException(MENSAJES.anioConBimestresAbiertos),
      );
    });
  });

  describe("bimestres", () => {
    it("inicia el bimestre II cuando el I ya está cerrado", async () => {
      repo.findById.mockResolvedValue(
        anio({
          estado: "en_curso",
          bimestres: [bimestre(1, "cerrado"), bimestre(2), bimestre(3), bimestre(4)],
        }),
      );
      repo.hayOtroBimestreEnCurso.mockResolvedValue(false);
      repo.cambiarEstadoBimestre.mockResolvedValue(bimestre(2, "en_curso"));

      const iniciado = await service.iniciarBimestre("anio-2027", "bim-2", ACTOR);
      expect(iniciado.estado).toBe("en_curso");
    });

    it("bloquea iniciar el III mientras el II sigue en curso", async () => {
      repo.findById.mockResolvedValue(
        anio({
          estado: "en_curso",
          bimestres: [bimestre(1, "cerrado"), bimestre(2, "en_curso"), bimestre(3), bimestre(4)],
        }),
      );

      await expect(service.iniciarBimestre("anio-2027", "bim-3", ACTOR)).rejects.toThrow(
        new BadRequestException(MENSAJES.bimestreFueraDeOrden),
      );
    });

    it("cierra el bimestre en curso y marca sus fechas como bloqueadas", async () => {
      repo.findById.mockResolvedValue(
        anio({
          estado: "en_curso",
          bimestres: [bimestre(1, "en_curso"), bimestre(2), bimestre(3), bimestre(4)],
        }),
      );
      repo.cambiarEstadoBimestre.mockResolvedValue(bimestre(1, "cerrado"));
      repo.bimestreCerradoEn.mockResolvedValue(true);

      const cerrado = await service.cerrarBimestre("anio-2027", "bim-1", ACTOR);
      expect(cerrado.estado).toBe("cerrado");
      await expect(service.sesionesBloqueadasEn("2027-04-01")).resolves.toBe(true);
      expect(repo.bimestreCerradoEn).toHaveBeenCalledWith("2027-04-01");
    });
  });

  describe("reapertura", () => {
    it("reabre un año cerrado con motivo, fecha límite y bitácora", async () => {
      repo.findById.mockResolvedValue(anio({ estado: "cerrado", anio: 2026, id: "anio-2026" }));
      repo.cambiarEstadoAnio.mockResolvedValue(
        anio({
          id: "anio-2026",
          anio: 2026,
          estado: "reabierto",
          motivoReapertura: "Corrección de libretas",
          reabiertoHasta: "2027-01-15 23:59:59",
        }),
      );

      const reabierto = await service.reabrir(
        "anio-2026",
        { motivo: "Corrección de libretas", fechaLimite: "2027-01-15" },
        ACTOR,
      );

      expect(reabierto.estado).toBe("reabierto");
      expect(repo.cambiarEstadoAnio).toHaveBeenCalledWith("anio-2026", "reabierto", {
        motivo: "Corrección de libretas",
        hasta: "2027-01-15 23:59:59",
      });
      const [entrada] = audit.log.mock.calls[0];
      expect(entrada.accion).toBe("actualizar");
      expect(entrada.valorNuevo).toMatchObject({ motivoReapertura: "Corrección de libretas" });
    });

    it("exige motivo y fecha límite", async () => {
      await expect(
        service.reabrir("anio-2026", { motivo: "   ", fechaLimite: "2027-01-15" }, ACTOR),
      ).rejects.toThrow(new BadRequestException(MENSAJES.reaperturaIncompleta));
    });

    it("vuelve a cerrado el día siguiente al límite y lo deja en la bitácora sin usuario", async () => {
      repo.cerrarReaperturasVencidas.mockResolvedValue([
        anio({ id: "anio-2026", anio: 2026, estado: "cerrado", reabiertoHasta: null }),
      ]);

      const cerrados = await service.cerrarReaperturasVencidas("2027-01-16");

      expect(cerrados).toBe(1);
      expect(repo.cerrarReaperturasVencidas).toHaveBeenCalledWith("2027-01-16");
      const [entrada] = audit.log.mock.calls[0];
      expect(entrada.usuarioId).toBeNull();
      expect(entrada.registroId).toBe("anio-2026");
      expect(entrada.valorNuevo).toMatchObject({ estado: "cerrado" });
    });
  });
});

describe("CalendarioService (RF-005)", () => {
  let service: CalendarioService;
  let repo: jest.Mocked<CalendarioRepository>;
  let anios: jest.Mocked<Pick<AniosAcademicosService, "findEnCurso" | "findById">>;
  let audit: jest.Mocked<Pick<AuditService, "log">>;

  beforeEach(() => {
    repo = {
      listarEnRango: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      eliminarSesionesPendientes: jest.fn().mockResolvedValue({ eliminadas: 0, firmadas: 0 }),
      suspendeClasesEn: jest.fn(),
    } as unknown as jest.Mocked<CalendarioRepository>;

    anios = {
      findEnCurso: jest.fn().mockResolvedValue(anio({ estado: "en_curso" })),
      findById: jest.fn(),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new CalendarioService(
      repo,
      anios as unknown as AniosAcademicosService,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("guarda un feriado suspendiendo clases", async () => {
    repo.create.mockImplementation((data) => Promise.resolve(evento({ ...data, id: "evt-1" })));

    const creado = await service.create(
      {
        titulo: "Fiestas Patrias",
        tipo: "feriado",
        fechaInicio: "2027-07-28",
        fechaFin: "2027-07-29",
      },
      ACTOR,
    );

    expect(creado.suspendeClases).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ suspendeClases: true, tipo: "feriado" }),
    );
  });

  it("deja una reunión sin suspender clases cuando no se marca la opción", async () => {
    repo.create.mockImplementation((data) =>
      Promise.resolve(evento({ ...data, id: "evt-2", suspendeClases: data.suspendeClases })),
    );

    const creado = await service.create(
      {
        titulo: "Reunión de padres",
        tipo: "reunion",
        fechaInicio: "2027-06-10",
        fechaFin: "2027-06-10",
      },
      ACTOR,
    );

    expect(creado.suspendeClases).toBe(false);
    expect(repo.eliminarSesionesPendientes).not.toHaveBeenCalled();
  });

  it("elimina sesiones pendientes, conserva las firmadas y avisa", async () => {
    repo.create.mockImplementation((data) =>
      Promise.resolve(evento({ ...data, tipo: "suspension", titulo: "Suspensión" })),
    );
    repo.eliminarSesionesPendientes.mockResolvedValue({ eliminadas: 2, firmadas: 1 });

    const creado = await service.create(
      {
        titulo: "Suspensión",
        tipo: "suspension",
        fechaInicio: "2027-06-10",
        fechaFin: "2027-06-10",
      },
      ACTOR,
    );

    expect(repo.eliminarSesionesPendientes).toHaveBeenCalledWith("2027-06-10", "2027-06-10");
    expect(creado.mensaje).toBe(MENSAJES.sesionesPendientes);
  });

  it("rechaza un evento con la fecha de fin anterior al inicio", async () => {
    await expect(
      service.create(
        { titulo: "Mal", tipo: "actividad", fechaInicio: "2027-06-12", fechaFin: "2027-06-10" },
        ACTOR,
      ),
    ).rejects.toThrow(new BadRequestException(MENSAJES.fechasInvertidas));
  });

  it("lista el mes del año en curso y marca los días sin clases", async () => {
    repo.listarEnRango.mockResolvedValue([
      evento(),
      evento({
        id: "evt-2",
        titulo: "Reunión de padres",
        tipo: "reunion",
        fechaInicio: "2027-07-15",
        fechaFin: "2027-07-15",
        suspendeClases: false,
      }),
    ]);

    const consulta = await service.consultar(7, 2027);

    expect(consulta.anio).toBe(2027);
    expect(consulta.desde).toBe("2027-07-01");
    expect(consulta.hasta).toBe("2027-07-31");
    expect(consulta.eventos).toHaveLength(2);
    expect(consulta.diasSinClases).toEqual(["2027-07-28", "2027-07-29"]);
  });

  it("indica si una fecha suspende clases para que RF-011 no genere sesiones", async () => {
    repo.suspendeClasesEn.mockResolvedValue(true);
    await expect(service.suspendeClasesEn("2027-07-28")).resolves.toBe(true);
  });
});

describe("PermissionsGuard (RF-005 calendario)", () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Pick<Reflector, "getAllAndOverride">>;
  let permisos: jest.Mocked<Pick<RolePermissionsService, "hasAll">>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    permisos = { hasAll: jest.fn() };
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      permisos as unknown as RolePermissionsService,
    );
  });

  function contexto(user?: { role?: string; roleId?: string }): ExecutionContext {
    return {
      getHandler: () => "handler",
      getClass: () => "clase",
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  it("deja ver el calendario a cualquier usuario autenticado", async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(contexto({ role: "Docente", roleId: "rol-1" }))).resolves.toBe(
      true,
    );
    expect(permisos.hasAll).not.toHaveBeenCalled();
  });

  it("deja registrar al administrador sin consultar el permiso", async () => {
    reflector.getAllAndOverride.mockReturnValue(["calendario:registrar"]);
    await expect(
      guard.canActivate(contexto({ role: "Administrador", roleId: "rol-admin" })),
    ).resolves.toBe(true);
    expect(permisos.hasAll).not.toHaveBeenCalled();
  });

  it("rechaza registrar, editar o eliminar si el perfil no tiene el permiso", async () => {
    reflector.getAllAndOverride.mockReturnValue(["calendario:registrar"]);
    permisos.hasAll.mockResolvedValue(false);

    await expect(
      guard.canActivate(contexto({ role: "Docente", roleId: "rol-docente" })),
    ).rejects.toThrow(new ForbiddenException("No tiene permiso para realizar esta acción."));
  });
});
