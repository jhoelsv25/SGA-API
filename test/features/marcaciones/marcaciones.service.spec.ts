import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { hashSha256 } from "@/common/utils";
import { AniosAcademicosService } from "@/features/anio-escolar/anios.service";
import { CalendarioService } from "@/features/calendario/calendario.service";
import { EquiposService } from "@/features/equipos/equipos.service";
import {
  MarcacionesRepository,
  MarcacionesService,
  type MarcacionResponseDto,
  type PersonaParaMarcar,
} from "@/features/marcaciones";
import { TurnosRepository } from "@/features/turnos/repositories/turnos.repository";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

const HOY = "2027-05-12"; // miércoles

const turnoEstudiantes = {
  id: "turno-est",
  aplicaA: "estudiantes",
  horaEntrada: "07:45:00",
  horaSalida: "13:15:00",
  ventanaEntradaInicio: "06:30:00",
  ventanaEntradaFin: "09:30:00",
  ventanaSalidaInicio: "12:30:00",
  ventanaSalidaFin: "15:00:00",
  toleranciaMin: 10,
  diasLaborables: "1,2,3,4,5",
  activo: true,
};
const turnoDocentes = {
  ...turnoEstudiantes,
  id: "turno-doc",
  aplicaA: "docentes",
  horaEntrada: "07:30:00",
  horaSalida: "14:00:00",
  ventanaSalidaInicio: "12:00:00",
};

const estudiante: PersonaParaMarcar = {
  personaId: "per-est",
  nombres: "Ana",
  nombreCompleto: "Pérez, Ana",
  fotoUrl: null,
  tipoPersona: "estudiantes",
  estudianteId: "est-1",
  vigente: true,
};
const docente: PersonaParaMarcar = {
  personaId: "per-doc",
  nombres: "Luis",
  nombreCompleto: "Rojas, Luis",
  fotoUrl: null,
  tipoPersona: "docentes",
  estudianteId: null,
  vigente: true,
};

function marcacion(parcial: Partial<MarcacionResponseDto> = {}): MarcacionResponseDto {
  return {
    id: "mar-1",
    personaId: "per-est",
    nombreCompleto: "Pérez, Ana",
    fotoUrl: null,
    tipoPersona: "estudiantes",
    tipo: "entrada",
    fechaHora: `${HOY} 07:52:00`,
    origen: "kiosko",
    resultado: "puntual",
    minutosTardanza: 0,
    justificada: false,
    motivoJustificacion: null,
    justificadaEn: null,
    observacion: null,
    ...parcial,
  };
}

describe("RF-010: Marcaciones (HU1 y HU2)", () => {
  let service: MarcacionesService;
  let repo: Mocks<MarcacionesRepository>;
  let equipos: Mocks<EquiposService>;
  let turnos: Mocks<TurnosRepository>;
  let calendario: Mocks<CalendarioService>;
  let anios: Mocks<AniosAcademicosService>;
  let audit: Mocks<AuditService>;

  const credencial = (pin = "1234", extra = {}) => ({
    id: "cred-1",
    personaId: "per-est",
    pinHash: hashSha256(pin),
    activa: true,
    venceEn: null,
    ...extra,
  });

  function horaServidor(hora: string, fecha = HOY) {
    jest.useFakeTimers({ now: new Date(`${fecha}T${hora}-05:00`) });
  }

  beforeEach(() => {
    repo = {
      findCredencialPorCodigo: jest.fn().mockResolvedValue(credencial()),
      findPersonaParaMarcar: jest.fn().mockResolvedValue(estudiante),
      tieneMatriculaVigente: jest.fn().mockResolvedValue(true),
      marcacionesDePersonaEnFecha: jest.fn().mockResolvedValue([]),
      insertar: jest
        .fn()
        .mockImplementation((d: Partial<MarcacionResponseDto>) =>
          Promise.resolve(marcacion({ ...d, id: "nueva" })),
        ),
      findById: jest.fn(),
      justificar: jest.fn(),
    };
    equipos = {
      validarKiosko: jest.fn().mockResolvedValue({
        valido: true,
        message: "ok",
        equipo: { proposito: "marcacion", usuariosPermitidos: "estudiantes" },
      }),
    };
    turnos = {
      findByAplicaA: jest
        .fn()
        .mockImplementation((a: string) =>
          Promise.resolve(a === "estudiantes" ? turnoEstudiantes : turnoDocentes),
        ),
    };
    calendario = { suspendeClasesEn: jest.fn().mockResolvedValue(false) };
    anios = { anioVigente: jest.fn().mockResolvedValue({ id: "anio-2027" }) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new MarcacionesService(
      repo as unknown as MarcacionesRepository,
      equipos as unknown as EquiposService,
      turnos as unknown as TurnosRepository,
      calendario as unknown as CalendarioService,
      anios as unknown as AniosAcademicosService,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => jest.useRealTimers());

  it("CP-RF010-01: estudiante marca a tiempo", async () => {
    horaServidor("07:52:00");
    const r = await service.marcarEnKiosko("tok", { codigo: "CR-1", pin: "1234" });
    expect(r.registrada).toBe(true);
    expect(r.resultado).toBe("puntual");
    expect(r.mensaje).toBe("Bienvenido(a), Ana. Entrada registrada a las 07:52.");
    expect(repo.insertar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "entrada", origen: "kiosko", fechaHora: `${HOY} 07:52:00` }),
    );
  });

  it("CP-RF010-02: estudiante llega tarde", async () => {
    horaServidor("08:05:00");
    const r = await service.marcarEnKiosko("tok", { codigo: "CR-1", pin: "1234" });
    expect(r.resultado).toBe("tardanza");
    expect(r.minutosTardanza).toBe(10);
    expect(r.mensaje).toBe("Ana, entrada registrada a las 08:05 con 10 minutos de tardanza.");
  });

  it("CP-RF010-03: segunda marcación no registra nada", async () => {
    horaServidor("09:00:00");
    repo.marcacionesDePersonaEnFecha!.mockResolvedValue([
      { id: "m", tipo: "entrada", fechaHora: `${HOY} 07:52:00` },
    ]);
    const r = await service.marcarEnKiosko("tok", { codigo: "CR-1", pin: "1234" });
    expect(r.registrada).toBe(false);
    expect(r.mensaje).toBe("Ya registró su entrada hoy a las 07:52.");
    expect(repo.insertar).not.toHaveBeenCalled();
  });

  it("CP-RF010-04: docente marca salida tras su entrada", async () => {
    horaServidor("14:03:00");
    equipos.validarKiosko!.mockResolvedValue({
      valido: true,
      message: "ok",
      equipo: { proposito: "marcacion", usuariosPermitidos: "docentes,administrativos" },
    });
    repo.findPersonaParaMarcar!.mockResolvedValue(docente);
    repo.marcacionesDePersonaEnFecha!.mockResolvedValue([
      { id: "m", tipo: "entrada", fechaHora: `${HOY} 07:20:00` },
    ]);
    const r = await service.marcarEnKiosko("tok", { codigo: "CR-1", pin: "1234" });
    expect(r.tipo).toBe("salida");
    expect(r.mensaje).toBe("Hasta luego, Luis. Salida registrada a las 14:03.");
  });

  it("personal con entrada y salida ya registradas recibe el aviso de ambas", async () => {
    horaServidor("15:00:00");
    equipos.validarKiosko!.mockResolvedValue({
      valido: true,
      message: "ok",
      equipo: { proposito: "marcacion", usuariosPermitidos: "docentes" },
    });
    repo.findPersonaParaMarcar!.mockResolvedValue(docente);
    repo.marcacionesDePersonaEnFecha!.mockResolvedValue([
      { id: "a", tipo: "entrada", fechaHora: `${HOY} 07:20:00` },
      { id: "b", tipo: "salida", fechaHora: `${HOY} 14:03:00` },
    ]);
    const r = await service.marcarEnKiosko("tok", { codigo: "CR-1", pin: "1234" });
    expect(r.registrada).toBe(false);
    expect(r.mensaje).toBe("Ya registró su entrada y su salida hoy.");
  });

  it("CP-RF010-06: fuera de ventana se registra como fuera_de_turno", async () => {
    horaServidor("10:15:00");
    const r = await service.marcarEnKiosko("tok", { codigo: "CR-1", pin: "1234" });
    expect(r.registrada).toBe(true);
    expect(r.resultado).toBe("fuera_de_turno");
    expect(r.mensaje).toBe("Marcación registrada fuera del horario permitido.");
  });

  it("un día que suspende clases se registra como fuera_de_turno", async () => {
    horaServidor("07:50:00");
    calendario.suspendeClasesEn!.mockResolvedValue(true);
    const r = await service.marcarEnKiosko("tok", { codigo: "CR-1", pin: "1234" });
    expect(r.resultado).toBe("fuera_de_turno");
  });

  it("CP-RF010-07: PIN o código incorrecto no registra", async () => {
    horaServidor("07:50:00");
    await expect(service.marcarEnKiosko("tok", { codigo: "CR-1", pin: "9999" })).rejects.toThrow(
      new BadRequestException("Código o PIN incorrecto."),
    );
    repo.findCredencialPorCodigo!.mockResolvedValue(null);
    await expect(service.marcarEnKiosko("tok", { codigo: "CR-X", pin: "1234" })).rejects.toThrow(
      "Código o PIN incorrecto.",
    );
    expect(repo.insertar).not.toHaveBeenCalled();
  });

  it("CP-RF010-08: credencial anulada no registra", async () => {
    horaServidor("07:50:00");
    repo.findCredencialPorCodigo!.mockResolvedValue(credencial("1234", { activa: false }));
    await expect(service.marcarEnKiosko("tok", { codigo: "CR-1", pin: "1234" })).rejects.toThrow(
      new ForbiddenException("Su credencial no está activa. Acérquese a secretaría."),
    );
    expect(repo.insertar).not.toHaveBeenCalled();
  });

  it("CP-RF010-09: estudiante en el kiosko del personal", async () => {
    horaServidor("07:50:00");
    equipos.validarKiosko!.mockResolvedValue({
      valido: true,
      message: "ok",
      equipo: { proposito: "marcacion", usuariosPermitidos: "docentes,administrativos" },
    });
    await expect(service.marcarEnKiosko("tok", { codigo: "CR-1", pin: "1234" })).rejects.toThrow(
      "Este kiosko no es para su tipo de usuario.",
    );
    expect(repo.insertar).not.toHaveBeenCalled();
  });

  it("CP-RF010-10: estudiante sin matrícula vigente", async () => {
    horaServidor("07:50:00");
    repo.tieneMatriculaVigente!.mockResolvedValue(false);
    await expect(service.marcarEnKiosko("tok", { codigo: "CR-1", pin: "1234" })).rejects.toThrow(
      "No tiene matrícula vigente. Acérquese a secretaría.",
    );
    expect(repo.insertar).not.toHaveBeenCalled();
  });

  it("un kiosko de sesiones no sirve para marcar", async () => {
    equipos.validarKiosko!.mockResolvedValue({
      valido: true,
      message: "ok",
      equipo: { proposito: "sesiones", usuariosPermitidos: "docentes" },
    });
    await expect(service.marcarEnKiosko("tok", { codigo: "CR-1", pin: "1234" })).rejects.toThrow(
      ForbiddenException,
    );
  });

  describe("marcación manual", () => {
    beforeEach(() => horaServidor("09:00:00"));

    it("CP-RF010-12: se guarda como manual con la hora indicada y se audita", async () => {
      const r = await service.registrarManual(
        {
          personaId: "per-est",
          tipo: "entrada",
          hora: "07:50",
          observacion: "Kiosko sin conexión",
        },
        "user-sec",
        "1.1.1.1",
      );
      expect(r.origen).toBe("manual");
      expect(repo.insertar).toHaveBeenCalledWith(
        expect.objectContaining({
          origen: "manual",
          fechaHora: `${HOY} 07:50:00`,
          resultado: "puntual",
          observacion: "Kiosko sin conexión",
          registradaPorId: "user-sec",
          credencialId: null,
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ tabla: "marcaciones", accion: "crear", usuarioId: "user-sec" }),
      );
    });

    it("CP-RF010-13: sin observación no se guarda", async () => {
      await expect(
        service.registrarManual(
          { personaId: "per-est", tipo: "entrada", hora: "07:50", observacion: "  " },
          "u",
        ),
      ).rejects.toThrow("Indique el motivo de la marcación manual.");
      expect(repo.insertar).not.toHaveBeenCalled();
    });

    it("rechaza una hora futura", async () => {
      await expect(
        service.registrarManual(
          { personaId: "per-est", tipo: "entrada", hora: "11:00", observacion: "x" },
          "u",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("un estudiante no tiene salida", async () => {
      await expect(
        service.registrarManual(
          { personaId: "per-est", tipo: "salida", hora: "08:00", observacion: "x" },
          "u",
        ),
      ).rejects.toThrow("Los estudiantes solo registran entrada.");
    });

    it("no duplica una entrada ya registrada", async () => {
      repo.marcacionesDePersonaEnFecha!.mockResolvedValue([
        { id: "m", tipo: "entrada", fechaHora: `${HOY} 07:52:00` },
      ]);
      await expect(
        service.registrarManual(
          { personaId: "per-est", tipo: "entrada", hora: "07:50", observacion: "x" },
          "u",
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("panel del día", () => {
    it("CP-RF010-15: separa estudiantes y personal con tardanzas y quienes faltan", async () => {
      horaServidor("09:00:00");
      const grupo = {
        marcaron: [marcacion({ resultado: "tardanza" })],
        faltan: [{ personaId: "p2", nombreCompleto: "Gómez, Eva", detalle: "5.° A" }],
        totalTardanzas: 1,
      };
      repo.panelDelDia = jest.fn().mockResolvedValue({
        estudiantes: grupo,
        personal: { marcaron: [], faltan: [], totalTardanzas: 0 },
      });
      const r = await service.panelDeHoy();
      expect(repo.panelDelDia).toHaveBeenCalledWith(HOY, "anio-2027");
      expect(r.diaConClases).toBe(true);
      expect(r.estudiantes.totalTardanzas).toBe(1);
      expect(r.estudiantes.faltan).toHaveLength(1);
      expect(r.personal.marcaron).toHaveLength(0);
    });
  });

  describe("justificación", () => {
    it("CP-RF010-14: conserva el resultado y registra quién y cuándo", async () => {
      const tardanza = marcacion({ resultado: "tardanza", minutosTardanza: 5 });
      repo.findById!.mockResolvedValue(tardanza);
      repo.justificar!.mockResolvedValue({ ...tardanza, justificada: true });
      const r = await service.justificar(
        "mar-1",
        { motivo: "Cita médica con constancia" },
        "user-sub",
      );
      expect(r.resultado).toBe("tardanza");
      expect(r.justificada).toBe(true);
      expect(repo.justificar).toHaveBeenCalledWith(
        "mar-1",
        "Cita médica con constancia",
        "user-sub",
      );
      expect(audit.log).toHaveBeenCalled();
    });

    it("no justifica una marcación puntual", async () => {
      repo.findById!.mockResolvedValue(marcacion());
      await expect(service.justificar("mar-1", { motivo: "x" }, "u")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("marcación inexistente", async () => {
      repo.findById!.mockResolvedValue(null);
      await expect(service.justificar("zz", { motivo: "x" }, "u")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
