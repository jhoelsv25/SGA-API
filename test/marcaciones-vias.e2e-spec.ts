/**
 * E2E de las vías de marcación: kiosko (código del QR y DNI escrito), manual, reloj biométrico por la
 * app puente (`POST /biometrico/lote`) y reloj biométrico por la tabla cruda (`marcaciones_biometricas`).
 *
 * Corre contra la base REAL del `.env` (no hay base de pruebas), por eso:
 *  - solo se ejecuta con `E2E_BD_REAL=si`;
 *  - crea datos con un sufijo único (`E2E<tag>`) y los borra todos al terminar (también si falla);
 *  - nunca toca filas que no haya creado él mismo.
 *
 *   E2E_BD_REAL=si npm run test:e2e -- marcaciones-vias
 */
import { createHash, randomBytes } from "node:crypto";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { and, eq, inArray } from "drizzle-orm";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { Database, DRIZZLE } from "../src/core/database";
import {
  bitacoraAuditoria,
  credenciales,
  docentes,
  equiposAutorizados,
  marcaciones,
  marcacionesBiometricas,
  marcacionesBiometricoPendientes,
  personas,
  usuarios,
} from "../src/core/database/schema";
import type { LoteResponseDto } from "../src/features/biometrico/dto";
import { MarcacionesService } from "../src/features/marcaciones/marcaciones.service";
import { MarcacionesBiometricasService } from "../src/features/marcaciones/marcaciones-biometricas.service";
import { ahoraEnColegio } from "../src/features/marcaciones/utils/marcacion-reglas.util";

const habilitado = process.env.E2E_BD_REAL === "si";
const describeSiHabilitado = habilitado ? describe : describe.skip;

const sha256 = (texto: string): string => createHash("sha256").update(texto).digest("hex");
const PIN = "4321";

/** El cuerpo de supertest llega como `any`: se tipa en un solo lugar. */
const cuerpo = <T>(res: { body: unknown }): T => res.body as T;

interface Docente {
  personaId: string;
  documento: string;
  codigoDocente: string;
  codigoCredencial: string;
  codigoBiometrico: string;
}

describeSiHabilitado("Vías de marcación (e2e, base real)", () => {
  let app: INestApplication<App>;
  let db: Database;
  let marcacionesService: MarcacionesService;
  let biometricasService: MarcacionesBiometricasService;

  const tag = randomBytes(3).toString("hex"); // 6 caracteres
  const tokenKiosko = `e2e-kiosko-${randomBytes(12).toString("hex")}`;
  const tokenReloj = `e2e-reloj-${randomBytes(12).toString("hex")}`;
  const serieReloj = `E2E-${tag}`;

  let equipoKioskoId: string;
  let equipoRelojId: string;
  let actorId: string;
  const docentesCreados: Record<"qr" | "manual" | "puente" | "cruda", Docente> = {} as never;
  const idsPersonas: string[] = [];

  async function crearDocente(clave: string, n: number): Promise<Docente> {
    const d: Docente = {
      personaId: "",
      documento: `E2${tag}${n}`,
      codigoDocente: `E2E${tag}${n}`,
      codigoCredencial: `CR-E2E${tag}${n}`,
      codigoBiometrico: `B${tag}${n}`,
    };
    const [persona] = await db
      .insert(personas)
      .values({
        numeroDocumento: d.documento,
        nombres: `Docente ${clave}`,
        apellidoPaterno: `E2E ${tag}`,
        sexo: "M",
        codigoBiometrico: d.codigoBiometrico,
      })
      .returning({ id: personas.id });
    d.personaId = persona.id;
    idsPersonas.push(persona.id);
    await db.insert(docentes).values({
      personaId: persona.id,
      codigo: d.codigoDocente,
      tipoContrato: "contratado",
      fechaIngreso: "2020-01-01",
    });
    await db.insert(credenciales).values({
      personaId: persona.id,
      codigo: d.codigoCredencial,
      pinHash: sha256(PIN),
    });
    return d;
  }

  const marcasDe = (personaId: string) =>
    db.select().from(marcaciones).where(eq(marcaciones.personaId, personaId));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    db = app.get<Database>(DRIZZLE);
    marcacionesService = app.get(MarcacionesService);
    biometricasService = app.get(MarcacionesBiometricasService);

    const [actor] = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.estado, "activo"))
      .limit(1);
    if (!actor) throw new Error("No hay un usuario activo para registrar la marcación manual.");
    actorId = actor.id;

    const [kiosko] = await db
      .insert(equiposAutorizados)
      .values({
        nombre: `E2E kiosko ${tag}`,
        ubicacion: "E2E",
        tipo: "kiosko",
        proposito: "marcacion",
        usuariosPermitidos: "docentes",
        tokenAutorizacion: sha256(tokenKiosko),
        autorizado: true,
      })
      .returning({ id: equiposAutorizados.id });
    equipoKioskoId = kiosko.id;

    const [reloj] = await db
      .insert(equiposAutorizados)
      .values({
        nombre: `E2E reloj ${tag}`,
        ubicacion: "E2E",
        tipo: "biometrico",
        proposito: "marcacion",
        usuariosPermitidos: "docentes",
        numeroSerie: serieReloj,
        tokenAutorizacion: sha256(tokenReloj),
        autorizado: true,
      })
      .returning({ id: equiposAutorizados.id });
    equipoRelojId = reloj.id;

    docentesCreados.qr = await crearDocente("kiosko", 1);
    docentesCreados.manual = await crearDocente("manual", 2);
    docentesCreados.puente = await crearDocente("puente", 3);
    docentesCreados.cruda = await crearDocente("cruda", 4);
  }, 60_000);

  afterAll(async () => {
    if (!db) return;
    const intentar = async (paso: () => Promise<unknown>) => {
      try {
        await paso();
      } catch (error) {
        // Limpieza de mejor esfuerzo: sigue con lo demás, pero deja a la vista lo que no se pudo borrar.
        console.warn(`[e2e] limpieza fallida: ${error instanceof Error ? error.message : error}`);
      }
    };
    const idsMarcaciones = idsPersonas.length
      ? (
          await db
            .select({ id: marcaciones.id })
            .from(marcaciones)
            .where(inArray(marcaciones.personaId, idsPersonas))
        ).map((m) => m.id)
      : [];

    // La auditoría de la marcación manual se escribe en segundo plano: se espera un instante.
    await new Promise((r) => setTimeout(r, 1500));
    if (idsMarcaciones.length) {
      await intentar(() =>
        db.delete(bitacoraAuditoria).where(inArray(bitacoraAuditoria.registroId, idsMarcaciones)),
      );
    }
    // Las filas crudas apuntan a la marcación (FK): van antes que ella.
    await intentar(() =>
      db.delete(marcacionesBiometricas).where(eq(marcacionesBiometricas.relojSerie, serieReloj)),
    );
    if (idsPersonas.length) {
      await intentar(() =>
        db
          .delete(marcacionesBiometricoPendientes)
          .where(and(eq(marcacionesBiometricoPendientes.equipoId, equipoRelojId))),
      );
      await intentar(() =>
        db.delete(marcaciones).where(inArray(marcaciones.personaId, idsPersonas)),
      );
      await intentar(() =>
        db.delete(credenciales).where(inArray(credenciales.personaId, idsPersonas)),
      );
      await intentar(() => db.delete(docentes).where(inArray(docentes.personaId, idsPersonas)));
      await intentar(() => db.delete(personas).where(inArray(personas.id, idsPersonas)));
    }
    const idsEquipos = [equipoKioskoId, equipoRelojId].filter(Boolean);
    if (idsEquipos.length) {
      await intentar(() =>
        db.delete(equiposAutorizados).where(inArray(equiposAutorizados.id, idsEquipos)),
      );
    }
    await app?.close();
  }, 60_000);

  // ---------------------------------------------------------------- kiosko (QR y DNI)

  describe("Kiosko", () => {
    it("QR: marca la entrada con el código del carné + PIN (origen kiosko)", async () => {
      const d = docentesCreados.qr;
      const res = await request(app.getHttpServer())
        .post("/api/marcaciones/kiosko")
        .set("x-kiosk-token", tokenKiosko)
        .send({ codigo: d.codigoCredencial, pin: PIN })
        .expect(200);

      expect(cuerpo<{ tipo: string }>(res).tipo).toBe("entrada");
      const filas = await marcasDe(d.personaId);
      expect(filas).toHaveLength(1);
      expect(filas[0]).toMatchObject({ origen: "kiosko", tipo: "entrada" });
    });

    it("DNI escrito: la segunda marca del día es la salida (origen kiosko)", async () => {
      const d = docentesCreados.qr;
      const res = await request(app.getHttpServer())
        .post("/api/marcaciones/kiosko")
        .set("x-kiosk-token", tokenKiosko)
        .send({ codigo: d.documento, pin: PIN })
        .expect(200);

      expect(cuerpo<{ tipo: string }>(res).tipo).toBe("salida");
      const filas = await marcasDe(d.personaId);
      expect(filas.map((f) => [f.tipo, f.origen]).sort()).toEqual([
        ["entrada", "kiosko"],
        ["salida", "kiosko"],
      ]);
    });

    it("rechaza un PIN incorrecto y no guarda nada", async () => {
      const d = docentesCreados.manual;
      await request(app.getHttpServer())
        .post("/api/marcaciones/kiosko")
        .set("x-kiosk-token", tokenKiosko)
        .send({ codigo: d.codigoCredencial, pin: "0000" })
        .expect(400);
      expect(await marcasDe(d.personaId)).toHaveLength(0);
    });

    it("rechaza un equipo sin autorización", async () => {
      await request(app.getHttpServer())
        .post("/api/marcaciones/kiosko")
        .set("x-kiosk-token", "token-que-no-existe")
        .send({ codigo: docentesCreados.manual.codigoCredencial, pin: PIN })
        .expect(401);
    });
  });

  // ---------------------------------------------------------------- manual

  describe("Marcación manual", () => {
    it("registra con hora real y observación (origen manual, quién la registró)", async () => {
      const d = docentesCreados.manual;
      const creada = await marcacionesService.registrarManual(
        {
          personaId: d.personaId,
          tipo: "entrada",
          hora: "07:45",
          observacion: "e2e: olvidó el carné",
        },
        actorId,
      );
      expect(creada.origen).toBe("manual");

      const [fila] = await marcasDe(d.personaId);
      expect(fila).toMatchObject({
        origen: "manual",
        tipo: "entrada",
        registradaPorId: actorId,
      });
    });

    it("exige observación", async () => {
      await expect(
        marcacionesService.registrarManual(
          {
            personaId: docentesCreados.cruda.personaId,
            tipo: "entrada",
            hora: "07:50",
            observacion: "  ",
          },
          actorId,
        ),
      ).rejects.toThrow();
      expect(await marcasDe(docentesCreados.cruda.personaId)).toHaveLength(0);
    });

    it("no permite una segunda entrada el mismo día", async () => {
      await expect(
        marcacionesService.registrarManual(
          {
            personaId: docentesCreados.manual.personaId,
            tipo: "entrada",
            hora: "08:00",
            observacion: "e2e: repetida",
          },
          actorId,
        ),
      ).rejects.toThrow();
      expect(await marcasDe(docentesCreados.manual.personaId)).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------- reloj por la app puente

  describe("Reloj biométrico: app puente (POST /biometrico/lote)", () => {
    const hoy = () => ahoraEnColegio().fecha;

    it("registra la marca con la hora del reloj (origen biometrico)", async () => {
      const d = docentesCreados.puente;
      const res = await request(app.getHttpServer())
        .post("/api/biometrico/lote")
        .set("x-puente-token", tokenReloj)
        .send({ marcaciones: [{ codigo: d.codigoBiometrico, fechaHora: `${hoy()} 07:30:00` }] })
        .expect(200);

      expect(cuerpo<LoteResponseDto>(res)).toMatchObject({
        recibidas: 1,
        registradas: 1,
        pendientes: 0,
      });
      const [fila] = await marcasDe(d.personaId);
      expect(fila).toMatchObject({
        origen: "biometrico",
        tipo: "entrada",
        equipoId: equipoRelojId,
      });
      expect(fila.fechaHora.slice(11, 19)).toBe("07:30:00");
    });

    it("el reenvío del mismo lote no duplica", async () => {
      const d = docentesCreados.puente;
      const res = await request(app.getHttpServer())
        .post("/api/biometrico/lote")
        .set("x-puente-token", tokenReloj)
        .send({ marcaciones: [{ codigo: d.codigoBiometrico, fechaHora: `${hoy()} 07:30:00` }] })
        .expect(200);

      const lote = cuerpo<LoteResponseDto>(res);
      expect(lote.registradas).toBe(0);
      expect(lote.duplicadas + lote.ignoradas).toBe(1);
      expect(await marcasDe(d.personaId)).toHaveLength(1);
    });

    it("ignora el rebote (segunda marca a los pocos segundos)", async () => {
      const d = docentesCreados.puente;
      const res = await request(app.getHttpServer())
        .post("/api/biometrico/lote")
        .set("x-puente-token", tokenReloj)
        .send({ marcaciones: [{ codigo: d.codigoBiometrico, fechaHora: `${hoy()} 07:30:20` }] })
        .expect(200);

      expect(cuerpo<LoteResponseDto>(res).ignoradas).toBe(1);
      expect(await marcasDe(d.personaId)).toHaveLength(1);
    });

    it("un código desconocido va a la bandeja de pendientes", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/biometrico/lote")
        .set("x-puente-token", tokenReloj)
        .send({ marcaciones: [{ codigo: `X${tag}`, fechaHora: `${hoy()} 07:40:00` }] })
        .expect(200);

      expect(cuerpo<LoteResponseDto>(res).pendientes).toBe(1);
      const pendientes = await db
        .select()
        .from(marcacionesBiometricoPendientes)
        .where(eq(marcacionesBiometricoPendientes.equipoId, equipoRelojId));
      expect(pendientes).toHaveLength(1);
      expect(pendientes[0]).toMatchObject({ estado: "pendiente", motivo: "codigo_desconocido" });
    });

    it("rechaza una clave de la app puente inválida", async () => {
      await request(app.getHttpServer())
        .post("/api/biometrico/lote")
        .set("x-puente-token", "clave-invalida")
        .send({ marcaciones: [{ codigo: "1", fechaHora: `${hoy()} 07:30:00` }] })
        .expect(401);
    });
  });

  // ---------------------------------------------------------------- reloj por la tabla cruda

  describe("Reloj biométrico: tabla cruda (marcaciones_biometricas)", () => {
    it("convierte la marca cruda en asistencia y rechaza la de un código desconocido", async () => {
      const d = docentesCreados.cruda;
      const fechaHora = `${ahoraEnColegio().fecha} 07:35:00`;
      const [valida] = await db
        .insert(marcacionesBiometricas)
        .values({ relojSerie: serieReloj, codigoUsuario: d.codigoDocente, fechaHora })
        .returning({ id: marcacionesBiometricas.id });
      const [desconocida] = await db
        .insert(marcacionesBiometricas)
        .values({ relojSerie: serieReloj, codigoUsuario: `NOEXISTE${tag}`, fechaHora })
        .returning({ id: marcacionesBiometricas.id });

      await biometricasService.procesarPendientes();

      const [procesada] = await db
        .select()
        .from(marcacionesBiometricas)
        .where(eq(marcacionesBiometricas.id, valida.id));
      const [rechazada] = await db
        .select()
        .from(marcacionesBiometricas)
        .where(eq(marcacionesBiometricas.id, desconocida.id));
      expect(procesada.estado).toBe("procesada");
      expect(procesada.marcacionId).toBeTruthy();
      expect(rechazada.estado).toBe("rechazada");

      const [fila] = await marcasDe(d.personaId);
      expect(fila).toMatchObject({ origen: "biometrico", tipo: "entrada" });
    });
  });

  // ---------------------------------------------------------------- resumen

  it("cada vía dejó su origen: kiosko 2, manual 1, biometrico 2", async () => {
    const todas = await db
      .select({ origen: marcaciones.origen })
      .from(marcaciones)
      .where(inArray(marcaciones.personaId, idsPersonas));
    const conteo = todas.reduce<Record<string, number>>((acc, m) => {
      acc[m.origen] = (acc[m.origen] ?? 0) + 1;
      return acc;
    }, {});
    expect(conteo).toEqual({ kiosko: 2, manual: 1, biometrico: 2 });
  });
});
