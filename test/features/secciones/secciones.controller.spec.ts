import { Reflector } from "@nestjs/core";
import { MENU_SECCIONES } from "@/common/constants";
import { MENU_ACCESS_KEY } from "@/common/decorators";
import { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { ClientInfoData } from "@/common/decorators";
import {
  CreateSeccionDto,
  SeccionQueryDto,
  SeccionResponseDto,
  SeccionesController,
  SeccionesService,
  UpdateSeccionDto,
} from "@/features/secciones";

describe("SeccionesController (RF-008: Seguridad y Endpoints de Secciones)", () => {
  let controller: SeccionesController;
  let service: jest.Mocked<Partial<SeccionesService>>;
  let reflector: Reflector;

  const mockUsuarioAdmin: AuthenticatedUser = {
    id: "user-admin",
    username: "admin",
    role: "Administrador",
    roleId: "rol-admin-uuid",
    personaId: "per-admin-uuid",
  };

  const mockClientInfo: ClientInfoData = {
    ip: "192.168.1.10",
    userAgent: "Mozilla/5.0",
  };

  const mockSeccionResponse: SeccionResponseDto = {
    id: "sec-5a",
    anioAcademicoId: "anio-2027",
    gradoId: "grado-5",
    gradoNumero: 5,
    gradoNombre: "5.° de secundaria",
    nombre: "A",
    aula: "Pab. B – 201",
    vacantes: 35,
    estado: "activa",
    tutor: {
      id: "doc-perez",
      codigo: "DOC001",
      nombreCompleto: "Juan Pérez Gómez",
    },
    matriculados: 0,
    totalCursos: 12,
    cursosSinDocente: 12,
  };

  beforeEach(() => {
    reflector = new Reflector();

    service = {
      create: jest.fn().mockResolvedValue(mockSeccionResponse),
      update: jest.fn().mockResolvedValue(mockSeccionResponse),
      cerrar: jest.fn().mockResolvedValue({ ...mockSeccionResponse, estado: "cerrada" }),
      findAll: jest.fn().mockResolvedValue([mockSeccionResponse]),
      findById: jest.fn().mockResolvedValue(mockSeccionResponse),
    };

    controller = new SeccionesController(service as unknown as SeccionesService);
  });

  describe("CP-RF008-20: Control de acceso a la gestión de secciones (@MenuAccess)", () => {
    it("debe exigir el permiso de organización escolar (@MenuAccess('/admin/secciones')) al crear una sección", () => {
      // Dado el endpoint create del controlador
      // Cuando verifico la metadata de acceso a menú
      const rutaPermitida = reflector.get<string>(MENU_ACCESS_KEY, controller.create);

      // Entonces debe requerir estrictamente la ruta de MENU_SECCIONES
      expect(rutaPermitida).toBe(MENU_SECCIONES);
      expect(rutaPermitida).toBe("/admin/secciones");
    });

    it("debe exigir el permiso de organización escolar (@MenuAccess('/admin/secciones')) al modificar una sección", () => {
      // Dado el endpoint update del controlador
      // Cuando verifico la metadata de acceso a menú
      const rutaPermitida = reflector.get<string>(MENU_ACCESS_KEY, controller.update);

      // Entonces debe requerir la ruta de MENU_SECCIONES
      expect(rutaPermitida).toBe(MENU_SECCIONES);
    });

    it("debe exigir el permiso de organización escolar (@MenuAccess('/admin/secciones')) al cerrar una sección", () => {
      // Dado el endpoint cerrar del controlador
      // Cuando verifico la metadata de acceso a menú
      const rutaPermitida = reflector.get<string>(MENU_ACCESS_KEY, controller.cerrar);

      // Entonces debe requerir la ruta de MENU_SECCIONES
      expect(rutaPermitida).toBe(MENU_SECCIONES);
    });

    it("debe exigir el permiso de organización escolar (@MenuAccess('/admin/secciones')) al clonar secciones", () => {
      const rutaPermitida = reflector.get<string>(MENU_ACCESS_KEY, controller.clonar);
      expect(rutaPermitida).toBe(MENU_SECCIONES);
    });

    it("no debe exigir restricción de @MenuAccess en endpoints de consulta abierta (findAll y findById)", () => {
      // Dado los endpoints de lectura
      // Cuando verifico la metadata de acceso a menú
      const rutaFindAll = reflector.get<string>(MENU_ACCESS_KEY, controller.findAll);
      const rutaFindById = reflector.get<string>(MENU_ACCESS_KEY, controller.findById);

      // Entonces no deben estar bloqueados por @MenuAccess
      expect(rutaFindAll).toBeUndefined();
      expect(rutaFindById).toBeUndefined();
    });
  });

  describe("Delegación de endpoints al servicio", () => {
    it("create() debe delegar al servicio con dto, usuario autenticado e IP", async () => {
      const dto: CreateSeccionDto = {
        gradoId: "grado-5",
        nombre: "A",
        vacantes: 35,
      };

      const resultado = await controller.create(dto, mockUsuarioAdmin, mockClientInfo);

      expect(resultado).toBe(mockSeccionResponse);
      expect(service.create).toHaveBeenCalledWith(dto, mockUsuarioAdmin.id, mockClientInfo.ip);
    });

    it("update() debe delegar al servicio con id, dto, usuario autenticado e IP", async () => {
      const dto: UpdateSeccionDto = {
        vacantes: 38,
      };

      const resultado = await controller.update("sec-5a", dto, mockUsuarioAdmin, mockClientInfo);

      expect(resultado).toBe(mockSeccionResponse);
      expect(service.update).toHaveBeenCalledWith(
        "sec-5a",
        dto,
        mockUsuarioAdmin.id,
        mockClientInfo.ip,
      );
    });

    it("cerrar() debe delegar al servicio con id, usuario autenticado e IP", async () => {
      const resultado = await controller.cerrar("sec-5a", mockUsuarioAdmin, mockClientInfo);

      expect(resultado.estado).toBe("cerrada");
      expect(service.cerrar).toHaveBeenCalledWith("sec-5a", mockUsuarioAdmin.id, mockClientInfo.ip);
    });

    it("findAll() debe delegar la búsqueda al servicio con los filtros opcionales", async () => {
      const query: SeccionQueryDto = { gradoId: "grado-5" };

      const resultado = await controller.findAll(query);

      expect(resultado).toEqual([mockSeccionResponse]);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it("clonar() debe delegar al servicio con dto, usuario autenticado e IP", async () => {
      service.clonar = jest.fn().mockResolvedValue({
        mensaje: "Se clonaron 2 secciones",
        totalClonadas: 2,
        totalOmitidas: 0,
        clonadas: [],
        omitidas: [],
      });

      const dto = { anioOrigenId: "anio-2026", copiarAulas: true };
      const resultado = await controller.clonar(dto, mockUsuarioAdmin, mockClientInfo);

      expect(resultado.totalClonadas).toBe(2);
      expect(service.clonar).toHaveBeenCalledWith(dto, mockUsuarioAdmin.id, mockClientInfo.ip);
    });

    it("findById() debe delegar la obtención por id al servicio", async () => {
      const resultado = await controller.findById("sec-5a");

      expect(resultado).toBe(mockSeccionResponse);
      expect(service.findById).toHaveBeenCalledWith("sec-5a");
    });
  });
});
