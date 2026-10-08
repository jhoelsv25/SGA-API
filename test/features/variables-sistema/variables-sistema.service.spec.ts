import { BadRequestException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import {
  ERROR_MESSAGES,
  VariableSistemaResponseDto,
  VariablesSistemaRepository,
  VariablesSistemaService,
} from "@/features/variables-sistema";

describe("VariablesSistemaService (RF-004 HU4 v2.0)", () => {
  let service: VariablesSistemaService;
  let mockRepository: jest.Mocked<Partial<VariablesSistemaRepository>>;
  let mockAuditService: jest.Mocked<Partial<AuditService>>;

  const mockVariableTolerancia: VariableSistemaResponseDto = {
    id: 1,
    codigo: "sesion.tolerancia_ingreso_min",
    descripcion: "Tolerancia al firmar el ingreso antes de contar minutos perdidos (RF-011, P-06)",
    modulo: "sesiones",
    tipo: "entero",
    valor: "15",
    unidad: "minutos",
    valorMinimo: 0,
    valorMaximo: 60,
    editable: true,
    cargaEnAplicacion: true,
    vigente: true,
    motivoCambio: "Configuración inicial",
    actualizadoPorId: "user-admin",
    actualizadoPorNombre: "Administrador SGA",
    creadoEn: "2026-10-08T12:00:00Z",
  };

  const mockVariableReadOnly: VariableSistemaResponseDto = {
    id: 2,
    codigo: "sistema.version_bloqueada",
    descripcion: "Variable fija de solo lectura",
    modulo: "seguridad",
    tipo: "texto",
    valor: "v2.0",
    unidad: null,
    valorMinimo: null,
    valorMaximo: null,
    editable: false,
    cargaEnAplicacion: true,
    vigente: true,
    motivoCambio: null,
    actualizadoPorId: null,
    creadoEn: "2026-10-08T12:00:00Z",
  };

  const mockPesosNota: VariableSistemaResponseDto[] = [
    {
      id: 10,
      codigo: "nota.peso_examen",
      descripcion: "Peso examen",
      modulo: "aula_virtual",
      tipo: "decimal",
      valor: "25",
      unidad: "%",
      valorMinimo: 0,
      valorMaximo: 100,
      editable: true,
      cargaEnAplicacion: true,
      vigente: true,
      motivoCambio: null,
      actualizadoPorId: null,
      creadoEn: "2026-10-08T12:00:00Z",
    },
    {
      id: 11,
      codigo: "nota.peso_cuestionario",
      descripcion: "Peso cuestionario",
      modulo: "aula_virtual",
      tipo: "decimal",
      valor: "25",
      unidad: "%",
      valorMinimo: 0,
      valorMaximo: 100,
      editable: true,
      cargaEnAplicacion: true,
      vigente: true,
      motivoCambio: null,
      actualizadoPorId: null,
      creadoEn: "2026-10-08T12:00:00Z",
    },
    {
      id: 12,
      codigo: "nota.peso_trabajo",
      descripcion: "Peso trabajo",
      modulo: "aula_virtual",
      tipo: "decimal",
      valor: "25",
      unidad: "%",
      valorMinimo: 0,
      valorMaximo: 100,
      editable: true,
      cargaEnAplicacion: true,
      vigente: true,
      motivoCambio: null,
      actualizadoPorId: null,
      creadoEn: "2026-10-08T12:00:00Z",
    },
    {
      id: 13,
      codigo: "nota.peso_proyecto",
      descripcion: "Peso proyecto",
      modulo: "aula_virtual",
      tipo: "decimal",
      valor: "25",
      unidad: "%",
      valorMinimo: 0,
      valorMaximo: 100,
      editable: true,
      cargaEnAplicacion: true,
      vigente: true,
      motivoCambio: null,
      actualizadoPorId: null,
      creadoEn: "2026-10-08T12:00:00Z",
    },
  ];

  beforeEach(() => {
    mockRepository = {
      findVigentes: jest.fn().mockResolvedValue([mockVariableTolerancia]),
      findByCodigoVigente: jest.fn().mockImplementation((codigo: string) => {
        if (codigo === "sesion.tolerancia_ingreso_min")
          return Promise.resolve(mockVariableTolerancia);
        if (codigo === "sistema.version_bloqueada") return Promise.resolve(mockVariableReadOnly);
        if (codigo === "nota.peso_examen") return Promise.resolve(mockPesosNota[0]);
        return Promise.resolve(null);
      }),
      findHistorialByCodigo: jest.fn().mockResolvedValue([
        { ...mockVariableTolerancia, id: 3, valor: "10", vigente: true },
        { ...mockVariableTolerancia, id: 1, valor: "15", vigente: false },
      ]),
      findPesosNotaVigentes: jest.fn().mockResolvedValue(mockPesosNota),
      crearNuevaVersion: jest
        .fn()
        .mockImplementation((params: { valor: string; motivoCambio: string }) =>
          Promise.resolve({
            ...mockVariableTolerancia,
            id: 99,
            valor: params.valor,
            motivoCambio: params.motivoCambio,
            vigente: true,
          }),
        ),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new VariablesSistemaService(
      mockRepository as unknown as VariablesSistemaRepository,
      mockAuditService as unknown as AuditService,
    );
  });

  describe("CP-RF004-25: Ver las variables (v2.0)", () => {
    it("debe retornar la lista de variables vigentes con su valor y módulo", async () => {
      const result = await service.listVigentes();
      expect(result).toHaveLength(1);
      expect(result[0].codigo).toBe("sesion.tolerancia_ingreso_min");
      expect(result[0].vigente).toBe(true);
      expect(mockRepository.findVigentes).toHaveBeenCalled();
    });
  });

  describe("CP-RF004-26: Cambiar una variable (v2.0)", () => {
    it("debe actualizar la variable creando nueva versión y registrando en la auditoría", async () => {
      const result = await service.update(
        "sesion.tolerancia_ingreso_min",
        { valor: "10", motivoCambio: "Acuerdo de dirección" },
        "user-admin",
        "192.168.1.10",
      );

      expect(result.valor).toBe("10");
      expect(result.motivoCambio).toBe("Acuerdo de dirección");
      expect(mockRepository.crearNuevaVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          codigo: "sesion.tolerancia_ingreso_min",
          valor: "10",
          motivoCambio: "Acuerdo de dirección",
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-admin",
          accion: "actualizar",
          tabla: "variables_sistema",
        }),
      );
    });
  });

  describe("CP-RF004-27: Valor fuera de rango (v2.0)", () => {
    it("debe impedir guardar si el valor supera el máximo permitido (90 > 60)", async () => {
      await expect(
        service.update(
          "sesion.tolerancia_ingreso_min",
          { valor: "90", motivoCambio: "Cambio excedido" },
          "user-admin",
        ),
      ).rejects.toThrow(new BadRequestException(ERROR_MESSAGES.VALOR_RANGO_0_60));
    });
  });

  describe("CP-RF004-28: Tipo de dato inválido (v2.0)", () => {
    it("debe impedir guardar si una variable entera recibe texto no numérico", async () => {
      await expect(
        service.update(
          "sesion.tolerancia_ingreso_min",
          { valor: "diez", motivoCambio: "Texto en vez de número" },
          "user-admin",
        ),
      ).rejects.toThrow(new BadRequestException(ERROR_MESSAGES.NUMERO_ENTERO));
    });
  });

  describe("CP-RF004-29: Cambio sin motivo (v2.0)", () => {
    it("debe rechazar la modificación si no se ingresa un motivo", async () => {
      await expect(
        service.update(
          "sesion.tolerancia_ingreso_min",
          { valor: "10", motivoCambio: "   " },
          "user-admin",
        ),
      ).rejects.toThrow(new BadRequestException(ERROR_MESSAGES.MOTIVO_REQUERIDO));
    });
  });

  describe("CP-RF004-30: Pesos que no suman 100 (v2.0)", () => {
    it("debe impedir guardar si el nuevo peso de examen hace que la suma no sea 100 % (40 + 25 + 25 + 25 = 115)", async () => {
      await expect(
        service.update(
          "nota.peso_examen",
          { valor: "40", motivoCambio: "Mayor peso al examen" },
          "user-admin",
        ),
      ).rejects.toThrow(new BadRequestException(ERROR_MESSAGES.PESOS_SUMA_100));
    });

    it("debe aceptar el cambio si los pesos suman exactamente 100 %", async () => {
      // Simular que el total suma 100 %
      mockRepository.findPesosNotaVigentes = jest.fn().mockResolvedValue([
        mockPesosNota[0], // examen actual 25
        { ...mockPesosNota[1], valor: "20" }, // cuestionario 20
        { ...mockPesosNota[2], valor: "20" }, // trabajo 20
        { ...mockPesosNota[3], valor: "20" }, // proyecto 20
      ]); // con examen = 40 => 40 + 20 + 20 + 20 = 100 %

      const result = await service.update(
        "nota.peso_examen",
        { valor: "40", motivoCambio: "Ajuste equilibrado" },
        "user-admin",
      );

      expect(result).toBeDefined();
    });
  });

  describe("CP-RF004-31: Historial de una variable (v2.0)", () => {
    it("debe retornar el historial cronológico de versiones de la variable", async () => {
      const historial = await service.getHistorial("sesion.tolerancia_ingreso_min");
      expect(historial).toHaveLength(2);
      expect(historial[0].valor).toBe("10");
      expect(historial[1].valor).toBe("15");
      expect(mockRepository.findHistorialByCodigo).toHaveBeenCalledWith(
        "sesion.tolerancia_ingreso_min",
      );
    });
  });

  describe("CP-RF004-32: Variable de solo lectura (v2.0)", () => {
    it("debe impedir la edición de una variable con editable = false", async () => {
      await expect(
        service.update(
          "sistema.version_bloqueada",
          { valor: "v3.0", motivoCambio: "Intento de modificar variable fija" },
          "user-admin",
        ),
      ).rejects.toThrow(new BadRequestException(ERROR_MESSAGES.VARIABLE_NO_EDITABLE));
    });
  });
});
