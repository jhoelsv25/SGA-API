import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { AniosAcademicosService } from "@/features/anio-escolar/anios.service";
import {
  AsistenciaClaseRepository,
  AsistenciaClaseService,
  type EstudianteListaAsistenciaDto,
} from "@/features/asistencia-clase";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { TurnosRepository } from "@/features/turnos/repositories/turnos.repository";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

const HOY = "2027-05-12";

const docente: AuthenticatedUser = {
  id: "u-doc",
  username: "doc",
  roleId: "r-doc",
  role: "Docente",
  personaId: "per-doc",
};
const secretaria: AuthenticatedUser = {
  ...docente,
  id: "u-sec",
  role: "Secretaria",
  personaId: "per-sec",
};

const sesion = {
  id: "ses-1",
  fecha: HOY,
  docenteId: "doc-1",
  firmadaInicioEn: `${HOY} 07:50:00`,
  seccionId: "sec-5a",
  seccionNombre: "5.° A",
  tutorId: "doc-tutor",
  cursoSeccionId: "cs-mate",
  cursoNombre: "Matemática",
};

function estudiante(
  n: number,
  parcial: Partial<EstudianteListaAsistenciaDto> = {},
): EstudianteListaAsistenciaDto {
  return {
    matriculaId: `mat-${n}`,
    estudianteId: `est-${n}`,
    nombreCompleto: `Estudiante ${n}`,
    fotoUrl: null,
    estado: "presente",
    asistenciaId: null,
    noMarcoIngreso: false,
    justificacion: null,
    ...parcial,
  };
}

describe("RF-010: Asistencia en clase (HU3)", () => {
  let service: AsistenciaClaseService;
  let repo: Mocks<AsistenciaClaseRepository>;
  let turnos: Mocks<TurnosRepository>;
  let anios: Mocks<AniosAcademicosService>;
  let audit: Mocks<AuditService>;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(`${HOY}T10:00:00-05:00`) });
    const lista = Array.from({ length: 33 }, (_, i) => estudiante(i + 1));
    repo = {
      findSesion: jest.fn().mockResolvedValue(sesion),
      findDocenteIdPorPersona: jest.fn().mockResolvedValue("doc-1"),
      listarEstudiantesDeSesion: jest.fn().mockResolvedValue(lista),
      guardarAsistencia: jest.fn().mockResolvedValue(undefined),
      findRegistro: jest.fn(),
      justificarFalta: jest.fn().mockResolvedValue(undefined),
    };
    turnos = { findByAplicaA: jest.fn().mockResolvedValue({ diasLaborables: "1,2,3,4,5" }) };
    anios = { sesionesBloqueadasEn: jest.fn().mockResolvedValue(false) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new AsistenciaClaseService(
      repo as unknown as AsistenciaClaseRepository,
      turnos as unknown as TurnosRepository,
      anios as unknown as AniosAcademicosService,
      { id: () => undefined } as unknown as AnioLectivoCls,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => jest.useRealTimers());

  it("CP-RF010-16: guarda excepciones y deja al resto presente", async () => {
    const r = await service.guardar(
      "ses-1",
      {
        excepciones: [
          { matriculaId: "mat-1", estado: "tardanza" },
          { matriculaId: "mat-2", estado: "tardanza" },
          { matriculaId: "mat-3", estado: "falta" },
        ],
      },
      docente,
    );
    expect(r.mensaje).toBe("Asistencia guardada: 30 presentes, 2 tardanzas, 1 falta.");
    const llamada = repo.guardarAsistencia!.mock.calls[0] as [unknown, { estado: string }[]];
    const registros = llamada[1];
    expect(registros).toHaveLength(33);
    expect(registros.filter((x) => x.estado === "presente")).toHaveLength(30);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ accion: "crear", tabla: "asistencias_estudiante" }),
    );
  });

  it("CP-RF010-17: la lista señala a quien no marcó ingreso pero lo deja presente", async () => {
    repo.listarEstudiantesDeSesion!.mockResolvedValue([
      estudiante(1, { noMarcoIngreso: true }),
      estudiante(2),
    ]);
    const lista = await service.listaDeSesion("ses-1", docente);
    expect(lista.estudiantes[0]).toEqual(
      expect.objectContaining({ noMarcoIngreso: true, estado: "presente" }),
    );
    expect(lista.editable).toBe(true);
  });

  it("CP-RF010-18: corregir una falta a presente actualiza y audita el cambio", async () => {
    repo.listarEstudiantesDeSesion!.mockResolvedValue([
      estudiante(1, { estado: "falta", asistenciaId: "a1" }),
      estudiante(2, { asistenciaId: "a2" }),
    ]);
    const r = await service.guardar("ses-1", { excepciones: [] }, docente);
    expect(r.mensaje).toBe("Asistencia guardada: 2 presentes, 0 tardanzas, 0 faltas.");
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: "actualizar",
        valorNuevo: expect.objectContaining({
          cambios: [{ matriculaId: "mat-1", de: "falta", a: "presente" }] as unknown,
        }) as unknown,
      }),
    );
  });

  it("no pisa una falta ya justificada", async () => {
    repo.listarEstudiantesDeSesion!.mockResolvedValue([
      estudiante(1, { estado: "falta_justificada", asistenciaId: "a1" }),
    ]);
    await service.guardar(
      "ses-1",
      { excepciones: [{ matriculaId: "mat-1", estado: "falta" }] },
      docente,
    );
    expect(repo.guardarAsistencia).toHaveBeenCalledWith(sesion, [], "u-doc");
  });

  it("CP-RF010-19: sesión de ayer queda bloqueada", async () => {
    repo.findSesion!.mockResolvedValue({ ...sesion, fecha: "2027-05-11" });
    await expect(service.guardar("ses-1", { excepciones: [] }, docente)).rejects.toThrow(
      new ForbiddenException("La asistencia de esta sesión ya no se puede modificar."),
    );
    expect(repo.guardarAsistencia).not.toHaveBeenCalled();
  });

  it("CP-RF010-19: bimestre cerrado bloquea aunque sea hoy", async () => {
    anios.sesionesBloqueadasEn!.mockResolvedValue(true);
    await expect(service.guardar("ses-1", { excepciones: [] }, docente)).rejects.toThrow(
      "La asistencia de esta sesión ya no se puede modificar.",
    );
  });

  it("CP-RF010-20: otro docente no puede tomar la asistencia", async () => {
    repo.findDocenteIdPorPersona!.mockResolvedValue("doc-otro");
    await expect(service.guardar("ses-1", { excepciones: [] }, docente)).rejects.toThrow(
      "Solo el docente que dicta la sesión puede tomar su asistencia.",
    );
  });

  it("exige que el docente haya firmado el ingreso de la sesión", async () => {
    repo.findSesion!.mockResolvedValue({ ...sesion, firmadaInicioEn: null });
    await expect(service.guardar("ses-1", { excepciones: [] }, docente)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("rechaza estudiantes que no están en la lista vigente (CP-RF010-21)", async () => {
    await expect(
      service.guardar(
        "ses-1",
        { excepciones: [{ matriculaId: "mat-retirado", estado: "falta" }] },
        docente,
      ),
    ).rejects.toThrow("Un estudiante enviado no tiene matrícula vigente en la sección.");
  });

  describe("justificar falta (CP-RF010-22)", () => {
    const registro = {
      id: "a1",
      estado: "falta",
      matriculaId: "mat-1",
      cursoSeccionId: "cs-mate",
      fecha: HOY,
      seccionId: "sec-5a",
      tutorId: "doc-tutor",
    };
    beforeEach(() => repo.findRegistro!.mockResolvedValue(registro));

    it("la Secretaria la cambia a falta_justificada con motivo y documento", async () => {
      const r = await service.justificarFalta(
        "a1",
        { motivo: "Certificado médico", documentoUrl: "/uploads/cert.pdf" },
        secretaria,
      );
      expect(r.estado).toBe("falta_justificada");
      expect(repo.justificarFalta).toHaveBeenCalledWith(
        "a1",
        "Certificado médico",
        "/uploads/cert.pdf",
        "u-sec",
      );
      expect(audit.log).toHaveBeenCalled();
    });

    it("el tutor de la sección también puede", async () => {
      repo.findDocenteIdPorPersona!.mockResolvedValue("doc-tutor");
      await expect(
        service.justificarFalta("a1", { motivo: "Duelo familiar" }, docente),
      ).resolves.toBeDefined();
    });

    it("otro docente no puede", async () => {
      await expect(service.justificarFalta("a1", { motivo: "x" }, docente)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("el motivo es obligatorio y solo se justifica una falta", async () => {
      await expect(service.justificarFalta("a1", { motivo: " " }, secretaria)).rejects.toThrow(
        "Indique el motivo de la justificación.",
      );
      repo.findRegistro!.mockResolvedValue({ ...registro, estado: "presente" });
      await expect(service.justificarFalta("a1", { motivo: "x" }, secretaria)).rejects.toThrow(
        "Solo se puede justificar una falta.",
      );
    });
  });
});

describe("RF-010: Consultas de asistencia (HU4)", () => {
  let service: AsistenciaClaseService;
  let repo: Mocks<AsistenciaClaseRepository>;

  const matricula = {
    id: "mat-1",
    seccionId: "sec-5a",
    seccionNombre: "5.° A",
    tutorId: "doc-tutor",
    anioAcademicoId: "anio-2027",
    fechaMatricula: "2027-03-01",
    fechaRetiro: null,
    estado: "matriculado",
  };
  const apoderado: AuthenticatedUser = {
    id: "u-apo",
    username: "apo",
    roleId: "r",
    role: "Apoderado",
    personaId: "per-apo",
  };
  const consulta = { desde: "2027-05-10", hasta: "2027-05-14" };

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date("2027-05-20T10:00:00-05:00") });
    repo = {
      findEstudiante: jest
        .fn()
        .mockResolvedValue({ id: "est-1", personaId: "per-est", nombreCompleto: "Pérez, Ana" }),
      matriculaParaConsulta: jest.fn().mockResolvedValue(matricula),
      findDocenteIdPorPersona: jest.fn().mockResolvedValue(null),
      esApoderadoDe: jest.fn().mockResolvedValue(true),
      entradasDePersonas: jest.fn().mockResolvedValue([
        {
          personaId: "per-est",
          fecha: "2027-05-10",
          hora: "07:50",
          resultado: "puntual",
          minutosTardanza: 0,
          justificada: false,
        },
        {
          personaId: "per-est",
          fecha: "2027-05-13",
          hora: "08:05",
          resultado: "tardanza",
          minutosTardanza: 10,
          justificada: false,
        },
      ]),
      suspensiones: jest.fn().mockResolvedValue([]),
      asistenciaPorCurso: jest.fn().mockResolvedValue([
        {
          matriculaId: "mat-1",
          cursoSeccionId: "cs-mate",
          cursoNombre: "Matemática",
          fecha: "2027-05-10",
          estado: "presente",
          justificacion: null,
        },
        {
          matriculaId: "mat-1",
          cursoSeccionId: "cs-mate",
          cursoNombre: "Matemática",
          fecha: "2027-05-11",
          estado: "falta",
          justificacion: null,
        },
      ]),
    };
    service = new AsistenciaClaseService(
      repo as unknown as AsistenciaClaseRepository,
      {
        findByAplicaA: jest
          .fn()
          .mockResolvedValue({ diasConClases: "", diasLaborables: "1,2,3,4,5" }),
      } as unknown as TurnosRepository,
      {
        findEnCurso: jest.fn().mockResolvedValue({ id: "anio-2027" }),
        findById: jest.fn(),
      } as unknown as AniosAcademicosService,
      { id: () => undefined } as unknown as AnioLectivoCls,
      {} as AuditService,
    );
  });

  afterEach(() => jest.useRealTimers());

  it("CP-RF010-23/24: el apoderado ve entradas, tardanzas, faltas al colegio y por curso", async () => {
    const r = await service.consultarEstudiante("est-1", consulta, apoderado);
    expect(r.colegio.puntuales).toBe(1);
    expect(r.colegio.tardanzas).toBe(1);
    expect(r.colegio.faltasAlColegio).toEqual(["2027-05-11", "2027-05-12", "2027-05-14"]);
    expect(r.cursos[0].totales).toEqual({
      presentes: 1,
      tardanzas: 0,
      faltas: 1,
      faltasJustificadas: 0,
    });
    expect(r.cursos[0].incidencias).toHaveLength(1);
  });

  it("un apoderado ajeno no puede consultar", async () => {
    repo.esApoderadoDe!.mockResolvedValue(false);
    await expect(service.consultarEstudiante("est-1", consulta, apoderado)).rejects.toThrow(
      "No tiene permiso para consultar la asistencia de este estudiante.",
    );
  });

  it("el propio estudiante puede consultar", async () => {
    repo.esApoderadoDe!.mockResolvedValue(false);
    await expect(
      service.consultarEstudiante("est-1", consulta, { ...apoderado, personaId: "per-est" }),
    ).resolves.toBeDefined();
  });

  it("CP-RF010-25: el tutor consulta su sección con faltas y tardanzas por estudiante", async () => {
    repo.findSeccion = jest.fn().mockResolvedValue({
      id: "sec-5a",
      nombre: "5.° A",
      tutorId: "doc-tutor",
      anioAcademicoId: "anio-2027",
    });
    repo.findDocenteIdPorPersona!.mockResolvedValue("doc-tutor");
    repo.matriculasDeSeccion = jest.fn().mockResolvedValue([
      {
        matriculaId: "mat-1",
        estudianteId: "est-1",
        personaId: "per-est",
        nombreCompleto: "Pérez, Ana",
        fechaMatricula: "2027-03-01",
        fechaRetiro: null,
      },
    ]);
    const r = await service.consultarSeccion("sec-5a", consulta, {
      ...apoderado,
      role: "Docente",
      personaId: "per-tutor",
    });
    expect(r.diasConClases).toBe(5);
    expect(r.estudiantes[0]).toEqual(
      expect.objectContaining({ faltasColegio: 3, tardanzasColegio: 1 }),
    );
    expect(r.estudiantes[0].clases.faltas).toBe(1);
  });

  it("lista las secciones consultables: todas para directivos, solo las tutorizadas para un docente", async () => {
    repo.seccionesConsultables = jest.fn().mockResolvedValue([{ id: "sec-5a", nombre: "5.° A" }]);
    await service.misSecciones({ ...apoderado, role: "Director" });
    expect(repo.seccionesConsultables).toHaveBeenLastCalledWith("anio-2027", null);
    repo.findDocenteIdPorPersona!.mockResolvedValue("doc-tutor");
    await service.misSecciones({ ...apoderado, role: "Docente" });
    expect(repo.seccionesConsultables).toHaveBeenLastCalledWith("anio-2027", "doc-tutor");
    repo.findDocenteIdPorPersona!.mockResolvedValue(null);
    await expect(service.misSecciones({ ...apoderado, role: "Estudiante" })).resolves.toEqual([]);
  });

  it("un docente que no es tutor no consulta la sección", async () => {
    repo.findSeccion = jest.fn().mockResolvedValue({
      id: "sec-5a",
      nombre: "5.° A",
      tutorId: "doc-tutor",
      anioAcademicoId: "a",
    });
    repo.findDocenteIdPorPersona!.mockResolvedValue("doc-otro");
    await expect(
      service.consultarSeccion("sec-5a", consulta, { ...apoderado, role: "Docente" }),
    ).rejects.toThrow("Solo el tutor de la sección puede consultar su asistencia.");
  });
});
