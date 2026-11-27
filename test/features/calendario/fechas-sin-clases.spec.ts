import { CalendarioService } from "@/features/calendario/calendario.service";

describe("CalendarioService.fechasSinClases", () => {
  it("marca las fechas cubiertas por algún evento con una sola consulta", async () => {
    const repo = {
      rangosSinClases: jest.fn().mockResolvedValue([{ inicio: "2026-10-07", fin: "2026-10-08" }]),
    };
    const service = new CalendarioService(repo as never, {} as never, {} as never, {} as never);
    const r = await service.fechasSinClases(["2026-10-06", "2026-10-07", "2026-10-08"]);
    expect([...r]).toEqual(["2026-10-07", "2026-10-08"]);
    expect(repo.rangosSinClases).toHaveBeenCalledTimes(1);
    expect(repo.rangosSinClases).toHaveBeenCalledWith("2026-10-06", "2026-10-08");
  });

  it("para el personal solo cuentan los eventos en los que no trabaja", async () => {
    const repo = {
      rangosSinTrabajoPersonal: jest
        .fn()
        .mockResolvedValue([{ inicio: "2026-10-08", fin: "2026-10-08" }]),
    };
    const service = new CalendarioService(repo as never, {} as never, {} as never, {} as never);
    const r = await service.fechasSinTrabajoPersonal(["2026-10-07", "2026-10-08"]);
    expect([...r]).toEqual(["2026-10-08"]);
  });
});
