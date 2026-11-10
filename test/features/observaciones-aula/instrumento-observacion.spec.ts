import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  InstrumentoObservacionService,
  type CrearInstrumentoDto,
  type ObservacionesAulaRepository,
} from "@/features/observaciones-aula";
import {
  CONTENIDO_INSTRUMENTO_INICIAL,
  NOMBRE_INSTRUMENTO_INICIAL,
} from "@/core/database/seed-instrumento-observacion";
import { contenidoInstrumentoCompleto } from "@/features/observaciones-aula";
import {
  admin,
  comunSimulado,
  instrumentoCompleto,
  repositorioSimulado,
  type Mocks,
} from "./fixtures";

const dtoCompleto = (p: Partial<CrearInstrumentoDto> = {}): CrearInstrumentoDto => ({
  codigo: "instructivo-2026",
  nombre: "Instructivo 2026",
  desempenos: instrumentoCompleto().desempenos.map((d) => ({
    numero: d.numero,
    nombre: d.nombre,
    aspectos: d.aspectos,
    niveles: d.niveles.map((n) => ({ nivel: n.nivel, descripcion: n.descripcion })),
  })),
  ...p,
});

describe("RF-023 V1: instrumento de observación (HU8)", () => {
  let repo: Mocks<ObservacionesAulaRepository>;
  let service: InstrumentoObservacionService;

  beforeEach(() => {
    repo = repositorioSimulado();
    repo.instrumento = jest.fn().mockResolvedValue({
      id: "ins-2",
      codigo: "x",
      contenido: instrumentoCompleto(),
    });
    service = new InstrumentoObservacionService(comunSimulado(repo).comun);
  });

  it("carga una versión completa y la marca como vigente", async () => {
    await service.crear(dtoCompleto({ vigente: true }), admin);
    expect(repo.crearInstrumento).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: "instructivo-2026", creadoPorId: "u-adm" }),
      true,
    );
  });

  it("guarda una versión incompleta, pero no puede ser vigente", async () => {
    const incompleta = dtoCompleto();
    incompleta.desempenos[0].niveles[2].descripcion = "";
    await expect(service.crear({ ...incompleta, vigente: true }, admin)).rejects.toThrow(
      BadRequestException,
    );
    expect(repo.crearInstrumento).not.toHaveBeenCalled();
    await service.crear(incompleta, admin);
    expect(repo.crearInstrumento).toHaveBeenCalledWith(expect.anything(), false);
  });

  it("no repite el código de una versión", async () => {
    repo.existeCodigoInstrumento = jest.fn().mockResolvedValue(true);
    await expect(service.crear(dtoCompleto(), admin)).rejects.toThrow(ConflictException);
  });

  it("marcar vigente exige una versión completa", async () => {
    const incompleto = instrumentoCompleto();
    incompleto.desempenos[1].niveles[0].descripcion = "";
    repo.instrumento = jest
      .fn()
      .mockResolvedValue({ id: "ins-3", codigo: "y", contenido: incompleto });
    await expect(service.marcarVigente("ins-3", admin)).rejects.toThrow(
      "El instrumento debe tener los 5 desempeños",
    );
    repo.instrumento = jest.fn().mockResolvedValue({
      id: "ins-2",
      codigo: "x",
      contenido: instrumentoCompleto(),
    });
    await service.marcarVigente("ins-2", admin);
    expect(repo.marcarInstrumentoVigente).toHaveBeenCalledWith("ins-2");
  });

  it("sin versión vigente responde que no hay", async () => {
    repo.instrumentoVigente = jest.fn().mockResolvedValue(null);
    await expect(service.vigente()).rejects.toThrow("No hay una versión vigente");
  });

  describe("versión inicial del seed", () => {
    it("trae los 5 desempeños y los 4 niveles con nombre y grupo del instructivo", () => {
      expect(NOMBRE_INSTRUMENTO_INICIAL).toBe("Instructivo 2025 (Informe 00545-2025-MINEDU)");
      expect(CONTENIDO_INSTRUMENTO_INICIAL.desempenos).toHaveLength(5);
      const niveles = CONTENIDO_INSTRUMENTO_INICIAL.desempenos[0].niveles;
      expect(niveles.map((n) => `${n.nivel}:${n.nombre}:${n.grupo}`)).toEqual([
        "1:Muy deficiente:insatisfactorio",
        "2:En proceso:insatisfactorio",
        "3:Suficiente:satisfactorio",
        "4:Destacado:satisfactorio",
      ]);
    });

    it("no inventa el texto oficial: lo deja como pendiente de cargar", () => {
      expect(contenidoInstrumentoCompleto(CONTENIDO_INSTRUMENTO_INICIAL)).toBe(true);
      for (const d of CONTENIDO_INSTRUMENTO_INICIAL.desempenos) {
        for (const n of d.niveles) expect(n.descripcion).toContain("pendiente de cargar");
      }
    });
  });
});
