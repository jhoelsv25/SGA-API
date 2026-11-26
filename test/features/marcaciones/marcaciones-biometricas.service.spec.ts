import { MarcacionesBiometricasService } from "@/features/marcaciones/services/marcaciones-biometricas.service";
import { MarcacionesService } from "@/features/marcaciones/services/marcaciones.service";
import type { MarcacionCruda } from "@/features/marcaciones/repositories/marcaciones-biometricas.repository";

const turnoDocentes = {
  id: "turno-docentes",
  activo: true,
  horaEntrada: "07:30:00",
  horaSalida: "14:00:00",
  ventanaEntradaInicio: "06:30:00",
  ventanaEntradaFin: "09:30:00",
  ventanaSalidaInicio: "12:00:00",
  ventanaSalidaFin: "15:00:00",
  toleranciaMin: 10,
  diasLaborables: "1,2,3,4,5",
};

// 2026-11-06 es viernes
const cruda = (fechaHora: string, codigo = "D001"): MarcacionCruda => ({
  id: `cruda-${fechaHora}`,
  relojSerie: "SN-1",
  codigoUsuario: codigo,
  fechaHora,
  tipoReloj: null,
});

function construir(opciones: {
  pendientes: MarcacionCruda[];
  personaId?: string | null;
  tipoPersona?: "docentes" | "administrativos" | "estudiantes" | null;
  vigente?: boolean;
  previas?: {
    tipo: "entrada" | "salida";
    fechaHora?: string;
    origen?: "kiosko" | "manual" | "biometrico";
  }[];
  suspendido?: boolean;
  sinTurno?: boolean;
}) {
  const crudas = {
    pendientes: jest.fn().mockResolvedValue(opciones.pendientes),
    buscarPersonaId: jest
      .fn()
      .mockResolvedValue(opciones.personaId === undefined ? "p1" : opciones.personaId),
    marcarProcesada: jest.fn().mockResolvedValue(undefined),
    marcarRechazada: jest.fn().mockResolvedValue(undefined),
  };
  const marcaciones = {
    findPersonaParaMarcar: jest.fn().mockResolvedValue({
      personaId: "p1",
      tipoPersona: opciones.tipoPersona === undefined ? "docentes" : opciones.tipoPersona,
      vigente: opciones.vigente ?? true,
    }),
    marcacionesDePersonaEnFecha: jest.fn().mockResolvedValue(
      (opciones.previas ?? []).map((p, i) => ({
        id: `previa-${i}`,
        fechaHora: "2026-11-06 07:35:00",
        origen: "biometrico",
        ...p,
      })),
    ),
    reetiquetar: jest.fn().mockResolvedValue(undefined),
    insertar: jest.fn().mockResolvedValue({ id: "m1" }),
  };
  const turnos = {
    findByAplicaA: jest.fn().mockResolvedValue(opciones.sinTurno ? null : turnoDocentes),
  };
  const calendario = {
    suspendeClasesEn: jest.fn().mockResolvedValue(opciones.suspendido ?? false),
  };
  const variables = { getValor: jest.fn().mockResolvedValue("5") };
  // Las reglas son las del servicio de marcaciones: se usa el servicio real sobre repositorios simulados.
  const marcacionesService = new MarcacionesService(
    marcaciones as never,
    {} as never,
    turnos as never,
    calendario as never,
    {} as never,
    { log: jest.fn() } as never,
    { getValor: jest.fn().mockResolvedValue("30") } as never,
  );
  const servicio = new MarcacionesBiometricasService(
    crudas as never,
    marcaciones as never,
    marcacionesService,
    variables as never,
  );
  return { servicio, crudas, marcaciones, turnos };
}

describe("Marcaciones del reloj biométrico", () => {
  it("la primera marca del día es una entrada puntual con origen biométrico", async () => {
    const { servicio, crudas, marcaciones } = construir({
      pendientes: [cruda("2026-11-06 07:35:10")],
    });
    const resumen = await servicio.procesarPendientes();
    expect(resumen).toEqual({ procesadas: 1, rechazadas: 0, enEspera: 0 });
    expect(marcaciones.insertar).toHaveBeenCalledWith(
      expect.objectContaining({
        personaId: "p1",
        tipo: "entrada",
        origen: "biometrico",
        resultado: "puntual",
        minutosTardanza: 0,
        fechaHora: "2026-11-06 07:35:10",
      }),
    );
    expect(crudas.marcarProcesada).toHaveBeenCalledWith("cruda-2026-11-06 07:35:10", "m1");
  });

  it("calcula la tardanza con los minutos que exceden la tolerancia", async () => {
    const { servicio, marcaciones } = construir({ pendientes: [cruda("2026-11-06 07:55:00")] });
    await servicio.procesarPendientes();
    expect(marcaciones.insertar).toHaveBeenCalledWith(
      expect.objectContaining({ resultado: "tardanza", minutosTardanza: 15 }),
    );
  });

  it("si ya hay una entrada ese día, la marca es la salida", async () => {
    const { servicio, marcaciones } = construir({
      pendientes: [cruda("2026-11-06 14:05:00")],
      previas: [{ tipo: "entrada" }],
    });
    await servicio.procesarPendientes();
    expect(marcaciones.insertar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "salida", resultado: "puntual" }),
    );
  });

  it("un día con clases suspendidas queda fuera de turno", async () => {
    const { servicio, marcaciones } = construir({
      pendientes: [cruda("2026-11-06 07:35:00")],
      suspendido: true,
    });
    await servicio.procesarPendientes();
    expect(marcaciones.insertar).toHaveBeenCalledWith(
      expect.objectContaining({ resultado: "fuera_de_turno" }),
    );
  });

  it.each([
    [
      "código sin persona",
      { personaId: null },
      "El código del reloj no corresponde a ninguna persona.",
    ],
    [
      "estudiante",
      { tipoPersona: "estudiantes" as const },
      "El reloj biométrico solo registra personal (docentes y administrativos).",
    ],
    [
      "persona no vigente",
      { vigente: false },
      "La persona no está vigente como docente o personal administrativo.",
    ],
    [
      "entrada y salida ya marcadas",
      {
        previas: [
          { tipo: "entrada" as const, fechaHora: "2026-11-06 07:20:00" },
          { tipo: "salida" as const, fechaHora: "2026-11-06 14:03:00" },
        ],
      },
      "Ya registró su entrada y su salida hoy.",
    ],
  ])("rechaza con motivo: %s", async (_nombre, extra, motivo) => {
    const { servicio, crudas, marcaciones } = construir({
      pendientes: [cruda("2026-11-06 07:35:00")],
      ...extra,
    });
    const resumen = await servicio.procesarPendientes();
    expect(resumen).toEqual({ procesadas: 0, rechazadas: 1, enEspera: 0 });
    expect(crudas.marcarRechazada).toHaveBeenCalledWith("cruda-2026-11-06 07:35:00", motivo);
    expect(marcaciones.insertar).not.toHaveBeenCalled();
  });

  it("un error de infraestructura deja la marca pendiente y detiene el lote", async () => {
    const { servicio, crudas, marcaciones } = construir({
      pendientes: [cruda("2026-11-06 07:35:00")],
    });
    marcaciones.insertar.mockRejectedValue(new Error("conexión perdida"));
    await expect(servicio.procesarPendientes()).rejects.toThrow("conexión perdida");
    expect(crudas.marcarProcesada).not.toHaveBeenCalled();
    expect(crudas.marcarRechazada).not.toHaveBeenCalled();
  });

  it("una marca sin turno queda en espera y no bloquea las marcas de otras personas", async () => {
    const { servicio, crudas, marcaciones, turnos } = construir({
      pendientes: [
        cruda("2026-11-06 07:30:00", "SIN-TURNO"),
        cruda("2026-11-06 07:31:00", "D001"),
        cruda("2026-11-06 14:00:00", "SIN-TURNO"),
      ],
    });
    crudas.buscarPersonaId.mockImplementation((c: string) =>
      Promise.resolve(c === "SIN-TURNO" ? "p2" : "p1"),
    );
    marcaciones.findPersonaParaMarcar.mockImplementation((id: string) =>
      Promise.resolve({
        personaId: id,
        tipoPersona: id === "p2" ? "administrativos" : "docentes",
        vigente: true,
      }),
    );
    turnos.findByAplicaA.mockImplementation((tipo: string) =>
      Promise.resolve(tipo === "administrativos" ? null : turnoDocentes),
    );
    const resumen = await servicio.procesarPendientes();
    expect(resumen).toEqual({ procesadas: 1, rechazadas: 0, enEspera: 2 });
    expect(crudas.marcarProcesada).toHaveBeenCalledWith("cruda-2026-11-06 07:31:00", "m1");
    expect(crudas.marcarRechazada).not.toHaveBeenCalled();
  });

  it("sigue con la página siguiente cuando las primeras marcas quedan en espera", async () => {
    const { servicio, crudas } = construir({ pendientes: [], sinTurno: true });
    crudas.pendientes
      .mockResolvedValueOnce([cruda("2026-11-06 07:30:00", "A"), cruda("2026-11-06 07:31:00", "B")])
      .mockResolvedValueOnce([cruda("2026-11-06 07:32:00", "C")]);
    const resumen = await servicio.procesarPendientes(2);
    expect(resumen).toEqual({ procesadas: 0, rechazadas: 0, enEspera: 3 });
    expect(crudas.pendientes).toHaveBeenNthCalledWith(
      2,
      2,
      expect.objectContaining({ id: "cruda-2026-11-06 07:31:00" }),
    );
  });
});
