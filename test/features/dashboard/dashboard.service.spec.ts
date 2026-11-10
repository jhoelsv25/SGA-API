import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { DashboardService } from "@/features/dashboard/dashboard.service";
import type { DashboardRepository } from "@/features/dashboard/repositories/dashboard.repository";

describe("DashboardService (RF-021: panel de inicio por rol)", () => {
  const repositorio = {
    obtenerPeriodoReferencia: jest.fn(),
    obtenerDatosAdmin: jest.fn().mockResolvedValue({}),
    obtenerDatosDirectivo: jest.fn().mockResolvedValue({}),
  };
  const servicio = new DashboardService(repositorio as unknown as DashboardRepository);
  const usuarioCon = (role: string) => ({ role, personaId: "persona-1" }) as AuthenticatedUser;

  beforeEach(() => {
    jest.clearAllMocks();
    repositorio.obtenerPeriodoReferencia.mockResolvedValue({
      anioId: "anio-1",
      anio: 2027,
      periodoId: "periodo-1",
      periodoNombre: "Bimestre I",
    });
  });

  it.each(["Auxiliar", "Coordinador", "Psicólogo", "Tutor", "Directivo"])(
    "el rol adicional %s no recibe datos del colegio",
    async (rol) => {
      const respuesta = await servicio.getDashboardData(usuarioCon(rol), {});

      expect(respuesta.rolCategoria).toBe("adicional");
      expect(respuesta.directivo).toBeUndefined();
      expect(respuesta.admin).toBeUndefined();
      expect(repositorio.obtenerDatosDirectivo).not.toHaveBeenCalled();
      expect(repositorio.obtenerDatosAdmin).not.toHaveBeenCalled();
    },
  );

  it.each(["Director", "Subdirector"])("%s conserva el panel directivo", async (rol) => {
    const respuesta = await servicio.getDashboardData(usuarioCon(rol), {});

    expect(respuesta.rolCategoria).toBe("directivo");
    expect(repositorio.obtenerDatosDirectivo).toHaveBeenCalled();
  });

  it.each(["Administrador", "Soporte TI"])(
    "%s conserva el panel de administración",
    async (rol) => {
      const respuesta = await servicio.getDashboardData(usuarioCon(rol), {});

      expect(respuesta.rolCategoria).toBe("admin");
    },
  );
});
