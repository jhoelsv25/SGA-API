import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import dayjs from "dayjs";
import { decodeCursor, encodeCursor } from "../../../common/utils";
import { Database, DRIZZLE } from "../../../core/database";
import {
  cargos,
  credenciales,
  docentes,
  estudiantes,
  grados,
  marcaciones,
  matriculas,
  personaCargos,
  personas,
  secciones,
} from "../../../core/database/schema";
import type {
  OrigenMarcacion,
  ResultadoMarcacion,
  TipoMarcacion,
  TipoPersonaMarcacion,
} from "../constants";
import type {
  GrupoPanelDto,
  MarcacionResponseDto,
  PersonaPendienteDto,
  ReporteMarcacionesQueryDto,
  ReporteMarcacionesResponseDto,
} from "../dto";
import type {
  CredencialParaMarcar,
  IMarcacionesRepository,
  MarcacionDelDia,
  NuevaMarcacion,
  PersonaParaMarcar,
} from "../interfaces";

interface CursorReporte {
  fechaHora: string;
  id: string;
}

const nombreCompletoSql = sql<string>`TRIM(${personas.apellidoPaterno} || ' ' || COALESCE(${personas.apellidoMaterno}, '') || ', ' || ${personas.nombres})`;

const tipoPersonaSql = sql<string>`CASE
  WHEN EXISTS (SELECT 1 FROM ${estudiantes} e WHERE e.persona_id = ${personas.id}) THEN 'estudiantes'
  WHEN EXISTS (SELECT 1 FROM ${docentes} d WHERE d.persona_id = ${personas.id}) THEN 'docentes'
  ELSE 'administrativos' END`;

function siguienteDia(fecha: string): string {
  return dayjs(fecha).add(1, "day").format("YYYY-MM-DD");
}

@Injectable()
export class MarcacionesRepository implements IMarcacionesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private seleccion() {
    return {
      id: marcaciones.id,
      personaId: marcaciones.personaId,
      nombreCompleto: nombreCompletoSql,
      fotoUrl: personas.fotoUrl,
      tipoPersona: tipoPersonaSql,
      tipo: marcaciones.tipo,
      fechaHora: marcaciones.fechaHora,
      origen: marcaciones.origen,
      resultado: marcaciones.resultado,
      minutosTardanza: marcaciones.minutosTardanza,
      justificada: marcaciones.justificada,
      motivoJustificacion: marcaciones.motivoJustificacion,
      justificadaEn: marcaciones.justificadaEn,
      observacion: marcaciones.observacion,
    };
  }

  private mapear(fila: {
    id: string;
    personaId: string;
    nombreCompleto: string;
    fotoUrl: string | null;
    tipoPersona: string;
    tipo: string;
    fechaHora: string;
    origen: string;
    resultado: string;
    minutosTardanza: number;
    justificada: boolean;
    motivoJustificacion: string | null;
    justificadaEn: string | null;
    observacion: string | null;
  }): MarcacionResponseDto {
    return {
      ...fila,
      tipoPersona: fila.tipoPersona as TipoPersonaMarcacion,
      tipo: fila.tipo as TipoMarcacion,
      origen: fila.origen as OrigenMarcacion,
      resultado: fila.resultado as ResultadoMarcacion,
    };
  }

  /** Busca por el código del carné (QR) y, si no existe, por el DNI escrito en el kiosko. */
  async findCredencialPorCodigo(codigo: string): Promise<CredencialParaMarcar | null> {
    const columnas = {
      id: credenciales.id,
      personaId: credenciales.personaId,
      pinHash: credenciales.pinHash,
      activa: credenciales.activa,
      venceEn: credenciales.venceEn,
    };
    const [porCodigo] = await this.db
      .select(columnas)
      .from(credenciales)
      .where(eq(credenciales.codigo, codigo))
      .orderBy(desc(credenciales.activa), desc(credenciales.emitidaEn))
      .limit(1);
    if (porCodigo) return porCodigo;

    const [porDocumento] = await this.db
      .select(columnas)
      .from(credenciales)
      .innerJoin(personas, eq(personas.id, credenciales.personaId))
      .where(eq(personas.numeroDocumento, codigo))
      .orderBy(desc(credenciales.activa), desc(credenciales.emitidaEn))
      .limit(1);
    return porDocumento ?? null;
  }

  async findPersonaParaMarcar(personaId: string): Promise<PersonaParaMarcar | null> {
    // Con una sola tabla Drizzle no califica las columnas: las subconsultas usan "personas"."id" explícito.
    const [fila] = await this.db
      .select({
        personaId: personas.id,
        nombres: personas.nombres,
        nombreCompleto: nombreCompletoSql,
        fotoUrl: personas.fotoUrl,
        estudianteId: sql<
          string | null
        >`(SELECT e.id FROM ${estudiantes} e WHERE e.persona_id = "personas"."id" LIMIT 1)`,
        docenteActivo: sql<
          boolean | null
        >`(SELECT (d.estado = 'activo' AND d.eliminado_en IS NULL) FROM ${docentes} d WHERE d.persona_id = "personas"."id" LIMIT 1)`,
        cargoVigente: sql<boolean>`EXISTS (SELECT 1 FROM ${personaCargos} pc WHERE pc.persona_id = "personas"."id" AND pc.vigente)`,
      })
      .from(personas)
      .where(eq(personas.id, personaId))
      .limit(1);
    if (!fila) return null;

    if (fila.estudianteId) {
      return {
        ...base(fila),
        tipoPersona: "estudiantes",
        estudianteId: fila.estudianteId,
        vigente: true,
      };
    }
    if (fila.docenteActivo !== null) {
      return {
        ...base(fila),
        tipoPersona: "docentes",
        estudianteId: null,
        vigente: fila.docenteActivo,
      };
    }
    if (fila.cargoVigente) {
      return { ...base(fila), tipoPersona: "administrativos", estudianteId: null, vigente: true };
    }
    return { ...base(fila), tipoPersona: null, estudianteId: null, vigente: false };

    function base(f: typeof fila) {
      return {
        personaId: f.personaId,
        nombres: f.nombres,
        nombreCompleto: f.nombreCompleto,
        fotoUrl: f.fotoUrl,
      };
    }
  }

  async tieneMatriculaVigente(estudianteId: string, anioAcademicoId: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: matriculas.id })
      .from(matriculas)
      .where(
        and(
          eq(matriculas.estudianteId, estudianteId),
          eq(matriculas.anioAcademicoId, anioAcademicoId),
          eq(matriculas.estado, "matriculado"),
        ),
      )
      .limit(1);
    return Boolean(fila);
  }

  async marcacionesDePersonaEnFecha(personaId: string, fecha: string): Promise<MarcacionDelDia[]> {
    const filas = await this.db
      .select({ id: marcaciones.id, tipo: marcaciones.tipo, fechaHora: marcaciones.fechaHora })
      .from(marcaciones)
      .where(
        and(
          eq(marcaciones.personaId, personaId),
          sql`${marcaciones.fechaHora} >= ${`${fecha} 00:00:00`}::timestamp`,
          sql`${marcaciones.fechaHora} < ${`${siguienteDia(fecha)} 00:00:00`}::timestamp`,
        ),
      )
      .orderBy(marcaciones.fechaHora);
    return filas.map((f) => ({ ...f, tipo: f.tipo as TipoMarcacion }));
  }

  async insertar(data: NuevaMarcacion): Promise<MarcacionResponseDto> {
    const [creada] = await this.db
      .insert(marcaciones)
      .values({
        personaId: data.personaId,
        credencialId: data.credencialId,
        turnoId: data.turnoId,
        tipo: data.tipo,
        fechaHora: data.fechaHora,
        origen: data.origen,
        resultado: data.resultado,
        minutosTardanza: data.minutosTardanza,
        observacion: data.observacion ?? null,
        registradaPorId: data.registradaPorId ?? null,
        equipoId: data.equipoId ?? null,
      })
      .returning({ id: marcaciones.id });
    const completa = await this.findById(creada.id);
    if (!completa) throw new Error("La marcación recién creada no se pudo leer.");
    return completa;
  }

  async findById(id: string): Promise<MarcacionResponseDto | null> {
    const [fila] = await this.db
      .select(this.seleccion())
      .from(marcaciones)
      .innerJoin(personas, eq(personas.id, marcaciones.personaId))
      .where(eq(marcaciones.id, id))
      .limit(1);
    return fila ? this.mapear(fila) : null;
  }

  async justificar(id: string, motivo: string, usuarioId: string): Promise<MarcacionResponseDto> {
    await this.db
      .update(marcaciones)
      .set({
        justificada: true,
        motivoJustificacion: motivo,
        justificadaPorId: usuarioId,
        justificadaEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(marcaciones.id, id));
    const actualizada = await this.findById(id);
    if (!actualizada) throw new Error("La marcación justificada no se pudo leer.");
    return actualizada;
  }

  async panelDelDia(
    fecha: string,
    anioAcademicoId: string | null,
  ): Promise<{ estudiantes: GrupoPanelDto; personal: GrupoPanelDto }> {
    const delDia = await this.db
      .select(this.seleccion())
      .from(marcaciones)
      .innerJoin(personas, eq(personas.id, marcaciones.personaId))
      .where(
        and(
          sql`${marcaciones.fechaHora} >= ${`${fecha} 00:00:00`}::timestamp`,
          sql`${marcaciones.fechaHora} < ${`${siguienteDia(fecha)} 00:00:00`}::timestamp`,
        ),
      )
      .orderBy(desc(marcaciones.fechaHora));
    const lista = delDia.map((f) => this.mapear(f));

    const sinEntradaHoy = sql`NOT EXISTS (
      SELECT 1 FROM ${marcaciones} mar
      WHERE mar.persona_id = ${personas.id} AND mar.tipo = 'entrada'
        AND mar.fecha_hora >= ${`${fecha} 00:00:00`}::timestamp
        AND mar.fecha_hora < ${`${siguienteDia(fecha)} 00:00:00`}::timestamp)`;

    const estudiantesFaltan: PersonaPendienteDto[] = anioAcademicoId
      ? await this.db
          .select({
            personaId: personas.id,
            nombreCompleto: nombreCompletoSql,
            detalle: sql<string>`${grados.numero} || '.° ' || ${secciones.nombre}`,
          })
          .from(matriculas)
          .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
          .innerJoin(personas, eq(personas.id, estudiantes.personaId))
          .innerJoin(secciones, eq(secciones.id, matriculas.seccionId))
          .innerJoin(grados, eq(grados.id, secciones.gradoId))
          .where(
            and(
              eq(matriculas.anioAcademicoId, anioAcademicoId),
              eq(matriculas.estado, "matriculado"),
              sinEntradaHoy,
            ),
          )
          .orderBy(personas.apellidoPaterno, personas.apellidoMaterno, personas.nombres)
      : [];

    const docentesFaltan = await this.db
      .select({
        personaId: personas.id,
        nombreCompleto: nombreCompletoSql,
        detalle: sql<string>`'Docente'`,
      })
      .from(docentes)
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .where(
        and(eq(docentes.estado, "activo"), sql`${docentes.eliminadoEn} IS NULL`, sinEntradaHoy),
      );

    const administrativosFaltan = await this.db
      .select({
        personaId: personas.id,
        nombreCompleto: nombreCompletoSql,
        detalle: cargos.nombre,
      })
      .from(personaCargos)
      .innerJoin(personas, eq(personas.id, personaCargos.personaId))
      .innerJoin(cargos, eq(cargos.id, personaCargos.cargoId))
      .where(
        and(
          eq(personaCargos.vigente, true),
          sql`NOT EXISTS (SELECT 1 FROM ${docentes} d WHERE d.persona_id = ${personas.id})`,
          sql`NOT EXISTS (SELECT 1 FROM ${estudiantes} e WHERE e.persona_id = ${personas.id})`,
          sinEntradaHoy,
        ),
      );

    const grupo = (
      filtro: (m: MarcacionResponseDto) => boolean,
      faltan: PersonaPendienteDto[],
    ): GrupoPanelDto => {
      const marcaron = lista.filter(filtro);
      return {
        marcaron,
        faltan,
        totalTardanzas: marcaron.filter((m) => m.resultado === "tardanza").length,
      };
    };

    return {
      estudiantes: grupo((m) => m.tipoPersona === "estudiantes", estudiantesFaltan),
      personal: grupo(
        (m) => m.tipoPersona !== "estudiantes",
        [...docentesFaltan, ...administrativosFaltan],
      ),
    };
  }

  async reporte(
    query: ReporteMarcacionesQueryDto,
    limite: number,
  ): Promise<ReporteMarcacionesResponseDto> {
    const condiciones: SQL[] = [
      sql`${marcaciones.fechaHora} >= ${`${query.desde} 00:00:00`}::timestamp`,
      sql`${marcaciones.fechaHora} < ${`${siguienteDia(query.hasta)} 00:00:00`}::timestamp`,
    ];
    if (query.personaId) condiciones.push(eq(marcaciones.personaId, query.personaId));
    if (query.tipoPersona) condiciones.push(sql`${tipoPersonaSql} = ${query.tipoPersona}`);
    if (query.seccionId) {
      condiciones.push(sql`EXISTS (
        SELECT 1 FROM ${matriculas} m JOIN ${estudiantes} e ON e.id = m.estudiante_id
        WHERE e.persona_id = ${marcaciones.personaId} AND m.seccion_id = ${query.seccionId})`);
    }
    const cursor = decodeCursor<CursorReporte>(query.cursor);
    if (cursor) {
      condiciones.push(
        sql`(${marcaciones.fechaHora}, ${marcaciones.id}) < (${cursor.fechaHora}::timestamp, ${cursor.id}::uuid)`,
      );
    }

    const filas = await this.db
      .select(this.seleccion())
      .from(marcaciones)
      .innerJoin(personas, eq(personas.id, marcaciones.personaId))
      .where(and(...condiciones))
      .orderBy(desc(marcaciones.fechaHora), desc(marcaciones.id))
      .limit(limite + 1);

    const hayMas = filas.length > limite;
    const pagina = filas.slice(0, limite).map((f) => this.mapear(f));
    const ultima = pagina[pagina.length - 1];
    return {
      data: pagina,
      nextCursor:
        hayMas && ultima ? encodeCursor({ fechaHora: ultima.fechaHora, id: ultima.id }) : null,
      hasMore: hayMas,
      limit: limite,
    };
  }
}
