import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import {
  MENSAJES_INDICADORES,
  PretestRepository,
  PretestService,
  type MensajeIndicadoresResponseDto,
  type PretestFila,
  type PretestResponseDto,
  type RegistrarPretestDto,
} from "@/features/indicadores";

describe("RF-020: Servicio de Pretest — PretestService (CP-RF020-08 a CP-RF020-10)", () => {
  let service: PretestService;

  let repo: {
    crearPretest: jest.Mock;
    invalidarPretestVigenteAnterior: jest.Mock;
    obtenerPretestVigente: jest.Mock;
    listarTodosPretests: jest.Mock;
  };

  let auditService: {
    log: jest.Mock;
  };

  const ACTOR_DIRECTOR_ID = "usr-director-uuid";
  const ACTOR_SUBDIRECTOR_ID = "usr-subdirector-uuid";
  const ACTOR_DOCENTE_ID = "usr-docente-uuid";
  const IP_CLIENTE = "192.168.1.100";

  // Datos canónicos de la sección 11 del contrato (CP-RF020-08 / Caso 4)
  const pretestCspFilaCanonico: PretestFila = {
    id: "pretest-csp-2026-uuid",
    indicador: "CSP",
    periodoDescrito: "I Bimestre 2026",
    fechaInicio: "2026-03-01",
    fechaFin: "2026-05-08",
    numerador: 942,
    denominador: 1200,
    porcentaje: 78.5,
    fuente: "Hojas físicas de firma de la subdirección",
    vigente: true,
    registradoPorId: ACTOR_DIRECTOR_ID,
    registradoPorNombre: "Director General",
    creadoEn: "2026-05-10T10:00:00.000Z",
  };

  const pretestIsaFilaCanonico: PretestFila = {
    id: "pretest-isa-2026-uuid",
    indicador: "ISA",
    periodoDescrito: "I Bimestre 2026",
    fechaInicio: "2026-03-01",
    fechaFin: "2026-05-08",
    numerador: 138,
    denominador: 168,
    porcentaje: 82.14,
    fuente: "Actas impresas de entrega de libretas",
    vigente: true,
    registradoPorId: ACTOR_DIRECTOR_ID,
    registradoPorNombre: "Director General",
    creadoEn: "2026-05-10T10:05:00.000Z",
  };

  beforeEach(() => {
    repo = {
      crearPretest: jest.fn().mockResolvedValue(pretestCspFilaCanonico),
      invalidarPretestVigenteAnterior: jest.fn().mockResolvedValue(undefined),
      obtenerPretestVigente: jest.fn().mockResolvedValue(pretestCspFilaCanonico),
      listarTodosPretests: jest
        .fn()
        .mockResolvedValue([pretestCspFilaCanonico, pretestIsaFilaCanonico]),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new PretestService(
      repo as unknown as PretestRepository,
      auditService as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // CP-RF020-08: Registrar el pretest
  // =========================================================================
  describe("CP-RF020-08: Registrar el pretest", () => {
    it("CP-RF020-08: debe guardar el pretest de CSP con 78.50 %, vigencia true, mensaje oficial y auditoría", async () => {
      // Dado que en el I Bimestre 2026, según las hojas físicas, se dictaron 942 de 1 200 sesiones
      const dto: RegistrarPretestDto = {
        indicador: "CSP",
        periodoDescrito: "I Bimestre 2026",
        fechaInicio: "2026-03-01",
        fechaFin: "2026-05-08",
        numerador: 942,
        denominador: 1200,
        fuente: "Hojas físicas de firma de la subdirección",
      };

      // Cuando registro un pretest de CSP como Director
      const respuesta: MensajeIndicadoresResponseDto & { pretest: PretestResponseDto } =
        await service.registrar(dto, ACTOR_DIRECTOR_ID, "Director", IP_CLIENTE);

      // Entonces el sistema calcula el porcentaje (78.50 %) y retorna el mensaje oficial exacto
      expect(respuesta.mensaje).toBe(MENSAJES_INDICADORES.PRETEST_REGISTRADO("CSP", 78.5));
      expect(respuesta.mensaje).toBe("Pretest de CSP registrado: 78.50 %.");
      expect(respuesta.pretest.porcentaje).toBe(78.5);
      expect(respuesta.pretest.porcentajeTexto).toBe("78.50 %");
      expect(respuesta.pretest.vigente).toBe(true);
      expect(respuesta.pretest.indicador).toBe("CSP");
      expect(respuesta.pretest.numerador).toBe(942);
      expect(respuesta.pretest.denominador).toBe(1200);
      expect(respuesta.pretest.fuente).toBe("Hojas físicas de firma de la subdirección");

      // Y se asegura la vigencia unívoca invalidando cualquier pretest vigente previo del mismo indicador
      expect(repo.invalidarPretestVigenteAnterior).toHaveBeenCalledWith("CSP");
      expect(repo.crearPretest).toHaveBeenCalledWith({
        indicador: "CSP",
        periodoDescrito: "I Bimestre 2026",
        fechaInicio: "2026-03-01",
        fechaFin: "2026-05-08",
        numerador: 942,
        denominador: 1200,
        porcentaje: 78.5,
        fuente: "Hojas físicas de firma de la subdirección",
        registradoPorId: ACTOR_DIRECTOR_ID,
      });

      // Y se registra la auditoría inmutable obligatoria
      expect(auditService.log).toHaveBeenCalledWith({
        usuarioId: ACTOR_DIRECTOR_ID,
        accion: "crear",
        tabla: "indicadores_pretest",
        registroId: pretestCspFilaCanonico.id,
        direccionIp: IP_CLIENTE,
      });
    });

    it("CP-RF020-08: debe permitir registrar pretest si el actor tiene rol admin", async () => {
      // Dado un DTO válido de ISA con 138 de 168 libretas
      const dto: RegistrarPretestDto = {
        indicador: "ISA",
        periodoDescrito: "I Bimestre 2026",
        fechaInicio: "2026-03-01",
        fechaFin: "2026-05-08",
        numerador: 138,
        denominador: 168,
        fuente: "Actas impresas de entrega de libretas",
      };
      repo.crearPretest.mockResolvedValue(pretestIsaFilaCanonico);

      // Cuando registro como usuario con rol admin
      const respuesta = await service.registrar(dto, "usr-admin-uuid", "admin", IP_CLIENTE);

      // Entonces se registra exitosamente
      expect(respuesta.pretest.indicador).toBe("ISA");
      expect(repo.invalidarPretestVigenteAnterior).toHaveBeenCalledWith("ISA");
      expect(auditService.log).toHaveBeenCalledTimes(1);
    });

    it("CP-RF020-08: debe rechazar con 403 Forbidden si el rol es Subdirector", async () => {
      // Dado un DTO válido
      const dto: RegistrarPretestDto = {
        indicador: "CSP",
        periodoDescrito: "I Bimestre 2026",
        fechaInicio: "2026-03-01",
        fechaFin: "2026-05-08",
        numerador: 942,
        denominador: 1200,
        fuente: "Hojas físicas de firma de la subdirección",
      };

      // Cuando un Subdirector intenta registrar el pretest
      const accion = service.registrar(dto, ACTOR_SUBDIRECTOR_ID, "Subdirector", IP_CLIENTE);

      // Entonces se bloquea con 403 Forbidden y el mensaje exacto de la especificación
      await expect(accion).rejects.toThrow(ForbiddenException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.ROL_NO_AUTORIZADO);

      // Y no se persiste en base de datos ni se audita
      expect(repo.crearPretest).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it("CP-RF020-08: debe rechazar con 403 Forbidden si el rol es Docente", async () => {
      // Dado un intento de registro por un Docente
      const dto: RegistrarPretestDto = {
        indicador: "IGM",
        periodoDescrito: "I Bimestre 2026",
        fechaInicio: "2026-03-01",
        fechaFin: "2026-05-08",
        numerador: 175,
        denominador: 250,
        fuente: "Registros de recepción de guías impresas",
      };

      // Cuando se invoca el registro
      const accion = service.registrar(dto, ACTOR_DOCENTE_ID, "Docente", IP_CLIENTE);

      // Entonces se bloquea con ForbiddenException
      await expect(accion).rejects.toThrow(ForbiddenException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.ROL_NO_AUTORIZADO);
      expect(repo.crearPretest).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // CP-RF020-09: Pretest sin fuente
  // =========================================================================
  describe("CP-RF020-09: Pretest sin fuente", () => {
    it("CP-RF020-09: debe impedir guardar y lanzar 400 Bad Request si la fuente es una cadena vacía", async () => {
      // Dado que estoy registrando un pretest y la fuente está vacía
      const dto: RegistrarPretestDto = {
        indicador: "CSP",
        periodoDescrito: "I Bimestre 2026",
        fechaInicio: "2026-03-01",
        fechaFin: "2026-05-08",
        numerador: 942,
        denominador: 1200,
        fuente: "",
      };

      // Cuando intento registrar sin fuente
      const accion = service.registrar(dto, ACTOR_DIRECTOR_ID, "Director", IP_CLIENTE);

      // Entonces el sistema impide guardar y muestra el mensaje oficial exacto
      await expect(accion).rejects.toThrow(BadRequestException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.PRETEST_SIN_FUENTE);
      await expect(accion).rejects.toThrow(
        "Indique la fuente del pretest (de dónde se obtuvo el dato).",
      );

      expect(repo.crearPretest).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it("CP-RF020-09: debe impedir guardar si la fuente contiene únicamente espacios en blanco", async () => {
      // Dado un pretest con fuente de solo espacios
      const dto: RegistrarPretestDto = {
        indicador: "ISA",
        periodoDescrito: "I Bimestre 2026",
        fechaInicio: "2026-03-01",
        fechaFin: "2026-05-08",
        numerador: 138,
        denominador: 168,
        fuente: "     ",
      };

      // Cuando intento guardar
      const accion = service.registrar(dto, ACTOR_DIRECTOR_ID, "Director", IP_CLIENTE);

      // Entonces rechaza con BadRequestException
      await expect(accion).rejects.toThrow(BadRequestException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.PRETEST_SIN_FUENTE);
      expect(repo.crearPretest).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // CP-RF020-10: Numerador mayor que el denominador
  // =========================================================================
  describe("CP-RF020-10: Numerador mayor que el denominador", () => {
    it("CP-RF020-10: debe impedir guardar y lanzar 400 Bad Request cuando el numerador es 1 300 y el denominador 1 200", async () => {
      // Dado que estoy registrando un pretest e ingreso numerador 1 300 y denominador 1 200
      const dto: RegistrarPretestDto = {
        indicador: "CSP",
        periodoDescrito: "I Bimestre 2026",
        fechaInicio: "2026-03-01",
        fechaFin: "2026-05-08",
        numerador: 1300,
        denominador: 1200,
        fuente: "Hojas físicas de firma de la subdirección",
      };

      // Cuando intento guardar con numerador mayor
      const accion = service.registrar(dto, ACTOR_DIRECTOR_ID, "Director", IP_CLIENTE);

      // Entonces el sistema impide guardar y muestra el mensaje oficial exacto
      await expect(accion).rejects.toThrow(BadRequestException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.NUMERADOR_MAYOR);
      await expect(accion).rejects.toThrow("El numerador no puede ser mayor que el denominador.");

      expect(repo.crearPretest).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Validaciones complementarias de dominio del contrato (Sección 7.A)
  // =========================================================================
  describe("Validaciones complementarias de pretest (Sección 7.A del contrato)", () => {
    it("debe rechazar con 400 Bad Request si el denominador es cero", async () => {
      // Dado un pretest con denominador 0
      const dto: RegistrarPretestDto = {
        indicador: "IGM",
        periodoDescrito: "I Bimestre 2026",
        fechaInicio: "2026-03-01",
        fechaFin: "2026-05-08",
        numerador: 0,
        denominador: 0,
        fuente: "Inventario de cuadernos",
      };

      // Cuando se registra
      const accion = service.registrar(dto, ACTOR_DIRECTOR_ID, "Director", IP_CLIENTE);

      // Entonces lanza BadRequestException con el mensaje exacto
      await expect(accion).rejects.toThrow(BadRequestException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.DENOMINADOR_CERO);
      await expect(accion).rejects.toThrow("El denominador debe ser mayor a 0.");
      expect(repo.crearPretest).not.toHaveBeenCalled();
    });

    it("debe rechazar con 400 Bad Request si el numerador es negativo", async () => {
      // Dado un pretest con numerador negativo
      const dto: RegistrarPretestDto = {
        indicador: "CSP",
        periodoDescrito: "I Bimestre 2026",
        fechaInicio: "2026-03-01",
        fechaFin: "2026-05-08",
        numerador: -15,
        denominador: 100,
        fuente: "Hojas de firma",
      };

      // Cuando se registra
      const accion = service.registrar(dto, ACTOR_DIRECTOR_ID, "Director", IP_CLIENTE);

      // Entonces lanza BadRequestException
      await expect(accion).rejects.toThrow(BadRequestException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.NUMERADOR_NEGATIVO);
      await expect(accion).rejects.toThrow("El numerador no puede ser negativo.");
      expect(repo.crearPretest).not.toHaveBeenCalled();
    });

    it("debe rechazar con 400 Bad Request si la fecha de fin es anterior a la fecha de inicio", async () => {
      // Dado un pretest con fechaFin anterior a fechaInicio
      const dto: RegistrarPretestDto = {
        indicador: "CSP",
        periodoDescrito: "I Bimestre 2026",
        fechaInicio: "2026-05-08",
        fechaFin: "2026-03-01",
        numerador: 800,
        denominador: 1000,
        fuente: "Hojas de firma",
      };

      // Cuando se registra con fechas incoherentes
      const accion = service.registrar(dto, ACTOR_DIRECTOR_ID, "Director", IP_CLIENTE);

      // Entonces lanza BadRequestException con el mensaje oficial
      await expect(accion).rejects.toThrow(BadRequestException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.FECHAS_INCOHERENTES);
      await expect(accion).rejects.toThrow(
        "La fecha de fin no puede ser anterior a la fecha de inicio.",
      );
      expect(repo.crearPretest).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Consultas de Pretest: Vigente e Histórico
  // =========================================================================
  describe("Consultas de pretest (obtenerVigente y listarTodos)", () => {
    it("debe retornar el pretest vigente de un indicador si existe", async () => {
      // Dado que existe pretest vigente para CSP
      repo.obtenerPretestVigente.mockResolvedValue(pretestCspFilaCanonico);

      // Cuando consulto el pretest vigente de CSP
      const vigente: PretestResponseDto | null = await service.obtenerVigente("CSP");

      // Entonces retorna la información completa marcada como vigente
      expect(vigente).not.toBeNull();
      expect(vigente?.indicador).toBe("CSP");
      expect(vigente?.porcentaje).toBe(78.5);
      expect(vigente?.vigente).toBe(true);
      expect(repo.obtenerPretestVigente).toHaveBeenCalledWith("CSP");
    });

    it("debe retornar null cuando no existe pretest vigente para el indicador", async () => {
      // Dado que no hay pretest para IGM
      repo.obtenerPretestVigente.mockResolvedValue(null);

      // Cuando consulto el pretest vigente de IGM
      const vigente = await service.obtenerVigente("IGM");

      // Entonces retorna null limpiamente
      expect(vigente).toBeNull();
      expect(repo.obtenerPretestVigente).toHaveBeenCalledWith("IGM");
    });

    it("debe retornar la lista completa de pretests históricos", async () => {
      // Dado que hay dos pretests históricos
      repo.listarTodosPretests.mockResolvedValue([pretestCspFilaCanonico, pretestIsaFilaCanonico]);

      // Cuando consulto todos los pretests
      const lista: PretestResponseDto[] = await service.listarTodos();

      // Entonces retorna los dos elementos mapeados
      expect(lista).toHaveLength(2);
      expect(lista[0].indicador).toBe("CSP");
      expect(lista[1].indicador).toBe("ISA");
      expect(repo.listarTodosPretests).toHaveBeenCalledTimes(1);
    });
  });
});
