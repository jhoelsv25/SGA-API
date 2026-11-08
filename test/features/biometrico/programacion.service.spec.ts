import { BadRequestException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import {
  BiometricoRepository,
  BiometricoService,
  MENSAJES_BIOMETRICO,
} from "@/features/biometrico";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

describe("RF-022: programación de la sincronización del reloj", () => {
  let service: BiometricoService;
  let repo: Mocks<BiometricoRepository>;
  let audit: Mocks<AuditService>;

  beforeEach(() => {
    repo = {
      listarProgramacion: jest.fn().mockResolvedValue({ horarios: [], actualizadoEn: null }),
      reemplazarProgramacion: jest.fn().mockResolvedValue(undefined),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new BiometricoService(
      repo as unknown as BiometricoRepository,
      audit as unknown as AuditService,
    );
  });

  it("CP-RF022-20: guarda las horas ordenadas y con los días sin repetir", async () => {
    await service.guardarProgramacion(
      {
        horarios: [
          { hora: "13:00", dias: "5,1,1,3", activa: true },
          { hora: "07:00", dias: "1,2,3,4,5", activa: false },
        ],
      },
      "u-1",
    );
    expect(repo.reemplazarProgramacion).toHaveBeenCalledWith([
      { hora: "07:00", dias: "1,2,3,4,5", activa: false },
      { hora: "13:00", dias: "1,3,5", activa: true },
    ]);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ tabla: "biometrico_programacion", accion: "actualizar" }),
    );
  });

  it("CP-RF022-21: una hora repetida se rechaza y no se guarda nada", async () => {
    await expect(
      service.guardarProgramacion(
        {
          horarios: [
            { hora: "07:00", dias: "1", activa: true },
            { hora: "07:00", dias: "2", activa: true },
          ],
        },
        "u-1",
      ),
    ).rejects.toThrow(new BadRequestException(MENSAJES_BIOMETRICO.HORA_REPETIDA("07:00")));
    expect(repo.reemplazarProgramacion).not.toHaveBeenCalled();
  });

  it("CP-RF022-22: una lista vacía borra la programación", async () => {
    await service.guardarProgramacion({ horarios: [] }, "u-1");
    expect(repo.reemplazarProgramacion).toHaveBeenCalledWith([]);
  });
});
