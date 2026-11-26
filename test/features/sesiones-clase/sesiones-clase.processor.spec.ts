import type { Job } from "bullmq";
import { JOB_CERRAR_SESIONES } from "@/features/sesiones-clase/constants";
import { SesionesClaseProcessor } from "@/features/sesiones-clase/processors";
import type { SesionesClaseService } from "@/features/sesiones-clase/sesiones-clase.service";

// OBS-15: un cierre atrasado (API apagada a las 23:55) no debe cerrar el día en curso.
describe("SesionesClaseProcessor: cierre del día", () => {
  afterEach(() => jest.useRealTimers());

  it("cierra la fecha programada en Lima aunque se ejecute al día siguiente", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-11-25T16:42:00Z")); // 11:42 en Lima
    const cerrarDelDia = jest.fn();
    const processor = new SesionesClaseProcessor({
      cerrarDelDia,
    } as unknown as SesionesClaseService);

    await processor.process({
      name: JOB_CERRAR_SESIONES,
      opts: { prevMillis: Date.parse("2026-11-25T04:55:00Z") }, // 24/11 23:55 en Lima
    } as unknown as Job);

    expect(cerrarDelDia).toHaveBeenCalledWith("2026-11-24");
  });
});
