import { AuditService } from "@/common/services/audit.service";
import { AniosAcademicosService } from "@/features/anio-escolar/anios.service";
import { CalendarioService } from "@/features/calendario/calendario.service";
import { EquiposService } from "@/features/equipos/equipos.service";
import {
  MarcacionesRepository,
  MarcacionesService,
  type MarcacionResponseDto,
  type PersonaAutenticada,
} from "@/features/marcaciones";
import { TurnosRepository } from "@/features/turnos/repositories/turnos.repository";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

const HOY = "2027-05-12"; // miércoles
const turnoDocentes = {
  id: "turno-doc",
  aplicaA: "docentes",
  horaEntrada: "07:30:00",
  horaSalida: "14:00:00",
  ventanaEntradaInicio: "06:30:00",
  ventanaEntradaFin: "09:30:00",
  ventanaSalidaInicio: "12:00:00",
  ventanaSalidaFin: "15:00:00",
  toleranciaMin: 10,
  diasLaborables: "1,2,3,4,5",
  activo: true,
};
const docente: PersonaAutenticada = {
  personaId: "per-doc",
  nombres: "Luis",
  nombreCompleto: "Rojas, Luis",
  fotoUrl: null,
  tipoPersona: "docentes",
  estudianteId: null,
  vigente: true,
};

describe("RF-022: registrar una marcación leída del reloj", () => {
  let service: MarcacionesService;
  let repo: Mocks<MarcacionesRepository>;
  let turnos: Mocks<TurnosRepository>;
  let calendario: Mocks<CalendarioService>;

  beforeEach(() => {
    repo = {
      marcacionesDePersonaEnFecha: jest.fn().mockResolvedValue([]),
      insertar: jest
        .fn()
        .mockImplementation((d: Partial<MarcacionResponseDto>) =>
          Promise.resolve({ ...d, id: "nueva" }),
        ),
    };
    turnos = { findByAplicaA: jest.fn().mockResolvedValue(turnoDocentes) };
    calendario = { suspendeClasesEn: jest.fn().mockResolvedValue(false) };
    service = new MarcacionesService(
      repo as unknown as MarcacionesRepository,
      {} as EquiposService,
      turnos as unknown as TurnosRepository,
      calendario as unknown as CalendarioService,
      {} as AniosAcademicosService,
      { log: jest.fn() } as unknown as AuditService,
    );
  });

  it("CP-RF022-08: la primera marcación del día es entrada puntual con origen biometrico", async () => {
    const r = await service.registrarDesdeReloj(docente, "eq-1", `${HOY} 07:35:12`, 5);
    expect(r.estado).toBe("registrada");
    expect(repo.insertar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: "entrada",
        origen: "biometrico",
        resultado: "puntual",
        equipoId: "eq-1",
        fechaHora: `${HOY} 07:35:12`,
        credencialId: null,
      }),
    );
  });

  it("CP-RF022-09: entrada pasada la tolerancia es tardanza con los minutos", async () => {
    await service.registrarDesdeReloj(docente, "eq-1", `${HOY} 07:50:00`, 5);
    expect(repo.insertar).toHaveBeenCalledWith(
      expect.objectContaining({ resultado: "tardanza", minutosTardanza: 10 }),
    );
  });

  it("CP-RF022-11: la segunda marcación (fuera del rebote) es la salida, sin importar el botón del reloj", async () => {
    repo.marcacionesDePersonaEnFecha!.mockResolvedValue([
      { id: "m1", tipo: "entrada", fechaHora: `${HOY} 07:35:12` },
    ]);
    await service.registrarDesdeReloj(docente, "eq-1", `${HOY} 14:03:00`, 5);
    expect(repo.insertar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "salida", resultado: "puntual" }),
    );
  });

  it("CP-RF022-12: salida antes de la hora oficial es salida anticipada", async () => {
    repo.marcacionesDePersonaEnFecha!.mockResolvedValue([
      { id: "m1", tipo: "entrada", fechaHora: `${HOY} 07:35:12` },
    ]);
    await service.registrarDesdeReloj(docente, "eq-1", `${HOY} 12:30:00`, 5);
    expect(repo.insertar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "salida", resultado: "salida_anticipada" }),
    );
  });

  it("CP-RF022-10: otra marcación a los pocos minutos es un rebote y no se guarda", async () => {
    repo.marcacionesDePersonaEnFecha!.mockResolvedValue([
      { id: "m1", tipo: "entrada", fechaHora: `${HOY} 07:35:12` },
    ]);
    const r = await service.registrarDesdeReloj(docente, "eq-1", `${HOY} 07:37:00`, 5);
    expect(r).toEqual({ estado: "ignorada", razon: "rebote" });
    expect(repo.insertar).not.toHaveBeenCalled();
  });

  it("CP-RF022-10b: con entrada y salida ya registradas no se guarda una tercera", async () => {
    repo.marcacionesDePersonaEnFecha!.mockResolvedValue([
      { id: "m1", tipo: "entrada", fechaHora: `${HOY} 07:35:12` },
      { id: "m2", tipo: "salida", fechaHora: `${HOY} 14:03:00` },
    ]);
    const r = await service.registrarDesdeReloj(docente, "eq-1", `${HOY} 15:00:00`, 5);
    expect(r).toEqual({ estado: "ignorada", razon: "jornada_completa" });
  });

  it("CP-RF022-17b: una marcación ya guardada con la misma hora es duplicada", async () => {
    repo.marcacionesDePersonaEnFecha!.mockResolvedValue([
      { id: "m1", tipo: "entrada", fechaHora: `${HOY} 07:35:12` },
    ]);
    const r = await service.registrarDesdeReloj(docente, "eq-1", `${HOY} 07:35:12`, 5);
    expect(r).toEqual({ estado: "duplicada" });
    expect(repo.insertar).not.toHaveBeenCalled();
  });

  it("CP-RF022-17c: si la base rechaza por clave única, se cuenta como duplicada", async () => {
    repo.insertar!.mockRejectedValue({ code: "23505" });
    const r = await service.registrarDesdeReloj(docente, "eq-1", `${HOY} 07:35:12`, 5);
    expect(r).toEqual({ estado: "duplicada" });
  });

  it("CP-RF022-13: en un día sin clases la marcación es fuera_de_turno", async () => {
    calendario.suspendeClasesEn!.mockResolvedValue(true);
    await service.registrarDesdeReloj(docente, "eq-1", `${HOY} 07:35:12`, 5);
    expect(repo.insertar).toHaveBeenCalledWith(
      expect.objectContaining({ resultado: "fuera_de_turno" }),
    );
  });

  it("CP-RF022-13b: en un sábado la marcación es fuera_de_turno", async () => {
    await service.registrarDesdeReloj(docente, "eq-1", "2027-05-15 07:35:12", 5);
    expect(repo.insertar).toHaveBeenCalledWith(
      expect.objectContaining({ resultado: "fuera_de_turno" }),
    );
  });

  it("CP-RF022-14d: sin turno de docentes configurado, no registra y lo informa", async () => {
    turnos.findByAplicaA!.mockResolvedValue(null);
    const r = await service.registrarDesdeReloj(docente, "eq-1", `${HOY} 07:35:12`, 5);
    expect(r).toEqual({ estado: "sin_turno" });
  });
});
