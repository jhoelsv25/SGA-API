import { Queue } from "bullmq";
import { AuditService, LogAuditParams } from "@/common/services/audit.service";
import { Database } from "@/core/database";

describe("AuditService con BullMQ", () => {
  let mockDb: { insert: jest.Mock };
  let mockQueue: jest.Mocked<Partial<Queue<LogAuditParams>>>;

  const testParams: LogAuditParams = {
    usuarioId: "u-123",
    accion: "crear",
    tabla: "usuarios",
    registroId: "reg-456",
    valorNuevo: { nombre: "test" },
  };

  beforeEach(() => {
    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      }),
    };

    mockQueue = {
      add: jest.fn().mockReturnValue(Promise.resolve({})),
    };
  });

  it("debe encolar el evento en BullMQ si la cola está disponible", async () => {
    const service = new AuditService(
      mockDb as unknown as Database,
      mockQueue as Queue<LogAuditParams>,
    );

    await service.log(testParams);

    expect(mockQueue.add).toHaveBeenCalledWith(
      "registrar-evento",
      testParams,
      expect.objectContaining({
        attempts: 3,
        removeOnComplete: true,
      }),
    );
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("debe hacer fallback e insertar en la base de datos si la cola arroja error", async () => {
    mockQueue.add = jest.fn().mockRejectedValue(new Error("Redis connection lost"));
    const service = new AuditService(
      mockDb as unknown as Database,
      mockQueue as Queue<LogAuditParams>,
    );

    await service.log(testParams);

    expect(mockQueue.add).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("debe insertar directamente en la base de datos si no hay cola configurada", async () => {
    const service = new AuditService(mockDb as unknown as Database, undefined);

    await service.log(testParams);

    expect(mockDb.insert).toHaveBeenCalled();
  });
});
