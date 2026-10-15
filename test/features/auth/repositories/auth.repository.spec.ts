import { AuthRepository } from "@/features/auth/repositories/auth.repository";
import type { Database } from "@/core/database";

describe("AuthRepository.getMenuRoutes (Propuesta 1: menú por rol_menus)", () => {
  it("un rol de sistema sin un menú en rol_menus no lo recibe de getMenuRoutes", async () => {
    // Arrange: simular consulta en BD a rol_menus innerJoin menus
    // El rol "Docente" es de sistema (esSistema = true), pero en rol_menus solo tiene asignadas
    // las opciones "/sesiones/registrar" y "/horarios/mi-horario". No tiene "/ausencias-docentes".
    const rutasEnDb = [{ ruta: "/sesiones/registrar" }, { ruta: "/horarios/mi-horario" }];

    const whereMock = jest.fn().mockResolvedValue(rutasEnDb);
    const innerJoinMock = jest.fn().mockReturnValue({ where: whereMock });
    const fromMock = jest.fn().mockReturnValue({ innerJoin: innerJoinMock });
    const selectMock = jest.fn().mockReturnValue({ from: fromMock });

    const dbMock = {
      select: selectMock,
    } as unknown as Database;

    const repository = new AuthRepository(dbMock);

    // Act: incluso pasando esSistema = true, debe consultar rol_menus y no devolver todos los menús
    const resultado = await repository.getMenuRoutes("rol-docente-uuid", true);

    // Assert
    expect(resultado).toEqual(["/sesiones/registrar", "/horarios/mi-horario"]);
    expect(resultado).not.toContain("/ausencias-docentes");
    expect(selectMock).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalled();
    expect(innerJoinMock).toHaveBeenCalled();
    expect(whereMock).toHaveBeenCalled();
  });

  it("descarta rutas nulas o vacías y retorna solo strings válidos", async () => {
    const rutasEnDb = [{ ruta: "/inicio" }, { ruta: null as unknown as string }];

    const whereMock = jest.fn().mockResolvedValue(rutasEnDb);
    const innerJoinMock = jest.fn().mockReturnValue({ where: whereMock });
    const fromMock = jest.fn().mockReturnValue({ innerJoin: innerJoinMock });
    const selectMock = jest.fn().mockReturnValue({ from: fromMock });

    const dbMock = { select: selectMock } as unknown as Database;
    const repository = new AuthRepository(dbMock);

    const resultado = await repository.getMenuRoutes("rol-id", false);

    expect(resultado).toEqual(["/inicio"]);
  });
});
