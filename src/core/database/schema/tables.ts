// Generado con drizzle-kit pull desde Supabase (migración 0000_init).
// Los cambios de esquema se hacen aquí y luego: pnpm db:generate && pnpm db:migrate
import {
  pgTable,
  unique,
  uuid,
  varchar,
  smallint,
  boolean,
  timestamp,
  foreignKey,
  index,
  check,
  uniqueIndex,
  date,
  char,
  bigint,
  jsonb,
  time,
  numeric,
  integer,
  text,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const modulos = pgTable(
  "modulos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    codigo: varchar({ length: 30 }).notNull(),
    nombre: varchar({ length: 50 }).notNull(),
    icono: varchar({ length: 50 }),
    orden: smallint().notNull(),
    vigente: boolean().default(true).notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique("uq_modulos_codigo").on(table.codigo)],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    nombre: varchar({ length: 50 }).notNull(),
    descripcion: varchar({ length: 255 }),
    esSistema: boolean("es_sistema").default(false).notNull(),
    activo: boolean().default(true).notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique("uq_roles_nombre").on(table.nombre)],
);

export const menus = pgTable(
  "menus",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    menuPadreId: uuid("menu_padre_id"),
    moduloId: uuid("modulo_id").notNull(),
    nombre: varchar({ length: 100 }).notNull(),
    ruta: varchar({ length: 255 }),
    icono: varchar({ length: 50 }),
    orden: smallint().notNull(),
    esContenedor: boolean("es_contenedor").default(false).notNull(),
    vigente: boolean().default(true).notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_menus_modulo_padre").using(
      "btree",
      table.moduloId.asc().nullsLast().op("uuid_ops"),
      table.menuPadreId.asc().nullsLast().op("int2_ops"),
      table.orden.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.moduloId],
      foreignColumns: [modulos.id],
      name: "fk_menus_modulo",
    }),
    foreignKey({
      columns: [table.menuPadreId],
      foreignColumns: [table.id],
      name: "fk_menus_padre",
    }),
    check(
      "ck_menus_tipo",
      sql`(es_contenedor AND (ruta IS NULL) AND (menu_padre_id IS NULL)) OR ((NOT es_contenedor) AND (ruta IS NOT NULL) AND (menu_padre_id IS NOT NULL))`,
    ),
  ],
);

export const personas = pgTable(
  "personas",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    tipoDocumento: varchar("tipo_documento", { length: 20 }).default("dni").notNull(),
    numeroDocumento: varchar("numero_documento", { length: 20 }).notNull(),
    nombres: varchar({ length: 100 }).notNull(),
    apellidoPaterno: varchar("apellido_paterno", { length: 60 }).notNull(),
    apellidoMaterno: varchar("apellido_materno", { length: 60 }),
    fechaNacimiento: date("fecha_nacimiento"),
    sexo: char({ length: 1 }).notNull(),
    direccion: varchar({ length: 255 }),
    distrito: varchar({ length: 100 }),
    telefono: varchar({ length: 20 }),
    celular: varchar({ length: 20 }),
    correo: varchar({ length: 100 }),
    fotoUrl: varchar("foto_url", { length: 255 }),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    eliminadoEn: timestamp("eliminado_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    index("ix_personas_apellidos").using(
      "btree",
      table.apellidoPaterno.asc().nullsLast().op("text_ops"),
      table.apellidoMaterno.asc().nullsLast().op("text_ops"),
      table.nombres.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("ux_personas_correo")
      .using("btree", table.correo.asc().nullsLast().op("text_ops"))
      .where(sql`((correo IS NOT NULL) AND (eliminado_en IS NULL))`),
    uniqueIndex("ux_personas_documento")
      .using(
        "btree",
        table.tipoDocumento.asc().nullsLast().op("text_ops"),
        table.numeroDocumento.asc().nullsLast().op("text_ops"),
      )
      .where(sql`(eliminado_en IS NULL)`),
    check("ck_personas_sexo", sql`sexo = ANY (ARRAY['M'::bpchar, 'F'::bpchar])`),
    check(
      "ck_personas_tipo_documento",
      sql`(tipo_documento)::text = ANY ((ARRAY['dni'::character varying, 'carne_extranjeria'::character varying, 'pasaporte'::character varying, 'partida_nacimiento'::character varying])::text[])`,
    ),
  ],
);

export const usuarios = pgTable(
  "usuarios",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    personaId: uuid("persona_id").notNull(),
    rolId: uuid("rol_id").notNull(),
    nombreUsuario: varchar("nombre_usuario", { length: 50 }).notNull(),
    contrasenaHash: varchar("contrasena_hash", { length: 255 }).notNull(),
    debeCambiarContrasena: boolean("debe_cambiar_contrasena").default(true).notNull(),
    estado: varchar({ length: 20 }).default("activo").notNull(),
    intentosFallidos: smallint("intentos_fallidos").default(0).notNull(),
    ultimoAcceso: timestamp("ultimo_acceso", { precision: 0, mode: "string" }),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    eliminadoEn: timestamp("eliminado_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    uniqueIndex("ux_usuarios_nombre_usuario")
      .using("btree", table.nombreUsuario.asc().nullsLast().op("text_ops"))
      .where(sql`(eliminado_en IS NULL)`),
    uniqueIndex("ux_usuarios_persona")
      .using("btree", table.personaId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(eliminado_en IS NULL)`),
    foreignKey({
      columns: [table.personaId],
      foreignColumns: [personas.id],
      name: "fk_usuarios_persona",
    }),
    foreignKey({
      columns: [table.rolId],
      foreignColumns: [roles.id],
      name: "fk_usuarios_rol",
    }),
    check(
      "ck_usuarios_estado",
      sql`(estado)::text = ANY ((ARRAY['activo'::character varying, 'bloqueado'::character varying, 'inactivo'::character varying])::text[])`,
    ),
    check("ck_usuarios_intentos", sql`intentos_fallidos >= 0`),
  ],
);

// RF-001 / RF-002 V2: un usuario puede tener varios roles. Uno es el principal
// (con el que inicia sesión). Quitar un rol = vigente false (historial).
// usuarios.rol_id se mantiene sincronizado con el rol principal.
export const usuarioRoles = pgTable(
  "usuario_roles",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    usuarioId: uuid("usuario_id").notNull(),
    rolId: uuid("rol_id").notNull(),
    esPrincipal: boolean("es_principal").default(false).notNull(),
    vigente: boolean().default(true).notNull(),
    asignadoPorId: uuid("asignado_por_id"),
    asignadoEn: timestamp("asignado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    retiradoPorId: uuid("retirado_por_id"),
    retiradoEn: timestamp("retirado_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    uniqueIndex("ux_usuario_roles_vigente")
      .using(
        "btree",
        table.usuarioId.asc().nullsLast().op("uuid_ops"),
        table.rolId.asc().nullsLast().op("uuid_ops"),
      )
      .where(sql`vigente`),
    uniqueIndex("ux_usuario_roles_principal")
      .using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(vigente AND es_principal)`),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "fk_usuario_roles_usuario",
    }),
    foreignKey({
      columns: [table.rolId],
      foreignColumns: [roles.id],
      name: "fk_usuario_roles_rol",
    }),
    foreignKey({
      columns: [table.asignadoPorId],
      foreignColumns: [usuarios.id],
      name: "fk_usuario_roles_asignado",
    }),
    foreignKey({
      columns: [table.retiradoPorId],
      foreignColumns: [usuarios.id],
      name: "fk_usuario_roles_retirado",
    }),
    check(
      "ck_usuario_roles_retiro",
      sql`vigente OR (retirado_por_id IS NOT NULL AND retirado_en IS NOT NULL)`,
    ),
  ],
);

// RF-002 V2: menús (opciones) que puede ver y usar cada rol (Roles-Menú).
// Reemplaza a permisos/rol_permisos: el acceso se da solo por menú.
export const rolMenus = pgTable(
  "rol_menus",
  {
    rolId: uuid("rol_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    asignadoPorId: uuid("asignado_por_id"),
    asignadoEn: timestamp("asignado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.rolId, table.menuId], name: "pk_rol_menus" }),
    foreignKey({
      columns: [table.rolId],
      foreignColumns: [roles.id],
      name: "fk_rol_menus_rol",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.menuId],
      foreignColumns: [menus.id],
      name: "fk_rol_menus_menu",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.asignadoPorId],
      foreignColumns: [usuarios.id],
      name: "fk_rol_menus_asignado",
    }),
  ],
);

// RF-002 V2 (HU4): puestos del personal. El cargo NO da accesos (eso es del rol);
// sirve para reportes, firmas e historial laboral, y sugiere roles.
export const cargos = pgTable(
  "cargos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    nombre: varchar({ length: 80 }).notNull(),
    descripcion: varchar({ length: 255 }),
    vigente: boolean().default(true).notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique("uq_cargos_nombre").on(table.nombre)],
);

// RF-002 V2 (HU4): roles que se sugieren al asignar un cargo (solo sugerencia).
export const cargoRolesSugeridos = pgTable(
  "cargo_roles_sugeridos",
  {
    cargoId: uuid("cargo_id").notNull(),
    rolId: uuid("rol_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.cargoId, table.rolId], name: "pk_cargo_roles_sugeridos" }),
    foreignKey({
      columns: [table.cargoId],
      foreignColumns: [cargos.id],
      name: "fk_cargo_roles_cargo",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.rolId],
      foreignColumns: [roles.id],
      name: "fk_cargo_roles_rol",
    }).onDelete("cascade"),
  ],
);

// RF-007 V3: cargo vigente de cada persona (uno solo) y su historial con fechas.
// Se crea aquí porque RF-002 necesita saber si un cargo está en uso; los endpoints
// de asignación a personas son del RF-007.
export const personaCargos = pgTable(
  "persona_cargos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    personaId: uuid("persona_id").notNull(),
    cargoId: uuid("cargo_id").notNull(),
    fechaInicio: date("fecha_inicio").notNull(),
    fechaFin: date("fecha_fin"),
    esPrincipal: boolean("es_principal").default(true).notNull(),
    vigente: boolean().default(true).notNull(),
    registradoPorId: uuid("registrado_por_id"),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    // RF-002 V3: un solo cargo vigente por persona (el resto es historial)
    uniqueIndex("ux_persona_cargos_vigente")
      .on(table.personaId)
      .where(sql`vigente`),
    foreignKey({
      columns: [table.personaId],
      foreignColumns: [personas.id],
      name: "fk_persona_cargos_persona",
    }),
    foreignKey({
      columns: [table.cargoId],
      foreignColumns: [cargos.id],
      name: "fk_persona_cargos_cargo",
    }),
    foreignKey({
      columns: [table.registradoPorId],
      foreignColumns: [usuarios.id],
      name: "fk_persona_cargos_registrado",
    }),
    check("ck_persona_cargos_fechas", sql`fecha_fin IS NULL OR fecha_fin >= fecha_inicio`),
    check("ck_persona_cargos_vigente", sql`vigente OR fecha_fin IS NOT NULL`),
  ],
);

export const sesiones = pgTable(
  "sesiones",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    usuarioId: uuid("usuario_id").notNull(),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    direccionIp: varchar("direccion_ip", { length: 45 }),
    navegador: varchar({ length: 255 }),
    iniciadaEn: timestamp("iniciada_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    ultimaActividad: timestamp("ultima_actividad", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    expiraEn: timestamp("expira_en", { precision: 0, mode: "string" }).notNull(),
    cerradaEn: timestamp("cerrada_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    index("ix_sesiones_usuario_activas")
      .using(
        "btree",
        table.usuarioId.asc().nullsLast().op("timestamp_ops"),
        table.expiraEn.asc().nullsLast().op("timestamp_ops"),
      )
      .where(sql`(cerrada_en IS NULL)`),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "fk_sesiones_usuario",
    }).onDelete("cascade"),
    unique("uq_sesiones_token").on(table.tokenHash),
  ],
);

export const bitacoraAuditoria = pgTable(
  "bitacora_auditoria",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({
      name: "bitacora_auditoria_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,

      cache: 1,
    }),
    usuarioId: uuid("usuario_id"),
    accion: varchar({ length: 20 }).notNull(),
    tabla: varchar({ length: 100 }).notNull(),
    registroId: uuid("registro_id"),
    valorAnterior: jsonb("valor_anterior"),
    valorNuevo: jsonb("valor_nuevo"),
    direccionIp: varchar("direccion_ip", { length: 45 }),
    registradoEn: timestamp("registrado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_bitacora_tabla_registro").using(
      "btree",
      table.tabla.asc().nullsLast().op("text_ops"),
      table.registroId.asc().nullsLast().op("text_ops"),
    ),
    index("ix_bitacora_usuario_fecha").using(
      "btree",
      table.usuarioId.asc().nullsLast().op("uuid_ops"),
      table.registradoEn.asc().nullsLast().op("uuid_ops"),
    ),
    index("ix_bitacora_auditoria_cursor").using(
      "btree",
      table.registradoEn.desc().nullsLast().op("timestamp_ops"),
      table.id.desc().nullsLast().op("int8_ops"),
    ),
    check(
      "ck_bitacora_accion",
      sql`(accion)::text = ANY ((ARRAY['crear'::character varying, 'actualizar'::character varying, 'eliminar'::character varying, 'iniciar_sesion'::character varying, 'cerrar_sesion'::character varying])::text[])`,
    ),
  ],
);

export const aniosAcademicos = pgTable(
  "anios_academicos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    anio: smallint().notNull(),
    nombre: varchar({ length: 150 }),
    fechaInicio: date("fecha_inicio").notNull(),
    fechaFin: date("fecha_fin").notNull(),
    estado: varchar({ length: 20 }).default("planificado").notNull(),
    reabiertoHasta: timestamp("reabierto_hasta", { precision: 0, mode: "string" }),
    motivoReapertura: varchar("motivo_reapertura", { length: 500 }),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("ux_anios_academicos_en_curso")
      .using("btree", table.estado.asc().nullsLast().op("text_ops"))
      .where(sql`((estado)::text = 'en_curso'::text)`),
    unique("uq_anios_academicos_anio").on(table.anio),
    check(
      "ck_anios_academicos_estado",
      sql`(estado)::text = ANY ((ARRAY['planificado'::character varying, 'en_curso'::character varying, 'cerrado'::character varying, 'reabierto'::character varying])::text[])`,
    ),
    check("ck_anios_academicos_fechas", sql`fecha_fin > fecha_inicio`),
    check(
      "ck_anios_academicos_reapertura",
      sql`((estado)::text <> 'reabierto'::text) OR ((reabierto_hasta IS NOT NULL) AND (motivo_reapertura IS NOT NULL))`,
    ),
  ],
);

export const periodosAcademicos = pgTable(
  "periodos_academicos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    anioAcademicoId: uuid("anio_academico_id").notNull(),
    numero: smallint().notNull(),
    nombre: varchar({ length: 50 }).notNull(),
    tipo: varchar({ length: 20 }).notNull(),
    fechaInicio: date("fecha_inicio").notNull(),
    fechaFin: date("fecha_fin").notNull(),
    estado: varchar({ length: 20 }).default("planificado").notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.anioAcademicoId],
      foreignColumns: [aniosAcademicos.id],
      name: "fk_periodos_academicos_anio",
    }).onDelete("cascade"),
    unique("uq_periodos_academicos_numero").on(table.anioAcademicoId, table.numero),
    uniqueIndex("ux_periodos_academicos_en_curso")
      .on(table.anioAcademicoId)
      .where(sql`((estado)::text = 'en_curso'::text)`),
    check(
      "ck_periodos_academicos_estado",
      sql`(estado)::text = ANY ((ARRAY['planificado'::character varying, 'en_curso'::character varying, 'cerrado'::character varying])::text[])`,
    ),
    check("ck_periodos_academicos_fechas", sql`fecha_fin > fecha_inicio`),
    check(
      "ck_periodos_academicos_tipo",
      sql`(tipo)::text = ANY ((ARRAY['bimestre'::character varying, 'trimestre'::character varying, 'semestre'::character varying])::text[])`,
    ),
  ],
);

export const calendarioEventos = pgTable(
  "calendario_eventos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    anioAcademicoId: uuid("anio_academico_id").notNull(),
    titulo: varchar({ length: 150 }).notNull(),
    descripcion: varchar({ length: 500 }),
    tipo: varchar({ length: 30 }).notNull(),
    fechaInicio: date("fecha_inicio").notNull(),
    fechaFin: date("fecha_fin").notNull(),
    suspendeClases: boolean("suspende_clases").default(false).notNull(),
    creadoPorId: uuid("creado_por_id"),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_calendario_eventos_fechas").using(
      "btree",
      table.fechaInicio.asc().nullsLast().op("date_ops"),
      table.fechaFin.asc().nullsLast().op("date_ops"),
    ),
    foreignKey({
      columns: [table.anioAcademicoId],
      foreignColumns: [aniosAcademicos.id],
      name: "fk_calendario_eventos_anio",
    }),
    foreignKey({
      columns: [table.creadoPorId],
      foreignColumns: [usuarios.id],
      name: "fk_calendario_eventos_usuario",
    }),
    check("ck_calendario_eventos_fechas", sql`fecha_fin >= fecha_inicio`),
    check(
      "ck_calendario_eventos_tipo",
      sql`(tipo)::text = ANY ((ARRAY['feriado'::character varying, 'suspension'::character varying, 'jornada_pedagogica'::character varying, 'reunion'::character varying, 'actividad'::character varying, 'examen'::character varying])::text[])`,
    ),
  ],
);

export const grados = pgTable(
  "grados",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    numero: smallint().notNull(),
    nombre: varchar({ length: 50 }).notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    eliminadoEn: timestamp("eliminado_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    uniqueIndex("ux_grados_numero")
      .using("btree", table.numero.asc().nullsLast().op("int2_ops"))
      .where(sql`(eliminado_en IS NULL)`),
    check("ck_grados_numero", sql`(numero >= 1) AND (numero <= 5)`),
  ],
);

export const planEstudios = pgTable(
  "plan_estudios",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    gradoId: uuid("grado_id").notNull(),
    cursoId: uuid("curso_id").notNull(),
    horasSemanales: smallint("horas_semanales").notNull(),
    activo: boolean().default(true).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.cursoId],
      foreignColumns: [cursos.id],
      name: "fk_plan_estudios_curso",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.gradoId],
      foreignColumns: [grados.id],
      name: "fk_plan_estudios_grado",
    }).onDelete("cascade"),
    unique("uq_plan_estudios_grado_curso").on(table.gradoId, table.cursoId),
    check("ck_plan_estudios_horas", sql`horas_semanales > 0`),
  ],
);

export const cursos = pgTable(
  "cursos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    codigo: varchar({ length: 20 }).notNull(),
    nombre: varchar({ length: 100 }).notNull(),
    areaCurricular: varchar("area_curricular", { length: 30 }).notNull(),
    descripcion: varchar({ length: 500 }),
    colorHex: char("color_hex", { length: 7 }),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    eliminadoEn: timestamp("eliminado_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    uniqueIndex("ux_cursos_codigo")
      .using("btree", table.codigo.asc().nullsLast().op("text_ops"))
      .where(sql`(eliminado_en IS NULL)`),
    check(
      "ck_cursos_area",
      sql`(area_curricular)::text = ANY ((ARRAY['matematica'::character varying, 'comunicacion'::character varying, 'ingles'::character varying, 'arte_cultura'::character varying, 'ciencias_sociales'::character varying, 'dpcc'::character varying, 'educacion_fisica'::character varying, 'educacion_religiosa'::character varying, 'ciencia_tecnologia'::character varying, 'ept'::character varying, 'taller'::character varying, 'tutoria'::character varying])::text[])`,
    ),
    check("ck_cursos_color", sql`(color_hex IS NULL) OR (color_hex ~ '^#[0-9A-Fa-f]{6}$'::text)`),
  ],
);

export const docentes = pgTable(
  "docentes",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    personaId: uuid("persona_id").notNull(),
    codigo: varchar({ length: 20 }).notNull(),
    especialidad: varchar({ length: 100 }),
    tituloProfesional: varchar("titulo_profesional", { length: 150 }),
    tipoContrato: varchar("tipo_contrato", { length: 20 }).notNull(),
    jornadaHoras: smallint("jornada_horas").default(30).notNull(),
    fechaIngreso: date("fecha_ingreso").notNull(),
    fechaCese: date("fecha_cese"),
    estado: varchar({ length: 20 }).default("activo").notNull(),
    firmaUrl: varchar("firma_url", { length: 255 }),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    eliminadoEn: timestamp("eliminado_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    uniqueIndex("ux_docentes_codigo")
      .using("btree", table.codigo.asc().nullsLast().op("text_ops"))
      .where(sql`(eliminado_en IS NULL)`),
    uniqueIndex("ux_docentes_persona")
      .using("btree", table.personaId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(eliminado_en IS NULL)`),
    foreignKey({
      columns: [table.personaId],
      foreignColumns: [personas.id],
      name: "fk_docentes_persona",
    }),
    check(
      "ck_docentes_contrato",
      sql`(tipo_contrato)::text = ANY ((ARRAY['nombrado'::character varying, 'contratado'::character varying, 'practicante'::character varying])::text[])`,
    ),
    check(
      "ck_docentes_estado",
      sql`(estado)::text = ANY ((ARRAY['activo'::character varying, 'licencia'::character varying, 'cesado'::character varying])::text[])`,
    ),
    check("ck_docentes_fechas", sql`(fecha_cese IS NULL) OR (fecha_cese >= fecha_ingreso)`),
    check("ck_docentes_jornada", sql`jornada_horas = ANY (ARRAY[20, 24, 30, 40])`),
  ],
);

export const estudiantes = pgTable(
  "estudiantes",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    personaId: uuid("persona_id").notNull(),
    codigo: varchar({ length: 20 }).notNull(),
    fechaIngreso: date("fecha_ingreso").notNull(),
    lenguaMaterna: varchar("lengua_materna", { length: 50 }),
    religion: varchar({ length: 50 }),
    tieneDiscapacidad: boolean("tiene_discapacidad").default(false).notNull(),
    detalleDiscapacidad: varchar("detalle_discapacidad", { length: 255 }),
    grupoSanguineo: varchar("grupo_sanguineo", { length: 5 }),
    alergias: varchar({ length: 255 }),
    condicionesMedicas: varchar("condiciones_medicas", { length: 500 }),
    seguroSalud: varchar("seguro_salud", { length: 100 }),
    estado: varchar({ length: 20 }).default("activo").notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    eliminadoEn: timestamp("eliminado_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    uniqueIndex("ux_estudiantes_codigo")
      .using("btree", table.codigo.asc().nullsLast().op("text_ops"))
      .where(sql`(eliminado_en IS NULL)`),
    uniqueIndex("ux_estudiantes_persona")
      .using("btree", table.personaId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(eliminado_en IS NULL)`),
    foreignKey({
      columns: [table.personaId],
      foreignColumns: [personas.id],
      name: "fk_estudiantes_persona",
    }),
    check("ck_estudiantes_discapacidad", sql`tiene_discapacidad OR (detalle_discapacidad IS NULL)`),
    check(
      "ck_estudiantes_estado",
      sql`(estado)::text = ANY ((ARRAY['activo'::character varying, 'retirado'::character varying, 'trasladado'::character varying, 'egresado'::character varying])::text[])`,
    ),
  ],
);

export const apoderados = pgTable(
  "apoderados",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    personaId: uuid("persona_id").notNull(),
    ocupacion: varchar({ length: 100 }),
    centroLaboral: varchar("centro_laboral", { length: 150 }),
    telefonoLaboral: varchar("telefono_laboral", { length: 20 }),
    gradoInstruccion: varchar("grado_instruccion", { length: 20 }),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    eliminadoEn: timestamp("eliminado_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    uniqueIndex("ux_apoderados_persona")
      .using("btree", table.personaId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(eliminado_en IS NULL)`),
    foreignKey({
      columns: [table.personaId],
      foreignColumns: [personas.id],
      name: "fk_apoderados_persona",
    }),
    check(
      "ck_apoderados_instruccion",
      sql`(grado_instruccion IS NULL) OR ((grado_instruccion)::text = ANY ((ARRAY['sin_estudios'::character varying, 'primaria'::character varying, 'secundaria'::character varying, 'tecnica'::character varying, 'universitaria'::character varying, 'posgrado'::character varying])::text[]))`,
    ),
  ],
);

export const credenciales = pgTable(
  "credenciales",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    personaId: uuid("persona_id").notNull(),
    codigo: varchar({ length: 50 }).notNull(),
    pinHash: varchar("pin_hash", { length: 128 }),
    activa: boolean().default(true).notNull(),
    emitidaEn: timestamp("emitida_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    venceEn: date("vence_en"),
    anuladaEn: timestamp("anulada_en", { precision: 0, mode: "string" }),
    motivoAnulacion: varchar("motivo_anulacion", { length: 255 }),
  },
  (table) => [
    uniqueIndex("ux_credenciales_codigo_activa")
      .using("btree", table.codigo.asc().nullsLast().op("text_ops"))
      .where(sql`activa`),
    uniqueIndex("ux_credenciales_persona_activa")
      .using("btree", table.personaId.asc().nullsLast().op("uuid_ops"))
      .where(sql`activa`),
    foreignKey({
      columns: [table.personaId],
      foreignColumns: [personas.id],
      name: "fk_credenciales_persona",
    }).onDelete("cascade"),
    check("ck_credenciales_anulacion", sql`activa OR (anulada_en IS NOT NULL)`),
  ],
);

export const secciones = pgTable(
  "secciones",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    anioAcademicoId: uuid("anio_academico_id").notNull(),
    gradoId: uuid("grado_id").notNull(),
    tutorId: uuid("tutor_id"),
    nombre: varchar({ length: 10 }).notNull(),
    aula: varchar({ length: 50 }),
    vacantes: smallint().notNull(),
    estado: varchar({ length: 20 }).default("activa").notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.anioAcademicoId],
      foreignColumns: [aniosAcademicos.id],
      name: "fk_secciones_anio",
    }),
    foreignKey({
      columns: [table.gradoId],
      foreignColumns: [grados.id],
      name: "fk_secciones_grado",
    }),
    foreignKey({
      columns: [table.tutorId],
      foreignColumns: [docentes.id],
      name: "fk_secciones_tutor",
    }),
    unique("uq_secciones_id_anio").on(table.id, table.anioAcademicoId),
    unique("uq_secciones_grado_nombre").on(table.anioAcademicoId, table.gradoId, table.nombre),
    check(
      "ck_secciones_estado",
      sql`(estado)::text = ANY ((ARRAY['activa'::character varying, 'cerrada'::character varying])::text[])`,
    ),
    check("ck_secciones_vacantes", sql`vacantes > 0`),
  ],
);

export const cursosSeccion = pgTable(
  "cursos_seccion",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    seccionId: uuid("seccion_id").notNull(),
    cursoId: uuid("curso_id").notNull(),
    docenteId: uuid("docente_id"),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_cursos_seccion_docente").using(
      "btree",
      table.docenteId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.cursoId],
      foreignColumns: [cursos.id],
      name: "fk_cursos_seccion_curso",
    }),
    foreignKey({
      columns: [table.docenteId],
      foreignColumns: [docentes.id],
      name: "fk_cursos_seccion_docente",
    }),
    foreignKey({
      columns: [table.seccionId],
      foreignColumns: [secciones.id],
      name: "fk_cursos_seccion_seccion",
    }),
    unique("uq_cursos_seccion_seccion_curso").on(table.seccionId, table.cursoId),
  ],
);

export const horarios = pgTable(
  "horarios",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    seccionId: uuid("seccion_id").notNull(),
    cursoSeccionId: uuid("curso_seccion_id"),
    diaSemana: smallint("dia_semana").notNull(),
    horaInicio: time("hora_inicio", { precision: 0 }).notNull(),
    horaFin: time("hora_fin", { precision: 0 }).notNull(),
    tipoBloque: varchar("tipo_bloque", { length: 10 }).default("clase").notNull(),
    aula: varchar({ length: 50 }),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_horarios_curso_seccion").using(
      "btree",
      table.cursoSeccionId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.cursoSeccionId],
      foreignColumns: [cursosSeccion.id],
      name: "fk_horarios_curso_seccion",
    }),
    foreignKey({
      columns: [table.seccionId],
      foreignColumns: [secciones.id],
      name: "fk_horarios_seccion",
    }),
    unique("uq_horarios_bloque").on(table.seccionId, table.diaSemana, table.horaInicio),
    check("ck_horarios_dia", sql`(dia_semana >= 1) AND (dia_semana <= 7)`),
    check("ck_horarios_horas", sql`hora_fin > hora_inicio`),
    check(
      "ck_horarios_tipo",
      sql`(((tipo_bloque)::text = 'clase'::text) AND (curso_seccion_id IS NOT NULL)) OR (((tipo_bloque)::text = 'receso'::text) AND (curso_seccion_id IS NULL))`,
    ),
  ],
);

export const matriculas = pgTable(
  "matriculas",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    estudianteId: uuid("estudiante_id").notNull(),
    seccionId: uuid("seccion_id").notNull(),
    anioAcademicoId: uuid("anio_academico_id").notNull(),
    codigo: varchar({ length: 20 }).notNull(),
    fechaMatricula: date("fecha_matricula").notNull(),
    tipo: varchar({ length: 20 }).notNull(),
    estado: varchar({ length: 20 }).default("matriculado").notNull(),
    esRepitente: boolean("es_repitente").default(false).notNull(),
    colegioProcedencia: varchar("colegio_procedencia", { length: 150 }),
    fechaRetiro: date("fecha_retiro"),
    motivoRetiro: varchar("motivo_retiro", { length: 255 }),
    observaciones: varchar({ length: 500 }),
    registradoPorId: uuid("registrado_por_id"),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_matriculas_seccion_estado").using(
      "btree",
      table.seccionId.asc().nullsLast().op("text_ops"),
      table.estado.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.estudianteId],
      foreignColumns: [estudiantes.id],
      name: "fk_matriculas_estudiante",
    }),
    foreignKey({
      columns: [table.registradoPorId],
      foreignColumns: [usuarios.id],
      name: "fk_matriculas_registrado_por",
    }),
    foreignKey({
      columns: [table.seccionId, table.anioAcademicoId],
      foreignColumns: [secciones.id, secciones.anioAcademicoId],
      name: "fk_matriculas_seccion",
    }),
    unique("uq_matriculas_estudiante_anio").on(table.estudianteId, table.anioAcademicoId),
    unique("uq_matriculas_codigo").on(table.codigo),
    check(
      "ck_matriculas_estado",
      sql`(estado)::text = ANY ((ARRAY['matriculado'::character varying, 'retirado'::character varying, 'trasladado'::character varying, 'culminado'::character varying])::text[])`,
    ),
    check(
      "ck_matriculas_retiro",
      sql`((estado)::text <> ALL ((ARRAY['retirado'::character varying, 'trasladado'::character varying])::text[])) OR (fecha_retiro IS NOT NULL)`,
    ),
    check(
      "ck_matriculas_tipo",
      sql`(tipo)::text = ANY ((ARRAY['nuevo'::character varying, 'continuador'::character varying, 'traslado'::character varying])::text[])`,
    ),
  ],
);

export const libretas = pgTable(
  "libretas",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    matriculaId: uuid("matricula_id").notNull(),
    periodoId: uuid("periodo_id").notNull(),
    fechaLimite: date("fecha_limite").notNull(),
    archivoUrl: varchar("archivo_url", { length: 500 }),
    codigoLeido: varchar("codigo_leido", { length: 20 }),
    subidoPorId: uuid("subido_por_id"),
    subidoEn: timestamp("subido_en", { precision: 0, mode: "string" }),
    estado: varchar({ length: 20 }).default("pendiente").notNull(),
    vistoEn: timestamp("visto_en", { precision: 0, mode: "string" }),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_libretas_periodo_estado").using(
      "btree",
      table.periodoId.asc().nullsLast().op("text_ops"),
      table.estado.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.matriculaId],
      foreignColumns: [matriculas.id],
      name: "fk_libretas_matricula",
    }),
    foreignKey({
      columns: [table.periodoId],
      foreignColumns: [periodosAcademicos.id],
      name: "fk_libretas_periodo",
    }),
    foreignKey({
      columns: [table.subidoPorId],
      foreignColumns: [usuarios.id],
      name: "fk_libretas_subido_por",
    }),
    unique("uq_libretas_matricula_periodo").on(table.matriculaId, table.periodoId),
    check(
      "ck_libretas_estado",
      sql`(estado)::text = ANY ((ARRAY['pendiente'::character varying, 'a_tiempo'::character varying, 'fuera_de_plazo'::character varying])::text[])`,
    ),
    check(
      "ck_libretas_subida",
      sql`(((estado)::text = 'pendiente'::text) AND (archivo_url IS NULL) AND (subido_en IS NULL)) OR (((estado)::text <> 'pendiente'::text) AND (archivo_url IS NOT NULL) AND (subido_en IS NOT NULL) AND (subido_por_id IS NOT NULL))`,
    ),
    check("ck_libretas_visto", sql`(visto_en IS NULL) OR (subido_en IS NOT NULL)`),
  ],
);

export const asistenciasEstudiante = pgTable(
  "asistencias_estudiante",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    matriculaId: uuid("matricula_id").notNull(),
    cursoSeccionId: uuid("curso_seccion_id").notNull(),
    fecha: date().notNull(),
    estado: varchar({ length: 20 }).notNull(),
    justificacion: varchar({ length: 500 }),
    documentoUrl: varchar("documento_url", { length: 255 }),
    registradoPorId: uuid("registrado_por_id"),
    registradoEn: timestamp("registrado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_asistencias_estudiante_curso_fecha").using(
      "btree",
      table.cursoSeccionId.asc().nullsLast().op("date_ops"),
      table.fecha.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.cursoSeccionId],
      foreignColumns: [cursosSeccion.id],
      name: "fk_asistencias_estudiante_curso_seccion",
    }),
    foreignKey({
      columns: [table.matriculaId],
      foreignColumns: [matriculas.id],
      name: "fk_asistencias_estudiante_matricula",
    }),
    foreignKey({
      columns: [table.registradoPorId],
      foreignColumns: [usuarios.id],
      name: "fk_asistencias_estudiante_registrado_por",
    }),
    unique("uq_asistencias_estudiante").on(table.matriculaId, table.cursoSeccionId, table.fecha),
    check(
      "ck_asistencias_estudiante_estado",
      sql`(estado)::text = ANY ((ARRAY['presente'::character varying, 'tardanza'::character varying, 'falta'::character varying, 'falta_justificada'::character varying])::text[])`,
    ),
    check(
      "ck_asistencias_estudiante_justif",
      sql`((estado)::text <> 'falta_justificada'::text) OR (justificacion IS NOT NULL)`,
    ),
  ],
);

export const marcaciones = pgTable(
  "marcaciones",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    personaId: uuid("persona_id").notNull(),
    credencialId: uuid("credencial_id"),
    turnoId: uuid("turno_id"),
    tipo: varchar({ length: 10 }).notNull(),
    fechaHora: timestamp("fecha_hora", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    origen: varchar({ length: 10 }).notNull(),
    resultado: varchar({ length: 20 }).notNull(),
    minutosTardanza: smallint("minutos_tardanza").default(0).notNull(),
    latitud: numeric({ precision: 10, scale: 7 }),
    longitud: numeric({ precision: 10, scale: 7 }),
    dentroGeocerca: boolean("dentro_geocerca"),
    justificada: boolean().default(false).notNull(),
    motivoJustificacion: varchar("motivo_justificacion", { length: 500 }),
    justificadaPorId: uuid("justificada_por_id"),
    justificadaEn: timestamp("justificada_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    index("ix_marcaciones_fecha").using(
      "btree",
      table.fechaHora.asc().nullsLast().op("timestamp_ops"),
    ),
    index("ix_marcaciones_persona_fecha").using(
      "btree",
      table.personaId.asc().nullsLast().op("timestamp_ops"),
      table.fechaHora.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.credencialId],
      foreignColumns: [credenciales.id],
      name: "fk_marcaciones_credencial",
    }),
    foreignKey({
      columns: [table.justificadaPorId],
      foreignColumns: [usuarios.id],
      name: "fk_marcaciones_justificada_por",
    }),
    foreignKey({
      columns: [table.personaId],
      foreignColumns: [personas.id],
      name: "fk_marcaciones_persona",
    }),
    foreignKey({
      columns: [table.turnoId],
      foreignColumns: [turnos.id],
      name: "fk_marcaciones_turno",
    }),
    check(
      "ck_marcaciones_justificacion",
      sql`(NOT justificada) OR ((motivo_justificacion IS NOT NULL) AND (justificada_por_id IS NOT NULL) AND (justificada_en IS NOT NULL))`,
    ),
    check("ck_marcaciones_minutos", sql`minutos_tardanza >= 0`),
    check(
      "ck_marcaciones_origen",
      sql`(origen)::text = ANY ((ARRAY['kiosko'::character varying, 'intranet'::character varying, 'manual'::character varying])::text[])`,
    ),
    check(
      "ck_marcaciones_resultado",
      sql`(resultado)::text = ANY ((ARRAY['puntual'::character varying, 'tardanza'::character varying, 'salida_anticipada'::character varying, 'fuera_de_turno'::character varying])::text[])`,
    ),
    check(
      "ck_marcaciones_tipo",
      sql`(tipo)::text = ANY ((ARRAY['entrada'::character varying, 'salida'::character varying])::text[])`,
    ),
  ],
);

export const turnos = pgTable(
  "turnos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    aplicaA: varchar("aplica_a", { length: 20 }).notNull(),
    horaEntrada: time("hora_entrada", { precision: 0 }).notNull(),
    horaSalida: time("hora_salida", { precision: 0 }).notNull(),
    ventanaEntradaInicio: time("ventana_entrada_inicio", { precision: 0 }),
    ventanaEntradaFin: time("ventana_entrada_fin", { precision: 0 }),
    ventanaSalidaInicio: time("ventana_salida_inicio", { precision: 0 }),
    ventanaSalidaFin: time("ventana_salida_fin", { precision: 0 }),
    toleranciaMin: smallint("tolerancia_min").default(10).notNull(),
    diasLaborables: varchar("dias_laborables", { length: 20 }).default("1,2,3,4,5").notNull(),
    activo: boolean().default(true).notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    unique("uq_turnos_aplica_a").on(table.aplicaA),
    check(
      "ck_turnos_aplica_a",
      sql`(aplica_a)::text = ANY ((ARRAY['estudiantes'::character varying, 'docentes'::character varying, 'administrativos'::character varying])::text[])`,
    ),
    check("ck_turnos_horas", sql`hora_salida > hora_entrada`),
    check("ck_turnos_tolerancia", sql`tolerancia_min >= 0`),
  ],
);

export const equiposAutorizados = pgTable(
  "equipos_autorizados",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    nombre: varchar({ length: 100 }).notNull(),
    ubicacion: varchar({ length: 150 }).notNull(),
    tipo: varchar({ length: 20 }).notNull(),
    proposito: varchar({ length: 20 }).notNull(),
    usuariosPermitidos: varchar("usuarios_permitidos", { length: 100 }).notNull(),
    numeroSerie: varchar("numero_serie", { length: 100 }),
    tokenAutorizacion: varchar("token_autorizacion", { length: 255 }),
    autorizado: boolean().default(false).notNull(),
    autorizadoEn: timestamp("autorizado_en", { precision: 0, mode: "string" }),
    autorizadoPorId: uuid("autorizado_por_id"),
    activo: boolean().default(true).notNull(),
    ultimoAcceso: timestamp("ultimo_acceso", { precision: 0, mode: "string" }),
    ipRegistro: varchar("ip_registro", { length: 45 }),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    eliminadoEn: timestamp("eliminado_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    unique("uq_equipos_autorizados_nombre").on(table.nombre),
    foreignKey({
      columns: [table.autorizadoPorId],
      foreignColumns: [usuarios.id],
      name: "fk_equipos_autorizado_por",
    }),
    check(
      "ck_equipos_tipo",
      sql`(tipo)::text = ANY ((ARRAY['kiosko'::character varying, 'biometrico'::character varying])::text[])`,
    ),
    check(
      "ck_equipos_proposito",
      sql`(proposito)::text = ANY ((ARRAY['marcacion'::character varying, 'sesiones'::character varying])::text[])`,
    ),
  ],
);

export const sesionesClase = pgTable(
  "sesiones_clase",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    horarioId: uuid("horario_id").notNull(),
    docenteId: uuid("docente_id").notNull(),
    fecha: date().notNull(),
    horaInicioReal: time("hora_inicio_real", { precision: 0 }),
    horaFinReal: time("hora_fin_real", { precision: 0 }),
    estado: varchar({ length: 20 }).default("pendiente").notNull(),
    minutosPerdidos: smallint("minutos_perdidos").default(0).notNull(),
    tema: varchar({ length: 500 }),
    observaciones: varchar({ length: 500 }),
    justificacion: varchar({ length: 500 }),
    firmadaInicioEn: timestamp("firmada_inicio_en", { precision: 0, mode: "string" }),
    firmadaFinEn: timestamp("firmada_fin_en", { precision: 0, mode: "string" }),
    latitud: numeric({ precision: 10, scale: 7 }),
    longitud: numeric({ precision: 10, scale: 7 }),
    dentroGeocerca: boolean("dentro_geocerca"),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_sesiones_clase_docente_fecha").using(
      "btree",
      table.docenteId.asc().nullsLast().op("uuid_ops"),
      table.fecha.asc().nullsLast().op("uuid_ops"),
    ),
    index("ix_sesiones_clase_fecha_estado").using(
      "btree",
      table.fecha.asc().nullsLast().op("text_ops"),
      table.estado.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.docenteId],
      foreignColumns: [docentes.id],
      name: "fk_sesiones_clase_docente",
    }),
    foreignKey({
      columns: [table.horarioId],
      foreignColumns: [horarios.id],
      name: "fk_sesiones_clase_horario",
    }),
    unique("uq_sesiones_clase_horario_fecha").on(table.horarioId, table.fecha),
    check(
      "ck_sesiones_clase_estado",
      sql`(estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en_curso'::character varying, 'cumplida'::character varying, 'parcial'::character varying, 'no_cumplida'::character varying, 'justificada'::character varying, 'reprogramada'::character varying])::text[])`,
    ),
    check(
      "ck_sesiones_clase_horas",
      sql`(hora_fin_real IS NULL) OR (hora_inicio_real IS NULL) OR (hora_fin_real > hora_inicio_real)`,
    ),
    check(
      "ck_sesiones_clase_justificada",
      sql`((estado)::text <> 'justificada'::text) OR (justificacion IS NOT NULL)`,
    ),
    check("ck_sesiones_clase_minutos", sql`minutos_perdidos >= 0`),
  ],
);

export const ausenciasSesion = pgTable(
  "ausencias_sesion",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    sesionClaseId: uuid("sesion_clase_id").notNull(),
    registradoPorId: uuid("registrado_por_id").notNull(),
    horaDesde: time("hora_desde", { precision: 0 }).notNull(),
    horaHasta: time("hora_hasta", { precision: 0 }).notNull(),
    minutos: integer().generatedAlwaysAs(
      sql`((EXTRACT(epoch FROM (hora_hasta - hora_desde)) / (60)::numeric))::integer`,
    ),
    motivo: varchar({ length: 30 }).notNull(),
    observacion: varchar({ length: 1000 }),
    descargo: varchar({ length: 1000 }),
    descargoEn: timestamp("descargo_en", { precision: 0, mode: "string" }),
    registradoEn: timestamp("registrado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_ausencias_sesion_sesion").using(
      "btree",
      table.sesionClaseId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.registradoPorId],
      foreignColumns: [usuarios.id],
      name: "fk_ausencias_sesion_registrado_por",
    }),
    foreignKey({
      columns: [table.sesionClaseId],
      foreignColumns: [sesionesClase.id],
      name: "fk_ausencias_sesion_sesion",
    }).onDelete("cascade"),
    check("ck_ausencias_sesion_descargo", sql`(descargo IS NULL) OR (descargo_en IS NOT NULL)`),
    check("ck_ausencias_sesion_horas", sql`hora_hasta > hora_desde`),
    check(
      "ck_ausencias_sesion_motivo",
      sql`(motivo)::text = ANY ((ARRAY['fuera_del_aula'::character varying, 'desayunando'::character varying, 'servicios_higienicos'::character varying, 'uso_celular'::character varying, 'otro'::character varying])::text[])`,
    ),
    check(
      "ck_ausencias_sesion_otro",
      sql`((motivo)::text <> 'otro'::text) OR (observacion IS NOT NULL)`,
    ),
  ],
);

export const evidenciasAusencia = pgTable(
  "evidencias_ausencia",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ausenciaId: uuid("ausencia_id").notNull(),
    archivoUrl: varchar("archivo_url", { length: 500 }).notNull(),
    tomadaEn: timestamp("tomada_en", { precision: 0, mode: "string" }),
    orden: smallint().default(1).notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.ausenciaId],
      foreignColumns: [ausenciasSesion.id],
      name: "fk_evidencias_ausencia_ausencia",
    }).onDelete("cascade"),
    unique("uq_evidencias_ausencia_orden").on(table.ausenciaId, table.orden),
  ],
);

export const consolidadosDocente = pgTable(
  "consolidados_docente",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    docenteId: uuid("docente_id").notNull(),
    periodoId: uuid("periodo_id").notNull(),
    sesionesProgramadas: smallint("sesiones_programadas").notNull(),
    sesionesCumplidas: smallint("sesiones_cumplidas").notNull(),
    totalAusencias: smallint("total_ausencias").default(0).notNull(),
    minutosFueraAula: integer("minutos_fuera_aula").default(0).notNull(),
    decision: varchar({ length: 20 }).default("ninguna").notNull(),
    observacion: varchar({ length: 1000 }),
    generadoPorId: uuid("generado_por_id").notNull(),
    generadoEn: timestamp("generado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    enviadoEn: timestamp("enviado_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.docenteId],
      foreignColumns: [docentes.id],
      name: "fk_consolidados_docente_docente",
    }),
    foreignKey({
      columns: [table.generadoPorId],
      foreignColumns: [usuarios.id],
      name: "fk_consolidados_docente_generado_por",
    }),
    foreignKey({
      columns: [table.periodoId],
      foreignColumns: [periodosAcademicos.id],
      name: "fk_consolidados_docente_periodo",
    }),
    unique("uq_consolidados_docente").on(table.docenteId, table.periodoId),
    check(
      "ck_consolidados_docente_ausencias",
      sql`(total_ausencias >= 0) AND (minutos_fuera_aula >= 0)`,
    ),
    check(
      "ck_consolidados_docente_decision",
      sql`(decision)::text = ANY ((ARRAY['ninguna'::character varying, 'llamada_atencion'::character varying, 'descuento'::character varying, 'derivado'::character varying])::text[])`,
    ),
    check(
      "ck_consolidados_docente_sesiones",
      sql`(sesiones_programadas >= 0) AND ((sesiones_cumplidas >= 0) AND (sesiones_cumplidas <= sesiones_programadas))`,
    ),
  ],
);

export const incidenciasConducta = pgTable(
  "incidencias_conducta",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    matriculaId: uuid("matricula_id").notNull(),
    periodoId: uuid("periodo_id").notNull(),
    registradoPorId: uuid("registrado_por_id").notNull(),
    fecha: date().notNull(),
    tipo: varchar({ length: 10 }).notNull(),
    categoria: varchar({ length: 100 }).notNull(),
    gravedad: varchar({ length: 10 }),
    descripcion: varchar({ length: 1000 }).notNull(),
    lugar: varchar({ length: 100 }),
    medidasTomadas: varchar("medidas_tomadas", { length: 1000 }),
    apoderadoNotificado: boolean("apoderado_notificado").default(false).notNull(),
    fechaNotificacion: date("fecha_notificacion"),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_incidencias_matricula_fecha").using(
      "btree",
      table.matriculaId.asc().nullsLast().op("date_ops"),
      table.fecha.asc().nullsLast().op("date_ops"),
    ),
    foreignKey({
      columns: [table.matriculaId],
      foreignColumns: [matriculas.id],
      name: "fk_incidencias_matricula",
    }),
    foreignKey({
      columns: [table.periodoId],
      foreignColumns: [periodosAcademicos.id],
      name: "fk_incidencias_periodo",
    }),
    foreignKey({
      columns: [table.registradoPorId],
      foreignColumns: [usuarios.id],
      name: "fk_incidencias_registrado_por",
    }),
    check(
      "ck_incidencias_gravedad",
      sql`(((tipo)::text = 'merito'::text) AND (gravedad IS NULL)) OR (((tipo)::text = 'falta'::text) AND ((gravedad)::text = ANY ((ARRAY['leve'::character varying, 'grave'::character varying, 'muy_grave'::character varying])::text[])))`,
    ),
    check(
      "ck_incidencias_notificacion",
      sql`(NOT apoderado_notificado) OR (fecha_notificacion IS NOT NULL)`,
    ),
    check(
      "ck_incidencias_tipo",
      sql`(tipo)::text = ANY ((ARRAY['merito'::character varying, 'falta'::character varying])::text[])`,
    ),
  ],
);

export const observacionesEstudiante = pgTable(
  "observaciones_estudiante",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    matriculaId: uuid("matricula_id").notNull(),
    registradoPorId: uuid("registrado_por_id").notNull(),
    fecha: date().notNull(),
    tipo: varchar({ length: 20 }).notNull(),
    observacion: varchar({ length: 2000 }).notNull(),
    seguimiento: varchar({ length: 2000 }),
    derivadoA: varchar("derivado_a", { length: 100 }),
    esConfidencial: boolean("es_confidencial").default(false).notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_observaciones_matricula_fecha").using(
      "btree",
      table.matriculaId.asc().nullsLast().op("date_ops"),
      table.fecha.asc().nullsLast().op("date_ops"),
    ),
    foreignKey({
      columns: [table.matriculaId],
      foreignColumns: [matriculas.id],
      name: "fk_observaciones_matricula",
    }),
    foreignKey({
      columns: [table.registradoPorId],
      foreignColumns: [usuarios.id],
      name: "fk_observaciones_registrado_por",
    }),
    check(
      "ck_observaciones_tipo",
      sql`(tipo)::text = ANY ((ARRAY['academica'::character varying, 'conductual'::character varying, 'socioemocional'::character varying, 'salud'::character varying, 'familiar'::character varying])::text[])`,
    ),
  ],
);

export const comunicados = pgTable(
  "comunicados",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    autorId: uuid("autor_id").notNull(),
    titulo: varchar({ length: 150 }).notNull(),
    contenido: text().notNull(),
    dirigidoA: varchar("dirigido_a", { length: 20 }).notNull(),
    gradoId: uuid("grado_id"),
    seccionId: uuid("seccion_id"),
    prioridad: varchar({ length: 10 }).default("normal").notNull(),
    estado: varchar({ length: 20 }).default("borrador").notNull(),
    adjuntoUrl: varchar("adjunto_url", { length: 255 }),
    publicadoEn: timestamp("publicado_en", { precision: 0, mode: "string" }),
    venceEn: timestamp("vence_en", { precision: 0, mode: "string" }),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_comunicados_estado_fecha").using(
      "btree",
      table.estado.asc().nullsLast().op("text_ops"),
      table.publicadoEn.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.autorId],
      foreignColumns: [usuarios.id],
      name: "fk_comunicados_autor",
    }),
    foreignKey({
      columns: [table.gradoId],
      foreignColumns: [grados.id],
      name: "fk_comunicados_grado",
    }),
    foreignKey({
      columns: [table.seccionId],
      foreignColumns: [secciones.id],
      name: "fk_comunicados_seccion",
    }),
    check(
      "ck_comunicados_dirigido",
      sql`(dirigido_a)::text = ANY ((ARRAY['todos'::character varying, 'docentes'::character varying, 'estudiantes'::character varying, 'apoderados'::character varying])::text[])`,
    ),
    check(
      "ck_comunicados_estado",
      sql`(estado)::text = ANY ((ARRAY['borrador'::character varying, 'publicado'::character varying, 'archivado'::character varying])::text[])`,
    ),
    check(
      "ck_comunicados_prioridad",
      sql`(prioridad)::text = ANY ((ARRAY['normal'::character varying, 'importante'::character varying, 'urgente'::character varying])::text[])`,
    ),
    check(
      "ck_comunicados_publicado",
      sql`((estado)::text = 'borrador'::text) OR (publicado_en IS NOT NULL)`,
    ),
    check(
      "ck_comunicados_vence",
      sql`(vence_en IS NULL) OR (publicado_en IS NULL) OR (vence_en > publicado_en)`,
    ),
  ],
);

export const notificaciones = pgTable(
  "notificaciones",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    usuarioId: uuid("usuario_id").notNull(),
    titulo: varchar({ length: 150 }).notNull(),
    mensaje: varchar({ length: 500 }).notNull(),
    tipo: varchar({ length: 20 }).default("informacion").notNull(),
    enlaceUrl: varchar("enlace_url", { length: 255 }),
    comunicadoId: uuid("comunicado_id"),
    sesionClaseId: uuid("sesion_clase_id"),
    leida: boolean().default(false).notNull(),
    leidaEn: timestamp("leida_en", { precision: 0, mode: "string" }),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_notificaciones_comunicado")
      .using("btree", table.comunicadoId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(comunicado_id IS NOT NULL)`),
    index("ix_notificaciones_usuario_no_leidas")
      .using(
        "btree",
        table.usuarioId.asc().nullsLast().op("timestamp_ops"),
        table.creadoEn.asc().nullsLast().op("timestamp_ops"),
      )
      .where(sql`(NOT leida)`),
    foreignKey({
      columns: [table.comunicadoId],
      foreignColumns: [comunicados.id],
      name: "fk_notificaciones_comunicado",
    }),
    foreignKey({
      columns: [table.sesionClaseId],
      foreignColumns: [sesionesClase.id],
      name: "fk_notificaciones_sesion",
    }),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "fk_notificaciones_usuario",
    }).onDelete("cascade"),
    check("ck_notificaciones_leida", sql`(NOT leida) OR (leida_en IS NOT NULL)`),
    check(
      "ck_notificaciones_tipo",
      sql`(tipo)::text = ANY ((ARRAY['informacion'::character varying, 'alerta'::character varying, 'recordatorio'::character varying])::text[])`,
    ),
  ],
);

export const unidadesAprendizaje = pgTable(
  "unidades_aprendizaje",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    cursoSeccionId: uuid("curso_seccion_id").notNull(),
    periodoId: uuid("periodo_id"),
    titulo: varchar({ length: 150 }).notNull(),
    descripcion: varchar({ length: 1000 }),
    orden: smallint().default(1).notNull(),
    fechaInicio: date("fecha_inicio"),
    fechaFin: date("fecha_fin"),
    publicada: boolean().default(false).notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_unidades_curso_seccion").using(
      "btree",
      table.cursoSeccionId.asc().nullsLast().op("int2_ops"),
      table.orden.asc().nullsLast().op("int2_ops"),
    ),
    foreignKey({
      columns: [table.cursoSeccionId],
      foreignColumns: [cursosSeccion.id],
      name: "fk_unidades_curso_seccion",
    }),
    foreignKey({
      columns: [table.periodoId],
      foreignColumns: [periodosAcademicos.id],
      name: "fk_unidades_periodo",
    }),
    check(
      "ck_unidades_fechas",
      sql`(fecha_fin IS NULL) OR (fecha_inicio IS NULL) OR (fecha_fin >= fecha_inicio)`,
    ),
  ],
);

export const materiales = pgTable(
  "materiales",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    unidadId: uuid("unidad_id").notNull(),
    sesionClaseId: uuid("sesion_clase_id"),
    publicadoPorId: uuid("publicado_por_id").notNull(),
    titulo: varchar({ length: 150 }).notNull(),
    descripcion: varchar({ length: 1000 }),
    tipo: varchar({ length: 20 }).notNull(),
    url: varchar({ length: 500 }).notNull(),
    permiteDescarga: boolean("permite_descarga").default(true).notNull(),
    visible: boolean().default(true).notNull(),
    orden: smallint().default(1).notNull(),
    fechaProgramada: timestamp("fecha_programada", { precision: 0, mode: "string" }),
    publicadoEn: timestamp("publicado_en", { precision: 0, mode: "string" }),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_materiales_unidad").using(
      "btree",
      table.unidadId.asc().nullsLast().op("int2_ops"),
      table.orden.asc().nullsLast().op("int2_ops"),
    ),
    foreignKey({
      columns: [table.publicadoPorId],
      foreignColumns: [docentes.id],
      name: "fk_materiales_publicado_por",
    }),
    foreignKey({
      columns: [table.sesionClaseId],
      foreignColumns: [sesionesClase.id],
      name: "fk_materiales_sesion_clase",
    }),
    foreignKey({
      columns: [table.unidadId],
      foreignColumns: [unidadesAprendizaje.id],
      name: "fk_materiales_unidad",
    }),
    check(
      "ck_materiales_tipo",
      sql`(tipo)::text = ANY ((ARRAY['documento'::character varying, 'presentacion'::character varying, 'video'::character varying, 'audio'::character varying, 'enlace'::character varying, 'otro'::character varying])::text[])`,
    ),
  ],
);

export const tareas = pgTable(
  "tareas",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    cursoSeccionId: uuid("curso_seccion_id").notNull(),
    unidadId: uuid("unidad_id"),
    sesionClaseId: uuid("sesion_clase_id"),
    titulo: varchar({ length: 150 }).notNull(),
    instrucciones: text(),
    tipo: varchar({ length: 20 }).notNull(),
    puntajeMaximo: numeric("puntaje_maximo", { precision: 4, scale: 2 }).default("20").notNull(),
    publicadaEn: timestamp("publicada_en", { precision: 0, mode: "string" }),
    fechaLimite: timestamp("fecha_limite", { precision: 0, mode: "string" }).notNull(),
    permiteEntregaTardia: boolean("permite_entrega_tardia").default(false).notNull(),
    intentosMaximos: smallint("intentos_maximos").default(1).notNull(),
    tiposArchivo: varchar("tipos_archivo", { length: 100 }),
    estado: varchar({ length: 20 }).default("borrador").notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_tareas_curso_seccion_limite").using(
      "btree",
      table.cursoSeccionId.asc().nullsLast().op("timestamp_ops"),
      table.fechaLimite.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.cursoSeccionId],
      foreignColumns: [cursosSeccion.id],
      name: "fk_tareas_curso_seccion",
    }),
    foreignKey({
      columns: [table.sesionClaseId],
      foreignColumns: [sesionesClase.id],
      name: "fk_tareas_sesion_clase",
    }),
    foreignKey({
      columns: [table.unidadId],
      foreignColumns: [unidadesAprendizaje.id],
      name: "fk_tareas_unidad",
    }),
    check(
      "ck_tareas_estado",
      sql`(estado)::text = ANY ((ARRAY['borrador'::character varying, 'publicada'::character varying, 'cerrada'::character varying])::text[])`,
    ),
    check("ck_tareas_fechas", sql`(publicada_en IS NULL) OR (fecha_limite > publicada_en)`),
    check("ck_tareas_intentos", sql`intentos_maximos > 0`),
    check(
      "ck_tareas_publicada",
      sql`((estado)::text = 'borrador'::text) OR (publicada_en IS NOT NULL)`,
    ),
    check(
      "ck_tareas_puntaje",
      sql`(puntaje_maximo > (0)::numeric) AND (puntaje_maximo <= (20)::numeric)`,
    ),
    check(
      "ck_tareas_tipo",
      sql`(tipo)::text = ANY ((ARRAY['entregable'::character varying, 'cuestionario'::character varying, 'proyecto'::character varying])::text[])`,
    ),
  ],
);

export const preguntasTarea = pgTable(
  "preguntas_tarea",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    tareaId: uuid("tarea_id").notNull(),
    enunciado: varchar({ length: 1000 }).notNull(),
    tipo: varchar({ length: 20 }).notNull(),
    puntaje: numeric({ precision: 4, scale: 2 }).default("1").notNull(),
    orden: smallint().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.tareaId],
      foreignColumns: [tareas.id],
      name: "fk_preguntas_tarea_tarea",
    }).onDelete("cascade"),
    unique("uq_preguntas_tarea_orden").on(table.tareaId, table.orden),
    check("ck_preguntas_tarea_puntaje", sql`puntaje > (0)::numeric`),
    check(
      "ck_preguntas_tarea_tipo",
      sql`(tipo)::text = ANY ((ARRAY['opcion_unica'::character varying, 'opcion_multiple'::character varying, 'respuesta_corta'::character varying])::text[])`,
    ),
  ],
);

export const opcionesPregunta = pgTable(
  "opciones_pregunta",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    preguntaId: uuid("pregunta_id").notNull(),
    texto: varchar({ length: 255 }).notNull(),
    esCorrecta: boolean("es_correcta").default(false).notNull(),
    orden: smallint().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.preguntaId],
      foreignColumns: [preguntasTarea.id],
      name: "fk_opciones_pregunta_pregunta",
    }).onDelete("cascade"),
    unique("uq_opciones_pregunta_orden").on(table.preguntaId, table.orden),
  ],
);

export const entregasTarea = pgTable(
  "entregas_tarea",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    tareaId: uuid("tarea_id").notNull(),
    matriculaId: uuid("matricula_id").notNull(),
    intento: smallint().default(1).notNull(),
    entregadaEn: timestamp("entregada_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    texto: text(),
    archivoUrl: varchar("archivo_url", { length: 500 }),
    enlaceUrl: varchar("enlace_url", { length: 500 }),
    respuestas: jsonb(),
    esTardia: boolean("es_tardia").default(false).notNull(),
    estado: varchar({ length: 20 }).default("entregada").notNull(),
    nota: numeric({ precision: 4, scale: 2 }),
    retroalimentacion: varchar({ length: 2000 }),
    calificadaPorId: uuid("calificada_por_id"),
    calificadaEn: timestamp("calificada_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    index("ix_entregas_tarea_matricula").using(
      "btree",
      table.matriculaId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.calificadaPorId],
      foreignColumns: [usuarios.id],
      name: "fk_entregas_tarea_calificada_por",
    }),
    foreignKey({
      columns: [table.matriculaId],
      foreignColumns: [matriculas.id],
      name: "fk_entregas_tarea_matricula",
    }),
    foreignKey({
      columns: [table.tareaId],
      foreignColumns: [tareas.id],
      name: "fk_entregas_tarea_tarea",
    }),
    unique("uq_entregas_tarea_intento").on(table.tareaId, table.matriculaId, table.intento),
    check(
      "ck_entregas_tarea_calificada",
      sql`((estado)::text <> 'calificada'::text) OR ((nota IS NOT NULL) AND (calificada_en IS NOT NULL))`,
    ),
    check(
      "ck_entregas_tarea_contenido",
      sql`(texto IS NOT NULL) OR (archivo_url IS NOT NULL) OR (enlace_url IS NOT NULL) OR (respuestas IS NOT NULL)`,
    ),
    check(
      "ck_entregas_tarea_estado",
      sql`(estado)::text = ANY ((ARRAY['entregada'::character varying, 'calificada'::character varying, 'devuelta'::character varying])::text[])`,
    ),
    check(
      "ck_entregas_tarea_nota",
      sql`(nota IS NULL) OR ((nota >= (0)::numeric) AND (nota <= (20)::numeric))`,
    ),
  ],
);

export const publicacionesAula = pgTable(
  "publicaciones_aula",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    cursoSeccionId: uuid("curso_seccion_id").notNull(),
    autorId: uuid("autor_id").notNull(),
    contenido: text().notNull(),
    adjuntoUrl: varchar("adjunto_url", { length: 500 }),
    fijada: boolean().default(false).notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    eliminadoEn: timestamp("eliminado_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    index("ix_publicaciones_aula_curso_fecha").using(
      "btree",
      table.cursoSeccionId.asc().nullsLast().op("timestamp_ops"),
      table.creadoEn.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.autorId],
      foreignColumns: [usuarios.id],
      name: "fk_publicaciones_aula_autor",
    }),
    foreignKey({
      columns: [table.cursoSeccionId],
      foreignColumns: [cursosSeccion.id],
      name: "fk_publicaciones_aula_curso_seccion",
    }),
  ],
);

export const comentariosPublicacion = pgTable(
  "comentarios_publicacion",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    publicacionId: uuid("publicacion_id").notNull(),
    autorId: uuid("autor_id").notNull(),
    contenido: varchar({ length: 1000 }).notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    eliminadoEn: timestamp("eliminado_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    index("ix_comentarios_publicacion").using(
      "btree",
      table.publicacionId.asc().nullsLast().op("timestamp_ops"),
      table.creadoEn.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.autorId],
      foreignColumns: [usuarios.id],
      name: "fk_comentarios_publicacion_autor",
    }),
    foreignKey({
      columns: [table.publicacionId],
      foreignColumns: [publicacionesAula.id],
      name: "fk_comentarios_publicacion_publicacion",
    }).onDelete("cascade"),
  ],
);

export const mensajesChat = pgTable(
  "mensajes_chat",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    cursoSeccionId: uuid("curso_seccion_id").notNull(),
    emisorId: uuid("emisor_id").notNull(),
    receptorId: uuid("receptor_id"),
    contenido: varchar({ length: 2000 }).notNull(),
    adjuntoUrl: varchar("adjunto_url", { length: 500 }),
    enviadoEn: timestamp("enviado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    leidoEn: timestamp("leido_en", { precision: 0, mode: "string" }),
    eliminadoEn: timestamp("eliminado_en", { precision: 0, mode: "string" }),
  },
  (table) => [
    index("ix_mensajes_chat_curso_fecha").using(
      "btree",
      table.cursoSeccionId.asc().nullsLast().op("timestamp_ops"),
      table.enviadoEn.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.cursoSeccionId],
      foreignColumns: [cursosSeccion.id],
      name: "fk_mensajes_chat_curso_seccion",
    }),
    foreignKey({
      columns: [table.emisorId],
      foreignColumns: [usuarios.id],
      name: "fk_mensajes_chat_emisor",
    }),
    foreignKey({
      columns: [table.receptorId],
      foreignColumns: [usuarios.id],
      name: "fk_mensajes_chat_receptor",
    }),
    check("ck_mensajes_chat_receptor", sql`(receptor_id IS NULL) OR (receptor_id <> emisor_id)`),
  ],
);

export const actividadAula = pgTable(
  "actividad_aula",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({
      name: "actividad_aula_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,

      cache: 1,
    }),
    matriculaId: uuid("matricula_id").notNull(),
    materialId: uuid("material_id"),
    tareaId: uuid("tarea_id"),
    accion: varchar({ length: 20 }).notNull(),
    registradoEn: timestamp("registrado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ix_actividad_aula_matricula").using(
      "btree",
      table.matriculaId.asc().nullsLast().op("timestamp_ops"),
      table.registradoEn.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.materialId],
      foreignColumns: [materiales.id],
      name: "fk_actividad_aula_material",
    }),
    foreignKey({
      columns: [table.matriculaId],
      foreignColumns: [matriculas.id],
      name: "fk_actividad_aula_matricula",
    }),
    foreignKey({
      columns: [table.tareaId],
      foreignColumns: [tareas.id],
      name: "fk_actividad_aula_tarea",
    }),
    check(
      "ck_actividad_aula_accion",
      sql`(accion)::text = ANY ((ARRAY['visualizo'::character varying, 'descargo'::character varying, 'completo'::character varying])::text[])`,
    ),
    check("ck_actividad_aula_recurso", sql`num_nonnulls(material_id, tarea_id) = 1`),
  ],
);

export const institucion = pgTable(
  "institucion",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    filaUnica: boolean("fila_unica").default(true).notNull(),
    nombre: varchar({ length: 150 }).notNull(),
    codigoModular: varchar("codigo_modular", { length: 20 }).notNull(),
    codigoLocal: varchar("codigo_local", { length: 20 }),
    tipoGestion: varchar("tipo_gestion", { length: 20 }).notNull(),
    ugel: varchar({ length: 100 }),
    dre: varchar({ length: 100 }),
    director: varchar({ length: 150 }),
    direccion: varchar({ length: 255 }).notNull(),
    distrito: varchar({ length: 100 }),
    provincia: varchar({ length: 100 }),
    departamento: varchar({ length: 100 }),
    telefono: varchar({ length: 20 }),
    correo: varchar({ length: 100 }),
    logoUrl: varchar("logo_url", { length: 255 }),
    latitud: numeric({ precision: 10, scale: 7 }),
    longitud: numeric({ precision: 10, scale: 7 }),
    radioGeocercaM: integer("radio_geocerca_m").default(120).notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    actualizadoEn: timestamp("actualizado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    unique("uq_institucion_fila_unica").on(table.filaUnica),
    check("ck_institucion_fila_unica", sql`CHECK (fila_unica)`),
    check("ck_institucion_radio", sql`radio_geocerca_m > 0`),
    check(
      "ck_institucion_tipo_gestion",
      sql`(tipo_gestion)::text = ANY ((ARRAY['publica'::character varying, 'privada'::character varying, 'convenio'::character varying])::text[])`,
    ),
  ],
);

export const estudianteApoderados = pgTable(
  "estudiante_apoderados",
  {
    estudianteId: uuid("estudiante_id").notNull(),
    apoderadoId: uuid("apoderado_id").notNull(),
    parentesco: varchar({ length: 20 }).notNull(),
    esPrincipal: boolean("es_principal").default(false).notNull(),
    viveConEstudiante: boolean("vive_con_estudiante").default(false).notNull(),
    autorizadoRecoger: boolean("autorizado_recoger").default(false).notNull(),
    contactoEmergencia: boolean("contacto_emergencia").default(false).notNull(),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("ux_estudiante_apoderados_principal")
      .using("btree", table.estudianteId.asc().nullsLast().op("uuid_ops"))
      .where(sql`es_principal`),
    foreignKey({
      columns: [table.apoderadoId],
      foreignColumns: [apoderados.id],
      name: "fk_estudiante_apoderados_apoderado",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.estudianteId],
      foreignColumns: [estudiantes.id],
      name: "fk_estudiante_apoderados_estudiante",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.estudianteId, table.apoderadoId],
      name: "pk_estudiante_apoderados",
    }),
    check(
      "ck_estudiante_apoderados_parentesco",
      sql`(parentesco)::text = ANY ((ARRAY['padre'::character varying, 'madre'::character varying, 'abuelo'::character varying, 'abuela'::character varying, 'hermano'::character varying, 'hermana'::character varying, 'tio'::character varying, 'tia'::character varying, 'tutor_legal'::character varying, 'otro'::character varying])::text[])`,
    ),
  ],
);

export const variablesSistema = pgTable(
  "variables_sistema",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    codigo: varchar({ length: 60 }).notNull(),
    descripcion: varchar({ length: 255 }).notNull(),
    modulo: varchar({ length: 30 }).notNull(),
    tipo: varchar({ length: 10 }).notNull(),
    valor: text().notNull(),
    unidad: varchar({ length: 20 }),
    valorMinimo: numeric("valor_minimo", { precision: 18, scale: 4 }),
    valorMaximo: numeric("valor_maximo", { precision: 18, scale: 4 }),
    editable: boolean().default(true).notNull(),
    cargaEnAplicacion: boolean("carga_en_aplicacion").default(true).notNull(),
    vigente: boolean().default(true).notNull(),
    motivoCambio: varchar("motivo_cambio", { length: 500 }),
    actualizadoPorId: uuid("actualizado_por_id"),
    creadoEn: timestamp("creado_en", { precision: 0, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("ux_variables_sistema_vigente")
      .on(table.codigo)
      .where(sql`vigente = true`),
    foreignKey({
      columns: [table.actualizadoPorId],
      foreignColumns: [usuarios.id],
      name: "fk_variables_sistema_actualizado_por",
    }),
    check(
      "ck_variables_sistema_tipo",
      sql`(tipo)::text = ANY ((ARRAY['texto'::character varying, 'entero'::character varying, 'decimal'::character varying, 'booleano'::character varying, 'fecha'::character varying, 'hora'::character varying, 'lista'::character varying])::text[])`,
    ),
  ],
);
