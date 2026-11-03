import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import {
  BiometricoRepository,
  BiometricoService,
  MENSAJES_BIOMETRICO,
  type PendienteResponseDto,
} from "@/features/biometrico";
import { EquiposService } from "@/features/equipos/equipos.service";
import {
  MarcacionesRepository,
  MarcacionesService,
  type PersonaParaMarcar,
} from "@/features/marcaciones";
import { TurnosRepository } from "@/features/turnos/repositories/turnos.repository";
import { VariablesSistemaService } from "@/features/variables-sistema/variables-sistema.service";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

const HOY = "2027-05-12"; // miércoles
const reloj = { id: "eq-1", tipo: "biometrico", nombre: "Reloj docentes", ultimoDesfaseMin: null };
const docente: PersonaParaMarcar = {
  personaId: "per-doc",
  nombres: "Luis",
  nombreCompleto: "Rojas, Luis",
  fotoUrl: null,
  tipoPersona: "docentes",
  estudianteId: null,
  vigente: true,
};
const pendiente = (parcial: Partial<PendienteResponseDto> = {}): PendienteResponseDto => ({
  id: "pen-1",
  equipoId: "eq-1",
  equipoNombre: "Reloj docentes",
  codigoBiometrico: "300",
  fechaHora: `${HOY} 07:40:00`,
  motivo: "codigo_desconocido",
  estado: "pendiente",
  personaId: null,
  motivoDescarte: null,
  resueltaEn: null,
  ...parcial,
});

function horaServidor(hora: string, fecha = HOY) {
  jest.useFakeTimers({ now: new Date(`${fecha}T${hora}-05:00`) });
}

describe("RF-022: Integración con biométrico ZKTeco", () => {
  let service: BiometricoService;
  let repo: Mocks<BiometricoRepository>;
  let equipos: Mocks<EquiposService>;
  let marcaciones: Mocks<MarcacionesService>;
  let marcacionesRepo: Mocks<MarcacionesRepository>;
  let turnos: Mocks<TurnosRepository>;
  let variables: Mocks<VariablesSistemaService>;
  let audit: Mocks<AuditService>;

  beforeEach(() => {
    horaServidor("08:00:00");
    repo = {
      findPersonaPorCodigo: jest.fn().mockResolvedValue({ id: "per-doc" }),
      findPersonaBasica: jest.fn().mockResolvedValue({
        id: "per-doc",
        nombreCompleto: "Rojas, Luis",
        codigoBiometrico: null,
      }),
      asignarCodigo: jest.fn().mockResolvedValue(undefined),
      insertarPendiente: jest.fn().mockResolvedValue(true),
      listarPendientes: jest.fn().mockResolvedValue([]),
      findPendientePorId: jest.fn().mockResolvedValue(pendiente()),
      resolverPendiente: jest
        .fn()
        .mockImplementation((_id: string, r: { estado: string }) =>
          Promise.resolve(pendiente({ estado: r.estado as PendienteResponseDto["estado"] })),
        ),
      registrarLatido: jest.fn().mockResolvedValue(undefined),
      listarRelojes: jest.fn().mockResolvedValue([]),
    };
    equipos = { validarKiosko: jest.fn().mockResolvedValue({ valido: true, equipo: reloj }) };
    marcaciones = {
      registrarDesdeReloj: jest
        .fn()
        .mockResolvedValue({ estado: "registrada", marcacion: { id: "mar-1" } }),
    };
    marcacionesRepo = { findPersonaParaMarcar: jest.fn().mockResolvedValue(docente) };
    turnos = {
      findByAplicaA: jest.fn().mockResolvedValue({
        diasLaborables: "1,2,3,4,5",
        ventanaEntradaInicio: "06:30:00",
        ventanaSalidaFin: "15:00:00",
      }),
    };
    variables = {
      getValor: jest.fn().mockImplementation((_c: string, d: string) => Promise.resolve(d)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new BiometricoService(
      repo as unknown as BiometricoRepository,
      equipos as unknown as EquiposService,
      marcaciones as unknown as MarcacionesService,
      marcacionesRepo as unknown as MarcacionesRepository,
      turnos as unknown as TurnosRepository,
      variables as unknown as VariablesSistemaService,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => jest.useRealTimers());

  describe("HU1: reloj y código biométrico", () => {
    it("CP-RF022-03: asigna el código biométrico a una persona", async () => {
      const r = await service.asignarCodigo("per-doc", { codigo: "152" }, "u-1");
      expect(r.mensaje).toBe("Código biométrico asignado a Rojas, Luis.");
      expect(repo.asignarCodigo).toHaveBeenCalledWith("per-doc", "152");
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ tabla: "personas", registroId: "per-doc" }),
      );
    });

    it("CP-RF022-04: un código que ya es de otra persona se rechaza", async () => {
      repo.findPersonaPorCodigo!.mockResolvedValue({ id: "otra" });
      await expect(service.asignarCodigo("per-doc", { codigo: "152" }, "u-1")).rejects.toThrow(
        new ConflictException(MENSAJES_BIOMETRICO.CODIGO_REPETIDO),
      );
      expect(repo.asignarCodigo).not.toHaveBeenCalled();
    });

    it("CP-RF022-04b: reasignar el mismo código a la misma persona es válido", async () => {
      repo.findPersonaPorCodigo!.mockResolvedValue({ id: "per-doc" });
      await expect(
        service.asignarCodigo("per-doc", { codigo: "152" }, "u-1"),
      ).resolves.toBeDefined();
    });

    it("CP-RF022-04c: persona inexistente", async () => {
      repo.findPersonaBasica!.mockResolvedValue(null);
      await expect(service.asignarCodigo("x", { codigo: "152" }, "u-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("CP-RF022-03c: consulta el código biométrico actual de una persona", async () => {
      repo.findPersonaBasica!.mockResolvedValue({
        id: "per-doc",
        nombreCompleto: "Rojas, Luis",
        codigoBiometrico: "152",
      });
      const r = await service.obtenerCodigo("per-doc");
      expect(r.codigoBiometrico).toBe("152");
    });

    it("CP-RF022-03b: quita el código biométrico", async () => {
      const r = await service.quitarCodigo("per-doc", "u-1");
      expect(r.codigoBiometrico).toBeNull();
      expect(repo.asignarCodigo).toHaveBeenCalledWith("per-doc", null);
    });
  });

  describe("HU3: lectura, envío y confiabilidad", () => {
    it("CP-RF022-15: el lote registra la marcación del docente", async () => {
      const r = await service.recibirLote("clave", {
        marcaciones: [{ codigo: "152", fechaHora: `${HOY} 07:35:12` }],
      });
      expect(r).toMatchObject({ recibidas: 1, registradas: 1, pendientes: 0, rechazadas: 0 });
      expect(marcaciones.registrarDesdeReloj).toHaveBeenCalledWith(
        expect.objectContaining({ tipoPersona: "docentes" }),
        "eq-1",
        `${HOY} 07:35:12`,
        5,
      );
      expect(r.horaServidor).toBe(`${HOY} 08:00:00`);
    });

    it("CP-RF022-16: las marcaciones atrasadas se procesan en orden de hora", async () => {
      await service.recibirLote("clave", {
        marcaciones: [
          { codigo: "152", fechaHora: `${HOY} 14:03:00` },
          { codigo: "152", fechaHora: `${HOY} 07:35:00` },
        ],
      });
      const llamadas = marcaciones.registrarDesdeReloj!.mock.calls as [unknown, unknown, string][];
      const horas = llamadas.map((c) => c[2]);
      expect(horas).toEqual([`${HOY} 07:35:00`, `${HOY} 14:03:00`]);
    });

    it("CP-RF022-17: una marcación reenviada se cuenta como duplicada", async () => {
      marcaciones.registrarDesdeReloj!.mockResolvedValue({ estado: "duplicada" });
      const r = await service.recibirLote("clave", {
        marcaciones: [{ codigo: "152", fechaHora: `${HOY} 07:35:12` }],
      });
      expect(r).toMatchObject({ registradas: 0, duplicadas: 1 });
    });

    it("CP-RF022-10c: el rebote del dedo se cuenta como ignorada", async () => {
      marcaciones.registrarDesdeReloj!.mockResolvedValue({ estado: "ignorada", razon: "rebote" });
      const r = await service.recibirLote("clave", {
        marcaciones: [{ codigo: "152", fechaHora: `${HOY} 07:37:00` }],
      });
      expect(r.ignoradas).toBe(1);
    });

    it("CP-RF022-15b: una fecha inválida se rechaza sin detener el lote", async () => {
      const r = await service.recibirLote("clave", {
        marcaciones: [
          { codigo: "152", fechaHora: "2027-13-45 07:35:12" },
          { codigo: "152", fechaHora: `${HOY} 07:35:12` },
        ],
      });
      expect(r).toMatchObject({ recibidas: 2, rechazadas: 1, registradas: 1 });
    });

    it("CP-RF022-18: una clave inválida se rechaza y queda en la bitácora", async () => {
      equipos.validarKiosko!.mockRejectedValue(new UnauthorizedException("x"));
      await expect(
        service.recibirLote("mala", {
          marcaciones: [{ codigo: "1", fechaHora: `${HOY} 07:35:12` }],
        }),
      ).rejects.toThrow(new UnauthorizedException(MENSAJES_BIOMETRICO.CLAVE_INVALIDA));
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ tabla: "marcaciones_biometrico_rechazos", usuarioId: null }),
      );
    });

    it("CP-RF022-18b: la clave de un kiosko (no biométrico) tampoco sirve", async () => {
      equipos.validarKiosko!.mockResolvedValue({
        valido: true,
        equipo: { ...reloj, tipo: "kiosko" },
      });
      await expect(
        service.registrarLatido("clave-kiosko", { relojResponde: true }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("CP-RF022-18c: sin clave se rechaza", async () => {
      equipos.validarKiosko!.mockRejectedValue(new UnauthorizedException("x"));
      await expect(service.registrarLatido(undefined, { relojResponde: true })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("CP-RF022-19: un desfase mayor al permitido pide poner el reloj en hora y queda en bitácora", async () => {
      const r = await service.registrarLatido("clave", {
        relojResponde: true,
        horaReloj: `${HOY} 07:50:00`,
      });
      expect(r).toEqual({ horaServidor: `${HOY} 08:00:00`, desfaseMinutos: 10, ponerEnHora: true });
      expect(audit.log).toHaveBeenCalledTimes(1);
      expect(repo.registrarLatido).toHaveBeenCalledWith(
        "eq-1",
        expect.objectContaining({ relojResponde: true, desfaseMinutos: 10 }),
      );
    });

    it("CP-RF022-19b: un desfase dentro de lo permitido no pide corrección", async () => {
      const r = await service.registrarLatido("clave", {
        relojResponde: true,
        horaReloj: `${HOY} 07:59:00`,
      });
      expect(r.ponerEnHora).toBe(false);
      expect(audit.log).not.toHaveBeenCalled();
    });

    it("CP-RF022-19c: si ya estaba desfasado no se vuelve a registrar en bitácora", async () => {
      equipos.validarKiosko!.mockResolvedValue({
        valido: true,
        equipo: { ...reloj, ultimoDesfaseMin: 10 },
      });
      await service.registrarLatido("clave", { relojResponde: true, horaReloj: `${HOY} 07:50:00` });
      expect(audit.log).not.toHaveBeenCalled();
    });

    it("CP-RF022-21b: un latido sin respuesta del reloj no actualiza la hora del reloj", async () => {
      await service.registrarLatido("clave", { relojResponde: false });
      expect(repo.registrarLatido).toHaveBeenCalledWith(
        "eq-1",
        expect.objectContaining({ relojResponde: false, desfaseMinutos: null }),
      );
    });
  });

  describe("HU2: marcaciones que no se pueden asignar", () => {
    it("CP-RF022-22: un código desconocido va a la bandeja de pendientes", async () => {
      repo.findPersonaPorCodigo!.mockResolvedValue(null);
      const r = await service.recibirLote("clave", {
        marcaciones: [{ codigo: "300", fechaHora: `${HOY} 07:40:00` }],
      });
      expect(r.pendientes).toBe(1);
      expect(repo.insertarPendiente).toHaveBeenCalledWith({
        equipoId: "eq-1",
        codigoBiometrico: "300",
        fechaHora: `${HOY} 07:40:00`,
        motivo: "codigo_desconocido",
      });
      expect(marcaciones.registrarDesdeReloj).not.toHaveBeenCalled();
    });

    it("CP-RF022-14: quien no es docente activo va a la bandeja", async () => {
      marcacionesRepo.findPersonaParaMarcar!.mockResolvedValue({
        ...docente,
        tipoPersona: "estudiantes",
      });
      const r = await service.recibirLote("clave", {
        marcaciones: [{ codigo: "300", fechaHora: `${HOY} 07:40:00` }],
      });
      expect(r.pendientes).toBe(1);
      expect(repo.insertarPendiente).toHaveBeenCalledWith(
        expect.objectContaining({ motivo: "no_docente" }),
      );
    });

    it("CP-RF022-14b: un docente inactivo va a la bandeja", async () => {
      marcacionesRepo.findPersonaParaMarcar!.mockResolvedValue({ ...docente, vigente: false });
      const r = await service.recibirLote("clave", {
        marcaciones: [{ codigo: "300", fechaHora: `${HOY} 07:40:00` }],
      });
      expect(r.pendientes).toBe(1);
    });

    it("CP-RF022-14c: sin turno de docentes la marcación queda pendiente", async () => {
      marcaciones.registrarDesdeReloj!.mockResolvedValue({ estado: "sin_turno" });
      const r = await service.recibirLote("clave", {
        marcaciones: [{ codigo: "152", fechaHora: `${HOY} 07:40:00` }],
      });
      expect(r.pendientes).toBe(1);
      expect(repo.insertarPendiente).toHaveBeenCalledWith(
        expect.objectContaining({ motivo: "sin_turno" }),
      );
    });

    it("CP-RF022-22b: la misma pendiente reenviada se cuenta como duplicada", async () => {
      repo.findPersonaPorCodigo!.mockResolvedValue(null);
      repo.insertarPendiente!.mockResolvedValue(false);
      const r = await service.recibirLote("clave", {
        marcaciones: [{ codigo: "300", fechaHora: `${HOY} 07:40:00` }],
      });
      expect(r).toMatchObject({ pendientes: 0, duplicadas: 1 });
    });

    it("CP-RF022-23: asignar una pendiente aplica las reglas con la hora original", async () => {
      const r = await service.asignarPendiente("pen-1", { personaId: "per-doc" }, "u-1");
      expect(r.mensaje).toBe("Marcación asignada a Rojas, Luis.");
      expect(marcaciones.registrarDesdeReloj).toHaveBeenCalledWith(
        expect.objectContaining({ personaId: "per-doc" }),
        "eq-1",
        `${HOY} 07:40:00`,
        5,
      );
      expect(repo.resolverPendiente).toHaveBeenCalledWith(
        "pen-1",
        expect.objectContaining({ estado: "asignada", personaId: "per-doc", marcacionId: "mar-1" }),
      );
      expect(audit.log).toHaveBeenCalled();
    });

    it("CP-RF022-23b: puede vincular además el código biométrico", async () => {
      await service.asignarPendiente(
        "pen-1",
        { personaId: "per-doc", vincularCodigo: true },
        "u-1",
      );
      expect(repo.asignarCodigo).toHaveBeenCalledWith("per-doc", "300");
    });

    it("CP-RF022-23c: no vincula un código que ya es de otra persona", async () => {
      repo.findPersonaPorCodigo!.mockResolvedValue({ id: "otra" });
      await expect(
        service.asignarPendiente("pen-1", { personaId: "per-doc", vincularCodigo: true }, "u-1"),
      ).rejects.toThrow(ConflictException);
    });

    it("CP-RF022-23d: solo se asigna a un docente activo", async () => {
      marcacionesRepo.findPersonaParaMarcar!.mockResolvedValue({
        ...docente,
        tipoPersona: "estudiantes",
      });
      await expect(
        service.asignarPendiente("pen-1", { personaId: "per-est" }, "u-1"),
      ).rejects.toThrow(new BadRequestException(MENSAJES_BIOMETRICO.PERSONA_NO_DOCENTE));
    });

    it("CP-RF022-23e: si el docente ya tiene la jornada completa no se asigna", async () => {
      marcaciones.registrarDesdeReloj!.mockResolvedValue({
        estado: "ignorada",
        razon: "jornada_completa",
      });
      await expect(
        service.asignarPendiente("pen-1", { personaId: "per-doc" }, "u-1"),
      ).rejects.toThrow(new BadRequestException(MENSAJES_BIOMETRICO.YA_COMPLETO));
      expect(repo.resolverPendiente).not.toHaveBeenCalled();
    });

    it("CP-RF022-23f: una pendiente ya resuelta no se puede resolver otra vez", async () => {
      repo.findPendientePorId!.mockResolvedValue(pendiente({ estado: "descartada" }));
      await expect(
        service.asignarPendiente("pen-1", { personaId: "per-doc" }, "u-1"),
      ).rejects.toThrow(new ConflictException(MENSAJES_BIOMETRICO.PENDIENTE_YA_RESUELTA));
    });

    it("CP-RF022-23g: una pendiente inexistente", async () => {
      repo.findPendientePorId!.mockResolvedValue(null);
      await expect(service.descartarPendiente("x", { motivo: "ok" }, "u-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("CP-RF022-24: descartar una pendiente exige el motivo", async () => {
      await expect(service.descartarPendiente("pen-1", { motivo: "  " }, "u-1")).rejects.toThrow(
        new BadRequestException(MENSAJES_BIOMETRICO.MOTIVO_DESCARTE_REQUERIDO),
      );
      expect(repo.resolverPendiente).not.toHaveBeenCalled();
    });

    it("CP-RF022-24b: descarta con motivo y lo deja en bitácora", async () => {
      const r = await service.descartarPendiente("pen-1", { motivo: "Visita externa" }, "u-1");
      expect(r.mensaje).toBe("Marcación descartada.");
      expect(repo.resolverPendiente).toHaveBeenCalledWith(
        "pen-1",
        expect.objectContaining({ estado: "descartada", motivoDescarte: "Visita externa" }),
      );
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe("HU3: estado de la app y del reloj", () => {
    const relojBase = {
      id: "eq-1",
      nombre: "Reloj docentes",
      ubicacion: "Puerta principal",
      activo: true,
      ultimoLatidoEn: `${HOY} 07:58:00`,
      relojRespondioEn: `${HOY} 07:58:00`,
      ultimoDesfaseMin: 0,
    };

    it("CP-RF022-20b: todo en orden", async () => {
      repo.listarRelojes!.mockResolvedValue([relojBase]);
      const [estado] = await service.estadoRelojes();
      expect(estado).toMatchObject({ estado: "ok", alertas: [] });
    });

    it("CP-RF022-20: la app sin comunicarse en horario genera alerta", async () => {
      repo.listarRelojes!.mockResolvedValue([{ ...relojBase, ultimoLatidoEn: `${HOY} 07:30:00` }]);
      const [estado] = await service.estadoRelojes();
      expect(estado.estado).toBe("app_sin_conexion");
      expect(estado.alertas).toEqual([
        "La app puente del reloj Reloj docentes no se comunica desde las 07:30.",
      ]);
    });

    it("CP-RF022-21: la app avisa pero el reloj no responde", async () => {
      repo.listarRelojes!.mockResolvedValue([
        { ...relojBase, relojRespondioEn: `${HOY} 07:20:00` },
      ]);
      const [estado] = await service.estadoRelojes();
      expect(estado.estado).toBe("reloj_no_responde");
      expect(estado.alertas[0]).toBe(
        "El reloj Reloj docentes no responde a la app puente desde las 07:20.",
      );
    });

    it("CP-RF022-20c: fuera del horario de marcación no hay alerta por silencio", async () => {
      horaServidor("20:00:00");
      repo.listarRelojes!.mockResolvedValue([{ ...relojBase, ultimoLatidoEn: `${HOY} 07:30:00` }]);
      const [estado] = await service.estadoRelojes();
      expect(estado).toMatchObject({ estado: "fuera_de_horario", alertas: [] });
    });

    it("CP-RF022-20d: un reloj que nunca se conectó avisa", async () => {
      repo.listarRelojes!.mockResolvedValue([
        { ...relojBase, ultimoLatidoEn: null, relojRespondioEn: null, ultimoDesfaseMin: null },
      ]);
      const [estado] = await service.estadoRelojes();
      expect(estado.estado).toBe("nunca_conectado");
      expect(estado.alertas).toHaveLength(1);
    });

    it("CP-RF022-19d: el desfase alto aparece como alerta", async () => {
      repo.listarRelojes!.mockResolvedValue([{ ...relojBase, ultimoDesfaseMin: 12 }]);
      const [estado] = await service.estadoRelojes();
      expect(estado.alertas[0]).toBe(
        "El reloj Reloj docentes tiene la hora desfasada 12 minutos. Se sincronizó con el servidor.",
      );
    });
  });
});
