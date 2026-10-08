import { ConflictException, NotFoundException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { CreateTurnoDto, UpdateTurnoDto } from "@/features/turnos/dto";
import { TurnosRepository } from "@/features/turnos/repositories/turnos.repository";
import { TurnosService } from "@/features/turnos/turnos.service";

describe("TurnosService (RF-004 HU2)", () => {
  let service: TurnosService;
  let mockRepository: jest.Mocked<Partial<TurnosRepository>>;
  let mockAuditService: jest.Mocked<Partial<AuditService>>;

  const mockTurno = {
    id: "turno-docentes-id",
    aplicaA: "docentes" as const,
    horaEntrada: "07:30:00",
    horaSalida: "13:30:00",
    ventanaEntradaInicio: "06:30:00",
    ventanaEntradaFin: "09:30:00",
    ventanaSalidaInicio: "12:30:00",
    ventanaSalidaFin: "15:30:00",
    toleranciaMin: 10,
    diasLaborables: "1,2,3,4,5",
    activo: true,
    creadoEn: "2026-10-06T20:30:30Z",
    actualizadoEn: "2026-10-08T07:35:17Z",
  };

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn().mockResolvedValue([mockTurno]),
      findById: jest.fn().mockResolvedValue(mockTurno),
      findByAplicaA: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockTurno),
      update: jest.fn().mockResolvedValue({ ...mockTurno, horaEntrada: "08:00:00" }),
      toggleActivo: jest.fn().mockResolvedValue({ ...mockTurno, activo: false }),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new TurnosService(
      mockRepository as unknown as TurnosRepository,
      mockAuditService as unknown as AuditService,
    );
  });

  describe("create", () => {
    const validDto: CreateTurnoDto = {
      aplicaA: "docentes",
      horaEntrada: "07:30",
      horaSalida: "13:30",
      ventanaEntradaInicio: "06:30",
      ventanaEntradaFin: "09:30",
      ventanaSalidaInicio: "12:30",
      ventanaSalidaFin: "15:30",
      toleranciaMin: 10,
      diasLaborables: "1,2,3,4,5",
    };

    it("debe crear el turno y registrar auditoría (Escenario: Registrar el turno de docentes)", async () => {
      const result = await service.create(validDto, "user-admin", "127.0.0.1");

      expect(mockRepository.create).toHaveBeenCalledWith(validDto);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-admin",
          accion: "crear",
          tabla: "turnos",
        }),
      );
      expect(result.aplicaA).toBe("docentes");
    });

    it("debe rechazar si ya existe un turno para ese tipo de persona (Escenario: Turno repetido)", async () => {
      mockRepository.findByAplicaA = jest.fn().mockResolvedValue(mockTurno);

      await expect(service.create(validDto, "user-admin")).rejects.toThrow(
        new ConflictException("Ya existe un turno para este tipo de persona."),
      );
    });
  });

  describe("update", () => {
    it("debe modificar el turno y registrar auditoría (Escenario: Cambiar un turno)", async () => {
      const dto: UpdateTurnoDto = {
        horaEntrada: "08:00",
        horaSalida: "13:30",
        ventanaEntradaInicio: "06:30",
        ventanaEntradaFin: "09:30",
        ventanaSalidaInicio: "12:30",
        ventanaSalidaFin: "15:30",
        toleranciaMin: 10,
        diasLaborables: "1,2,3,4,5",
      };

      const result = await service.update(mockTurno.id, dto, "user-admin", "127.0.0.1");

      expect(mockRepository.update).toHaveBeenCalledWith(mockTurno.id, dto);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-admin",
          accion: "actualizar",
          tabla: "turnos",
        }),
      );
      expect(result.horaEntrada).toBe("08:00:00");
    });

    it("debe lanzar NotFoundException si el turno a modificar no existe", async () => {
      mockRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(service.update("no-existe", {}, "user-admin")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("toggleActivo", () => {
    it("debe desactivar el turno y registrar auditoría (Escenario: Desactivar un turno)", async () => {
      const result = await service.toggleActivo(mockTurno.id, false, "user-admin", "127.0.0.1");

      expect(mockRepository.toggleActivo).toHaveBeenCalledWith(mockTurno.id, false);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-admin",
          accion: "actualizar",
          tabla: "turnos",
        }),
      );
      expect(result.activo).toBe(false);
    });
  });
});
