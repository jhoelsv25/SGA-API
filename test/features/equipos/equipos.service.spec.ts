import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { CreateEquipoDto } from "@/features/equipos/dto";
import { EquiposService } from "@/features/equipos/equipos.service";
import { EquiposRepository } from "@/features/equipos/repositories/equipos.repository";

describe("EquiposService (RF-004 HU3)", () => {
  let service: EquiposService;
  let mockRepository: jest.Mocked<Partial<EquiposRepository>>;
  let mockAuditService: jest.Mocked<Partial<AuditService>>;

  const mockEquipo = {
    id: "equipo-kiosko-estudiantes-id",
    nombre: "Kiosko Estudiantes",
    ubicacion: "Puerta principal",
    tipo: "kiosko" as const,
    proposito: "marcacion" as const,
    usuariosPermitidos: "estudiantes",
    numeroSerie: null,
    autorizado: false,
    autorizadoEn: null,
    autorizadoPorId: null,
    activo: true,
    ultimoAcceso: null,
    creadoEn: "2026-10-06T20:30:30Z",
    actualizadoEn: "2026-10-08T07:35:17Z",
  };

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn().mockResolvedValue([mockEquipo]),
      findById: jest.fn().mockResolvedValue(mockEquipo),
      findByName: jest.fn().mockResolvedValue(null),
      findByTokenHash: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockEquipo),
      update: jest.fn().mockResolvedValue(mockEquipo),
      toggleActivo: jest.fn().mockResolvedValue({ ...mockEquipo, activo: false }),
      authorize: jest.fn().mockResolvedValue({ ...mockEquipo, autorizado: true }),
      updateLastAccess: jest.fn().mockResolvedValue(undefined),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new EquiposService(
      mockRepository as unknown as EquiposRepository,
      mockAuditService as unknown as AuditService,
    );
  });

  describe("create", () => {
    it("debe registrar un kiosko de marcación (Escenario: Registrar un kiosko de marcación)", async () => {
      const dto: CreateEquipoDto = {
        nombre: "Kiosko Estudiantes",
        ubicacion: "Puerta principal",
        tipo: "kiosko",
        proposito: "marcacion",
        usuariosPermitidos: "estudiantes",
      };

      const result = await service.create(dto, "user-soporte", "127.0.0.1");

      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-soporte",
          accion: "crear",
          tabla: "equipos_autorizados",
        }),
      );
      expect(result.nombre).toBe("Kiosko Estudiantes");
    });

    it("debe registrar el kiosko de sesiones si es exclusivo de docentes (Escenario: Registrar el kiosko de sesiones)", async () => {
      const dto: CreateEquipoDto = {
        nombre: "Kiosko de Sesiones",
        ubicacion: "Subdirección",
        tipo: "kiosko",
        proposito: "sesiones",
        usuariosPermitidos: "docentes",
      };

      await service.create(dto, "user-soporte");
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
    });

    it("debe rechazar si el kiosko de sesiones no es de tipo kiosko o no es exclusivo de docentes (Escenario: Kiosko de sesiones mal configurado)", async () => {
      // Caso 1: propósito sesiones con tipo biométrico
      await expect(
        service.create(
          {
            nombre: "Reloj Sesiones",
            ubicacion: "Subdirección",
            tipo: "biometrico",
            proposito: "sesiones",
            usuariosPermitidos: "docentes",
            numeroSerie: "SN-12345",
          },
          "user-soporte",
        ),
      ).rejects.toThrow(
        new BadRequestException(
          "Un equipo de sesiones debe ser un kiosko de uso exclusivo de docentes.",
        ),
      );

      // Caso 2: propósito sesiones con estudiantes incluidos
      await expect(
        service.create(
          {
            nombre: "Kiosko Sesiones Mixto",
            ubicacion: "Subdirección",
            tipo: "kiosko",
            proposito: "sesiones",
            usuariosPermitidos: "docentes,estudiantes",
          },
          "user-soporte",
        ),
      ).rejects.toThrow(
        new BadRequestException(
          "Un equipo de sesiones debe ser un kiosko de uso exclusivo de docentes.",
        ),
      );
    });

    it("debe rechazar si no se especifica quién puede usar el equipo (Escenario: Equipo sin usuarios)", async () => {
      await expect(
        service.create(
          {
            nombre: "Kiosko Vacío",
            ubicacion: "Entrada",
            tipo: "kiosko",
            proposito: "marcacion",
            usuariosPermitidos: "",
          },
          "user-soporte",
        ),
      ).rejects.toThrow(new BadRequestException("Indique quién puede usar este equipo."));
    });

    it("debe rechazar si ya existe un equipo con ese nombre (Escenario: Nombre de equipo repetido)", async () => {
      mockRepository.findByName = jest.fn().mockResolvedValue(mockEquipo);

      await expect(
        service.create(
          {
            nombre: "Kiosko Estudiantes",
            ubicacion: "Puerta",
            tipo: "kiosko",
            proposito: "marcacion",
            usuariosPermitidos: "estudiantes",
          },
          "user-soporte",
        ),
      ).rejects.toThrow(new ConflictException("Ya existe un equipo con ese nombre."));
    });

    it("debe registrar un reloj biométrico requiriendo su número de serie (Escenario: Registrar un reloj biométrico)", async () => {
      const dto: CreateEquipoDto = {
        nombre: "Biométrico ZKTeco Puerta 2",
        ubicacion: "Puerta secundaria",
        tipo: "biometrico",
        proposito: "marcacion",
        usuariosPermitidos: "docentes,administrativos",
        numeroSerie: "ZK-987654321",
      };

      await service.create(dto, "user-soporte");
      expect(mockRepository.create).toHaveBeenCalledWith(dto);

      // Si falta el número de serie en biométrico, debe rechazar
      await expect(
        service.create({ ...dto, numeroSerie: undefined }, "user-soporte"),
      ).rejects.toThrow(
        new BadRequestException("Debe ingresar el número de serie para equipos biométricos."),
      );
    });
  });

  describe("autorizar", () => {
    it("debe autorizar el equipo, generar token y registrar auditoría (Escenario: Autorizar un equipo)", async () => {
      const res = await service.autorizar(mockEquipo.id, "user-soporte", "192.168.1.100");

      expect(res.message).toBe("Equipo autorizado. Ya puede usarse como kiosko.");
      expect(res.tokenAutorizacion).toBeDefined();
      expect(res.tokenAutorizacion.length).toBe(64); // 32 bytes hex
      expect(mockRepository.authorize).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-soporte",
          accion: "actualizar",
          tabla: "equipos_autorizados",
        }),
      );
    });

    it("CP-RF022-01: al generar la clave de un reloj biométrico avisa que no se volverá a mostrar", async () => {
      mockRepository.findById = jest
        .fn()
        .mockResolvedValue({ ...mockEquipo, tipo: "biometrico", numeroSerie: "ZK-1" });
      const res = await service.autorizar(mockEquipo.id, "user-soporte");

      expect(res.message).toBe(
        "Reloj biométrico autorizado. Copie la clave de la app puente: no se volverá a mostrar.",
      );
      expect(res.tokenAutorizacion).toHaveLength(64);
    });

    it("debe rechazar autorizar si el equipo está inactivo", async () => {
      mockRepository.findById = jest.fn().mockResolvedValue({ ...mockEquipo, activo: false });

      await expect(service.autorizar(mockEquipo.id, "user-soporte")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("validarKiosko", () => {
    it("debe validar exitosamente si el token corresponde a un equipo activo y autorizado", async () => {
      const equipoAutorizadoYActivo = {
        ...mockEquipo,
        autorizado: true,
        activo: true,
      };
      mockRepository.findByTokenHash = jest.fn().mockResolvedValue(equipoAutorizadoYActivo);

      const res = await service.validarKiosko("token-secreto-valido");

      expect(res.valido).toBe(true);
      expect(res.equipo?.nombre).toBe("Kiosko Estudiantes");
      expect(mockRepository.updateLastAccess).toHaveBeenCalledWith(equipoAutorizadoYActivo.id);
    });

    it("debe rechazar si la terminal no está autorizada o no envía token (Escenario: Abrir el kiosko en un equipo no autorizado)", async () => {
      await expect(service.validarKiosko(undefined)).rejects.toThrow(
        new UnauthorizedException("Este equipo no está autorizado. Comuníquese con el área de TI."),
      );

      mockRepository.findByTokenHash = jest.fn().mockResolvedValue(null);
      await expect(service.validarKiosko("token-invalido")).rejects.toThrow(
        new UnauthorizedException("Este equipo no está autorizado. Comuníquese con el área de TI."),
      );
    });

    it("debe rechazar de inmediato si el equipo fue desactivado (Escenario: Desactivar un equipo)", async () => {
      const equipoDesactivado = {
        ...mockEquipo,
        autorizado: true,
        activo: false, // DESACTIVADO
      };
      mockRepository.findByTokenHash = jest.fn().mockResolvedValue(equipoDesactivado);

      await expect(service.validarKiosko("token-de-equipo-desactivado")).rejects.toThrow(
        new UnauthorizedException("Este equipo no está autorizado. Comuníquese con el área de TI."),
      );
    });
  });

  describe("RF-022: reloj biométrico", () => {
    it("CP-RF022-02: un reloj biométrico sin número de serie se rechaza", async () => {
      await expect(
        service.create(
          {
            nombre: "Reloj docentes",
            ubicacion: "Puerta principal",
            tipo: "biometrico",
            proposito: "marcacion",
            usuariosPermitidos: "docentes",
          },
          "user-soporte",
        ),
      ).rejects.toThrow(
        new BadRequestException("Debe ingresar el número de serie para equipos biométricos."),
      );
    });

    it("CP-RF022-06: al cambiar el reloj por uno similar se actualiza el número de serie y se conserva el equipo", async () => {
      mockRepository.findById = jest
        .fn()
        .mockResolvedValue({ ...mockEquipo, tipo: "biometrico", numeroSerie: "ZK-VIEJO" });
      await service.update(
        mockEquipo.id,
        {
          nombre: mockEquipo.nombre,
          ubicacion: mockEquipo.ubicacion,
          usuariosPermitidos: "docentes",
          numeroSerie: "ZK-NUEVO",
        },
        "user-soporte",
      );
      expect(mockRepository.update).toHaveBeenCalledWith(
        mockEquipo.id,
        expect.objectContaining({ numeroSerie: "ZK-NUEVO" }),
      );
    });

    it("CP-RF022-07: un reloj desactivado deja de aceptar sus claves de inmediato", async () => {
      mockRepository.findByTokenHash = jest
        .fn()
        .mockResolvedValue({ ...mockEquipo, tipo: "biometrico", autorizado: true, activo: false });
      await expect(service.validarKiosko("clave-del-reloj")).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("toggleActivo", () => {
    it("debe cambiar el estado activo del equipo y registrar auditoría", async () => {
      const result = await service.toggleActivo(mockEquipo.id, false, "user-soporte", "127.0.0.1");

      expect(mockRepository.toggleActivo).toHaveBeenCalledWith(mockEquipo.id, false);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-soporte",
          accion: "actualizar",
          tabla: "equipos_autorizados",
        }),
      );
      expect(result.activo).toBe(false);
    });
  });
});
