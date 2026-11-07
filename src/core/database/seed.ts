import { Pool } from "pg";
import * as bcrypt from "bcryptjs";
import { asegurarCuentaServicioBiometrico } from "./seed-cuenta-biometrico";
import {
  MENU_CORREGIR_DATOS_CRITICOS,
  MENU_ESCRITORIO_BIOMETRICOS,
  MENU_HORARIOS,
  MENU_SECCIONES,
  MENU_MI_HORARIO,
  MENU_MARCACIONES_HOY,
  MENU_MARCACIONES_PENDIENTES,
  MENU_MARCACION_MANUAL,
  MENU_ASISTENCIA_CLASE,
  MENU_ASISTENCIA_SECCION,
  MENU_MI_ASISTENCIA,
  MENU_SESIONES_HOY,
  MENU_JUSTIFICACIONES_SESION,
  MENU_MIS_SESIONES,
  MENU_AULA_VIRTUAL,
  MENU_SOLICITUDES_CAMBIO_FECHA,
  MENU_MATERIALES_BIMESTRE,
  MENU_LIBRETAS,
  MENU_MIS_LIBRETAS,
  MENU_AUSENCIAS_DOCENTES,
  MENU_MIS_AUSENCIAS,
  MENU_CONSOLIDADOS_DOCENTES,
  MENU_MI_SEGUIMIENTO,
  MENU_INDICADORES,
  MENU_MIS_INDICADORES,
} from "../../common/constants";

const pool = new Pool({
  connectionString:
    "postgresql://postgres.pnevrdipvbewpswgxvyz:PrmYs7UfvYDsVEwV@aws-0-us-east-2.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

interface ModuloSeed {
  codigo: string;
  nombre: string;
  icono: string;
  orden: number;
}

const MODULOS_SEED: ModuloSeed[] = [
  { codigo: "seguridad", nombre: "Seguridad y Accesos", icono: "ShieldCheckIcon", orden: 1 },
  { codigo: "academico", nombre: "Estructura Académica", icono: "BookOpen01Icon", orden: 2 },
  { codigo: "matricula", nombre: "Comunidad y Matrícula", icono: "UserGroupIcon", orden: 3 },
  { codigo: "asistencia", nombre: "Asistencia Escolar", icono: "Clock01Icon", orden: 4 },
  {
    codigo: "seguimiento-docente",
    nombre: "Seguimiento y Evaluación",
    icono: "Task01Icon",
    orden: 5,
  },
  { codigo: "libretas", nombre: "Libretas y Méritos", icono: "Award01Icon", orden: 6 },
  { codigo: "aula-virtual", nombre: "Aula Virtual", icono: "ComputerIcon", orden: 7 },
  { codigo: "comunicacion", nombre: "Comunicaciones", icono: "Mail01Icon", orden: 8 },
  { codigo: "configuracion", nombre: "Configuración General", icono: "Settings01Icon", orden: 9 },
];

async function seed() {
  console.log("Iniciando seed maestro de base de datos SGA...");

  // 1. Institución
  await pool.query(`
    INSERT INTO institucion (
      nombre, codigo_modular, tipo_gestion, ugel, dre, director, direccion, distrito, provincia, departamento, correo
    ) VALUES (
      'I.E. De Mujeres Nuestra Señora del Carmen',
      '0543210',
      'publica',
      'UGEL Angaraes',
      'DRE Huancavelica',
      'Mg. Carmen Rosa Huamán',
      'Jr. Bolognesi s/n',
      'Lircay',
      'Angaraes',
      'Huancavelica',
      'admin@carmelinas.edu.pe'
    ) ON CONFLICT (fila_unica) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      correo = EXCLUDED.correo;
  `);
  console.log("✔ Institución configurada.");

  // 1.1 Turnos oficiales de marcación (RF-004)
  const TURNOS_SEED = [
    {
      aplicaA: "estudiantes",
      horaEntrada: "07:45:00",
      horaSalida: "13:15:00",
      ventanaEntradaInicio: "06:30:00",
      ventanaEntradaFin: "09:30:00",
      ventanaSalidaInicio: "12:30:00",
      ventanaSalidaFin: "15:00:00",
      toleranciaMin: 10,
      diasLaborables: "1,2,3,4,5",
    },
    {
      aplicaA: "docentes",
      horaEntrada: "07:30:00",
      horaSalida: "13:30:00",
      ventanaEntradaInicio: "06:30:00",
      ventanaEntradaFin: "09:30:00",
      ventanaSalidaInicio: "12:30:00",
      ventanaSalidaFin: "15:30:00",
      toleranciaMin: 10,
      diasLaborables: "1,2,3,4,5",
    },
    {
      aplicaA: "administrativos",
      horaEntrada: "07:30:00",
      horaSalida: "16:00:00",
      ventanaEntradaInicio: "06:30:00",
      ventanaEntradaFin: "09:30:00",
      ventanaSalidaInicio: "15:00:00",
      ventanaSalidaFin: "18:00:00",
      toleranciaMin: 10,
      diasLaborables: "1,2,3,4,5",
    },
  ];

  for (const t of TURNOS_SEED) {
    await pool.query(
      `INSERT INTO turnos (
        aplica_a, hora_entrada, hora_salida,
        ventana_entrada_inicio, ventana_entrada_fin,
        ventana_salida_inicio, ventana_salida_fin,
        tolerancia_min, dias_laborables, activo
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       ON CONFLICT (aplica_a) DO UPDATE SET
         hora_entrada = EXCLUDED.hora_entrada,
         hora_salida = EXCLUDED.hora_salida,
         ventana_entrada_inicio = EXCLUDED.ventana_entrada_inicio,
         ventana_entrada_fin = EXCLUDED.ventana_entrada_fin,
         ventana_salida_inicio = EXCLUDED.ventana_salida_inicio,
         ventana_salida_fin = EXCLUDED.ventana_salida_fin,
         tolerancia_min = EXCLUDED.tolerancia_min,
         dias_laborables = EXCLUDED.dias_laborables;`,
      [
        t.aplicaA,
        t.horaEntrada,
        t.horaSalida,
        t.ventanaEntradaInicio,
        t.ventanaEntradaFin,
        t.ventanaSalidaInicio,
        t.ventanaSalidaFin,
        t.toleranciaMin,
        t.diasLaborables,
      ],
    );
  }
  console.log("✔ Turnos iniciales configurados (Estudiantes, Docentes, Administrativos).");

  // 1.2 Equipos autorizados previstos (RF-004)
  const EQUIPOS_SEED = [
    {
      nombre: "Kiosko Estudiantes",
      ubicacion: "Puerta principal",
      tipo: "kiosko",
      proposito: "marcacion",
      usuariosPermitidos: "estudiantes",
    },
    {
      nombre: "Kiosko Personal",
      ubicacion: "Afuera de la oficina de secretaría",
      tipo: "kiosko",
      proposito: "marcacion",
      usuariosPermitidos: "docentes,administrativos",
    },
    {
      nombre: "Kiosko de Sesiones",
      ubicacion: "Subdirección",
      tipo: "kiosko",
      proposito: "sesiones",
      usuariosPermitidos: "docentes",
    },
  ];

  for (const eq of EQUIPOS_SEED) {
    await pool.query(
      `INSERT INTO equipos_autorizados (
        nombre, ubicacion, tipo, proposito, usuarios_permitidos, activo, autorizado
       )
       VALUES ($1, $2, $3, $4, $5, true, false)
       ON CONFLICT (nombre) DO UPDATE SET
         ubicacion = EXCLUDED.ubicacion,
         tipo = EXCLUDED.tipo,
         proposito = EXCLUDED.proposito,
         usuarios_permitidos = EXCLUDED.usuarios_permitidos;`,
      [eq.nombre, eq.ubicacion, eq.tipo, eq.proposito, eq.usuariosPermitidos],
    );
  }
  console.log("✔ Equipos autorizados iniciales registrados.");

  // 1.3 Variables del Sistema (RF-004 HU4)
  const VARIABLES_SEED = [
    {
      codigo: "seguridad.intentos_fallidos_bloqueo",
      descripcion: "Intentos fallidos antes de bloquear la cuenta",
      modulo: "seguridad",
      tipo: "entero",
      valor: "5",
      unidad: "intentos",
      valorMinimo: 1,
      valorMaximo: 20,
    },
    {
      codigo: "seguridad.vigencia_enlace_recuperacion_min",
      descripcion: "Vigencia del enlace de recuperación de contraseña",
      modulo: "seguridad",
      tipo: "entero",
      valor: "30",
      unidad: "minutos",
      valorMinimo: 5,
      valorMaximo: 1440,
    },
    {
      codigo: "seguridad.inactividad_sesion_min",
      descripcion: "Minutos sin actividad para cerrar la sesión",
      modulo: "seguridad",
      tipo: "entero",
      valor: "30",
      unidad: "minutos",
      valorMinimo: 5,
      valorMaximo: 480,
    },
    {
      codigo: "seguridad.longitud_minima_contrasena",
      descripcion: "Longitud mínima de la contraseña",
      modulo: "seguridad",
      tipo: "entero",
      valor: "8",
      unidad: "caracteres",
      valorMinimo: 6,
      valorMaximo: 32,
    },
    {
      codigo: "auditoria.rango_maximo_consulta_dias",
      descripcion: "Rango máximo de una consulta de la bitácora",
      modulo: "auditoria",
      tipo: "entero",
      valor: "31",
      unidad: "días",
      valorMinimo: 1,
      valorMaximo: 366,
    },
    {
      codigo: "jornada.minutos_hora_pedagogica",
      descripcion: "Duración de la hora pedagógica",
      modulo: "organizacion",
      tipo: "entero",
      valor: "45",
      unidad: "minutos",
      valorMinimo: 30,
      valorMaximo: 90,
    },
    {
      codigo: "jornada.horas_pedagogicas_dia",
      descripcion: "Horas pedagógicas por día",
      modulo: "organizacion",
      tipo: "entero",
      valor: "7",
      unidad: "horas",
      valorMinimo: 1,
      valorMaximo: 12,
    },
    {
      codigo: "jornada.recreo_despues_de_hora",
      descripcion: "Hora pedagógica después de la cual va el recreo",
      modulo: "organizacion",
      tipo: "entero",
      valor: "3",
      unidad: "horas",
      valorMinimo: 1,
      valorMaximo: 11,
    },
    {
      codigo: "jornada.minutos_recreo",
      descripcion: "Duración del recreo",
      modulo: "organizacion",
      tipo: "entero",
      valor: "15",
      unidad: "minutos",
      valorMinimo: 5,
      valorMaximo: 60,
    },
    {
      codigo: "sesion.minutos_antes_firma_ingreso",
      descripcion: "Minutos antes del inicio del bloque desde los que se puede firmar el ingreso",
      modulo: "sesiones",
      tipo: "entero",
      valor: "15",
      unidad: "minutos",
      valorMinimo: 0,
      valorMaximo: 60,
    },
    {
      codigo: "sesion.tolerancia_ingreso_min",
      descripcion: "Tolerancia al firmar el ingreso antes de contar minutos perdidos",
      modulo: "sesiones",
      tipo: "entero",
      valor: "15",
      unidad: "minutos",
      valorMinimo: 0,
      valorMaximo: 60,
    },
    {
      codigo: "sesion.tolerancia_salida_min",
      descripcion: "Tolerancia al firmar la salida antes de contar minutos perdidos",
      modulo: "sesiones",
      tipo: "entero",
      valor: "15",
      unidad: "minutos",
      valorMinimo: 0,
      valorMaximo: 60,
    },
    {
      codigo: "sesion.salida_automatica_sin_firma",
      descripcion:
        "Al cierre del día, poner hora de salida automática a sesiones sin firma de salida",
      modulo: "sesiones",
      tipo: "booleano",
      valor: "true",
      unidad: null,
      valorMinimo: null,
      valorMaximo: null,
    },
    {
      codigo: "biometrico.minutos_antirrebote",
      descripcion:
        "Minutos tras una marcación del reloj biométrico en los que otra del mismo docente se ignora (rebote del dedo)",
      modulo: "asistencia",
      tipo: "entero",
      valor: "5",
      unidad: "minutos",
      valorMinimo: 0,
      valorMaximo: 60,
    },
    {
      codigo: "marcacion.minutos_duplicado_entre_vias",
      descripcion:
        "Minutos en los que una marcación de otra vía (kiosko, manual o reloj biométrico) se toma como la misma asistencia ya registrada y no se guarda de nuevo. 0 lo desactiva",
      modulo: "asistencia",
      tipo: "entero",
      valor: "30",
      unidad: "minutos",
      valorMinimo: 0,
      valorMaximo: 120,
    },
    {
      codigo: "biometrico.desfase_maximo_min",
      descripcion:
        "Diferencia máxima entre la hora del reloj biométrico y la del servidor antes de ponerlo en hora y avisar",
      modulo: "asistencia",
      tipo: "entero",
      valor: "2",
      unidad: "minutos",
      valorMinimo: 0,
      valorMaximo: 60,
    },
    {
      codigo: "biometrico.minutos_sin_comunicacion",
      descripcion:
        "Minutos sin avisos de la app puente (o sin respuesta del reloj) en horario de marcación antes de alertar",
      modulo: "asistencia",
      tipo: "entero",
      valor: "10",
      unidad: "minutos",
      valorMinimo: 1,
      valorMaximo: 120,
    },
    {
      codigo: "ausencia.plazo_descargo_dias",
      descripcion: "Días calendario para presentar el descargo",
      modulo: "supervision",
      tipo: "entero",
      valor: "7",
      unidad: "días",
      valorMinimo: 1,
      valorMaximo: 30,
    },
    {
      codigo: "ausencia.plazo_correccion_horas",
      descripcion: "Horas para corregir una ausencia registrada",
      modulo: "supervision",
      tipo: "entero",
      valor: "24",
      unidad: "horas",
      valorMinimo: 1,
      valorMaximo: 168,
    },
    {
      codigo: "libreta.max_archivos_por_carga",
      descripcion: "Archivos por carga en bloque",
      modulo: "libretas",
      tipo: "entero",
      valor: "50",
      unidad: "archivos",
      valorMinimo: 1,
      valorMaximo: 200,
    },
    {
      codigo: "libreta.tamano_maximo_mb",
      descripcion: "Tamaño máximo de cada PDF de libreta",
      modulo: "libretas",
      tipo: "entero",
      valor: "5",
      unidad: "MB",
      valorMinimo: 1,
      valorMaximo: 50,
    },
    {
      codigo: "material.dias_planificacion",
      descripcion: "Días desde el inicio del bimestre para planificar materiales",
      modulo: "aula_virtual",
      tipo: "entero",
      valor: "7",
      unidad: "días",
      valorMinimo: 1,
      valorMaximo: 30,
    },
    {
      codigo: "material.tamano_maximo_mb",
      descripcion: "Tamaño máximo de un material",
      modulo: "aula_virtual",
      tipo: "entero",
      valor: "50",
      unidad: "MB",
      valorMinimo: 1,
      valorMaximo: 500,
    },
    {
      codigo: "nota.peso_examen",
      descripcion: "Peso del tipo examen en la nota final del aula virtual",
      modulo: "aula_virtual",
      tipo: "decimal",
      valor: "25",
      unidad: "%",
      valorMinimo: 0,
      valorMaximo: 100,
    },
    {
      codigo: "nota.peso_cuestionario",
      descripcion: "Peso del tipo cuestionario en la nota final",
      modulo: "aula_virtual",
      tipo: "decimal",
      valor: "25",
      unidad: "%",
      valorMinimo: 0,
      valorMaximo: 100,
    },
    {
      codigo: "nota.peso_trabajo",
      descripcion: "Peso del tipo trabajo en la nota final",
      modulo: "aula_virtual",
      tipo: "decimal",
      valor: "25",
      unidad: "%",
      valorMinimo: 0,
      valorMaximo: 100,
    },
    {
      codigo: "nota.peso_proyecto",
      descripcion: "Peso del tipo proyecto en la nota final",
      modulo: "aula_virtual",
      tipo: "decimal",
      valor: "25",
      unidad: "%",
      valorMinimo: 0,
      valorMaximo: 100,
    },
    {
      codigo: "aula.minutos_edicion_publicacion",
      descripcion: "Minutos para editar una publicación o comentario",
      modulo: "aula_virtual",
      tipo: "entero",
      valor: "15",
      unidad: "minutos",
      valorMinimo: 0,
      valorMaximo: 1440,
    },
    {
      codigo: "conducta.plazo_correccion_horas",
      descripcion: "Horas para corregir una incidencia u observación",
      modulo: "convivencia",
      tipo: "entero",
      valor: "24",
      unidad: "horas",
      valorMinimo: 1,
      valorMaximo: 168,
    },
    {
      codigo: "notificacion.aviso_inasistencia_apoderado",
      descripcion: "Aviso instantáneo de inasistencia a apoderados",
      modulo: "notificaciones",
      tipo: "booleano",
      valor: "true",
      unidad: null,
      valorMinimo: null,
      valorMaximo: null,
    },
    {
      codigo: "notificacion.recordatorio_sesiones_docente",
      descripcion: "Recordatorio de cierre de sesión de clase",
      modulo: "notificaciones",
      tipo: "booleano",
      valor: "true",
      unidad: null,
      valorMinimo: null,
      valorMaximo: null,
    },
    {
      codigo: "notificacion.alerta_nuevo_dispositivo",
      descripcion: "Alerta de inicio de sesión en nuevo dispositivo",
      modulo: "notificaciones",
      tipo: "booleano",
      valor: "true",
      unidad: null,
      valorMinimo: null,
      valorMaximo: null,
    },
    {
      codigo: "seguridad.bloqueo_intentos_habilitado",
      descripcion: "Bloqueo automático por intentos fallidos",
      modulo: "seguridad",
      tipo: "booleano",
      valor: "true",
      unidad: null,
      valorMinimo: null,
      valorMaximo: null,
    },
    {
      codigo: "seguridad.caducidad_inactividad_habilitado",
      descripcion: "Caducidad de sesión por inactividad",
      modulo: "seguridad",
      tipo: "booleano",
      valor: "true",
      unidad: null,
      valorMinimo: null,
      valorMaximo: null,
    },
    {
      codigo: "seguridad.requerir_pin_kiosko",
      descripcion: "Requerir PIN para marcación en Kiosko",
      modulo: "seguridad",
      tipo: "booleano",
      valor: "true",
      unidad: null,
      valorMinimo: null,
      valorMaximo: null,
    },
    {
      codigo: "seguridad.registro_ip_equipos",
      descripcion: "Registro obligatorio de IP en auditoría",
      modulo: "seguridad",
      tipo: "booleano",
      valor: "true",
      unidad: null,
      valorMinimo: null,
      valorMaximo: null,
    },
  ];

  for (const v of VARIABLES_SEED) {
    const existing = await pool.query(
      `SELECT id FROM variables_sistema WHERE codigo = $1 AND vigente = true`,
      [v.codigo],
    );
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO variables_sistema (
          codigo, descripcion, modulo, tipo, valor, unidad, valor_minimo, valor_maximo, editable, carga_en_aplicacion, vigente
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true, true)`,
        [
          v.codigo,
          v.descripcion,
          v.modulo,
          v.tipo,
          v.valor,
          v.unidad,
          v.valorMinimo,
          v.valorMaximo,
        ],
      );
    }
  }
  console.log("✔ Variables oficiales del sistema configuradas.");

  // 2. Módulos del Sistema
  for (const mod of MODULOS_SEED) {
    await pool.query(
      `INSERT INTO modulos (codigo, nombre, icono, orden, vigente)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (codigo) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         icono = EXCLUDED.icono,
         orden = EXCLUDED.orden,
         vigente = true;`,
      [mod.codigo, mod.nombre, mod.icono, mod.orden],
    );
  }
  console.log(`✔ ${MODULOS_SEED.length} Módulos del sistema verificados y actualizados.`);

  // RF-002 V2: ya no hay catálogo de permisos; el acceso se da por menús del rol
  // (rol_menus), que el Administrador asigna en Roles-Menú.

  // 5. Roles del Sistema
  const ROLES_SEED = [
    {
      nombre: "Administrador",
      descripcion: "Acceso total a todos los módulos y configuración del sistema",
      esSistema: true,
    },
    {
      nombre: "Director",
      descripcion: "Gestión institucional, directiva, reportes y supervisión pedagógica",
      esSistema: true,
    },
    {
      nombre: "Subdirector",
      descripcion:
        "Organización académica, seguimiento de sesiones de clase y marcación de asistencia (P-23)",
      esSistema: true,
    },
    {
      nombre: "Secretaria",
      descripcion: "Gestión administrativa, matrícula de alumnos y emisión de constancias",
      esSistema: true,
    },
    {
      nombre: "Docente",
      descripcion: "Gestión de asistencias, sesiones de clase, tareas y calificaciones",
      esSistema: true,
    },
    {
      nombre: "Estudiante",
      descripcion: "Acceso al aula virtual, consulta de tareas y libretas de notas",
      esSistema: true,
    },
    {
      nombre: "Apoderado",
      descripcion: "Seguimiento de asistencia, rendimiento académico y comunicados",
      esSistema: true,
    },
    {
      nombre: "Soporte TI",
      descripcion: "Gestión de infraestructura técnica, equipos autorizados y soporte del sistema",
      esSistema: true,
    },
  ];

  for (const rol of ROLES_SEED) {
    await pool.query(
      `INSERT INTO roles (nombre, descripcion, es_sistema, activo)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (nombre) DO UPDATE SET
         descripcion = EXCLUDED.descripcion,
         es_sistema = EXCLUDED.es_sistema,
         activo = true;`,
      [rol.nombre, rol.descripcion, rol.esSistema],
    );
  }
  console.log("✔ Roles oficiales del sistema configurados.");

  const adminRolRes = await pool.query<{ id: string }>(
    `SELECT id FROM roles WHERE nombre = 'Administrador' LIMIT 1`,
  );
  const adminRolId = adminRolRes.rows[0].id;

  // 7. Persona Administrador
  const personaRes = await pool.query<{ id: string }>(`
    SELECT id FROM personas WHERE numero_documento = '70123456'
  `);
  let personaId: string;
  if (personaRes.rows.length === 0) {
    const newPersona = await pool.query<{ id: string }>(`
      INSERT INTO personas (
        tipo_documento, numero_documento, nombres, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, direccion, distrito, correo
      ) VALUES (
        'dni', '70123456', 'Roberto Carlos', 'Alarcón', 'Mendoza', '1988-05-15', 'M', 'Jr. Bolognesi 123', 'Lircay', 'admin@carmelinas.edu.pe'
      ) RETURNING id;
    `);
    personaId = newPersona.rows[0].id;
  } else {
    personaId = personaRes.rows[0].id;
  }
  console.log("✔ Persona Administrador configurada (ID):", personaId);

  // 8. Usuario Administrador (admin / Admin123*)
  const hash = await bcrypt.hash("Admin123*", 10);
  const existingUser = await pool.query<{ id: string }>(
    `SELECT id FROM usuarios WHERE nombre_usuario = 'admin'`,
  );

  if (existingUser.rows.length > 0) {
    await pool.query(
      `UPDATE usuarios 
       SET contrasena_hash = $1, estado = 'activo', debe_cambiar_contrasena = false, intentos_fallidos = 0, rol_id = $2
       WHERE id = $3`,
      [hash, adminRolId, existingUser.rows[0].id],
    );
    console.log("✔ Usuario 'admin' actualizado con rol Administrador y credencial activa.");
  } else {
    await pool.query(
      `INSERT INTO usuarios (persona_id, rol_id, nombre_usuario, contrasena_hash, debe_cambiar_contrasena, estado, intentos_fallidos)
       VALUES ($1, $2, 'admin', $3, false, 'activo', 0)`,
      [personaId, adminRolId, hash],
    );
    console.log("✔ Usuario 'admin' creado exitosamente con credencial Admin123*.");
  }

  // 9. Cursos precargados del Currículo Nacional y Taller (RF-006)
  const CURSOS_BASE_SEED = [
    {
      codigo: "MAT",
      nombre: "Matemática",
      areaCurricular: "matematica",
      colorHex: "#2563EB",
      descripcion: "Área de Matemática según el CNEB",
    },
    {
      codigo: "COM",
      nombre: "Comunicación",
      areaCurricular: "comunicacion",
      colorHex: "#DC2626",
      descripcion: "Área de Comunicación según el CNEB",
    },
    {
      codigo: "ING",
      nombre: "Inglés",
      areaCurricular: "ingles",
      colorHex: "#7C3AED",
      descripcion: "Idioma Extranjero Inglés",
    },
    {
      codigo: "ART",
      nombre: "Arte y Cultura",
      areaCurricular: "arte_cultura",
      colorHex: "#DB2777",
      descripcion: "Expresión y apreciación artística",
    },
    {
      codigo: "CCSS",
      nombre: "Ciencias Sociales",
      areaCurricular: "ciencias_sociales",
      colorHex: "#D97706",
      descripcion: "Historia, Geografía y Economía",
    },
    {
      codigo: "DPCC",
      nombre: "Desarrollo Personal, Ciudadanía y Cívica",
      areaCurricular: "dpcc",
      colorHex: "#059669",
      descripcion: "Formación ciudadana y cívica",
    },
    {
      codigo: "EDFIS",
      nombre: "Educación Física",
      areaCurricular: "educacion_fisica",
      colorHex: "#EA580C",
      descripcion: "Desarrollo corporal y salud",
    },
    {
      codigo: "REL",
      nombre: "Educación Religiosa",
      areaCurricular: "educacion_religiosa",
      colorHex: "#4F46E5",
      descripcion: "Formación en valores y religión",
    },
    {
      codigo: "CYT",
      nombre: "Ciencia y Tecnología",
      areaCurricular: "ciencia_tecnologia",
      colorHex: "#0D9488",
      descripcion: "Indagación científica y tecnología",
    },
    {
      codigo: "EPT",
      nombre: "Educación para el Trabajo",
      areaCurricular: "ept",
      colorHex: "#CA8A04",
      descripcion: "Gestión de proyectos de emprendimiento",
    },
    {
      codigo: "TUT",
      nombre: "Tutoría",
      areaCurricular: "tutoria",
      colorHex: "#64748B",
      descripcion: "Tutoría y orientación educativa",
    },
    {
      codigo: "TCOMP",
      nombre: "Taller de Computación",
      areaCurricular: "taller",
      colorHex: "#0284C7",
      descripcion: "Taller extracurricular de computación y ofimática",
    },
  ];

  for (const c of CURSOS_BASE_SEED) {
    const existing = await pool.query(
      `SELECT id FROM cursos WHERE UPPER(codigo) = UPPER($1) AND eliminado_en IS NULL`,
      [c.codigo],
    );
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO cursos (codigo, nombre, area_curricular, color_hex, descripcion)
         VALUES ($1, $2, $3, $4, $5)`,
        [c.codigo, c.nombre, c.areaCurricular, c.colorHex, c.descripcion],
      );
    }
  }
  console.log("✔ Cursos base del Currículo Nacional y Taller verificados y configurados.");

  // RF-001 V2: el rol del admin también queda como principal en usuario_roles
  await pool.query(
    `INSERT INTO usuario_roles (usuario_id, rol_id, es_principal)
     SELECT u.id, u.rol_id, true FROM usuarios u
     WHERE u.nombre_usuario = 'admin'
       AND NOT EXISTS (
         SELECT 1 FROM usuario_roles ur
         WHERE ur.usuario_id = u.id AND ur.rol_id = u.rol_id AND ur.vigente
       );`,
  );

  // RF-002 V2 (HU4): catálogo de cargos y roles sugeridos (solo sugerencia)
  const CARGOS_SEED: { nombre: string; descripcion: string; roles: string[] }[] = [
    { nombre: "Director(a)", descripcion: "Dirección del colegio", roles: ["Director"] },
    {
      nombre: "Subdirector(a)",
      descripcion: "Subdirección y seguimiento de sesiones",
      roles: ["Subdirector"],
    },
    {
      nombre: "Coordinador(a) académico",
      descripcion: "Coordinación pedagógica",
      roles: ["Subdirector"],
    },
    { nombre: "Docente de aula", descripcion: "Docente que dicta cursos", roles: ["Docente"] },
    {
      nombre: "Auxiliar de educación",
      descripcion: "Apoyo en disciplina y asistencia",
      roles: [],
    },
    { nombre: "Psicólogo(a)", descripcion: "Seguimiento socioemocional", roles: [] },
    { nombre: "Secretario(a)", descripcion: "Matrícula y trámites", roles: ["Secretaria"] },
    {
      nombre: "Personal de TI",
      descripcion: "Soporte técnico y equipos",
      roles: ["Soporte TI", "Administrador"],
    },
    { nombre: "Estudiante", descripcion: "Estudiante matriculado", roles: ["Estudiante"] },
    { nombre: "Apoderado(a)", descripcion: "Padre, madre o tutor legal", roles: ["Apoderado"] },
  ];

  for (const cargo of CARGOS_SEED) {
    await pool.query(
      `INSERT INTO cargos (nombre, descripcion)
       VALUES ($1, $2)
       ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;`,
      [cargo.nombre, cargo.descripcion],
    );
    for (const rol of cargo.roles) {
      await pool.query(
        `INSERT INTO cargo_roles_sugeridos (cargo_id, rol_id)
         SELECT c.id, r.id FROM cargos c, roles r
         WHERE c.nombre = $1 AND r.nombre = $2
         ON CONFLICT DO NOTHING;`,
        [cargo.nombre, rol],
      );
    }
  }
  console.log(`✔ ${CARGOS_SEED.length} Cargos iniciales con sus roles sugeridos.`);

  // RF-002 V2: toda cuenta tiene una persona con cargo; el admin inicial es personal de TI
  await pool.query(
    `INSERT INTO persona_cargos (persona_id, cargo_id, fecha_inicio, es_principal)
     SELECT $1, c.id, CURRENT_DATE, true FROM cargos c
     WHERE c.nombre = 'Personal de TI'
       AND NOT EXISTS (SELECT 1 FROM persona_cargos pc WHERE pc.persona_id = $1 AND pc.vigente);`,
    [personaId],
  );
  console.log("✔ Cargo del administrador inicial registrado.");

  // RF-002 V3: opción "Corregir datos críticos" (RF-007). Solo la ven los roles a los
  // que se asigne en Roles-Menú; el Administrador la ve siempre.
  await pool.query(
    `INSERT INTO menus (modulo_id, nombre, orden, es_contenedor)
     SELECT m.id, 'Personas', 1, true FROM modulos m
     WHERE m.codigo = 'matricula'
       AND NOT EXISTS (
         SELECT 1 FROM menus x
         WHERE x.modulo_id = m.id AND x.es_contenedor AND x.nombre = 'Personas'
       );`,
  );
  await pool.query(
    `INSERT INTO menus (modulo_id, menu_padre_id, nombre, ruta, icono, orden, es_contenedor)
     SELECT c.modulo_id, c.id, 'Corregir datos críticos', $1::varchar, 'UserEdit01Icon', 9, false
     FROM menus c JOIN modulos m ON m.id = c.modulo_id
     WHERE m.codigo = 'matricula' AND c.es_contenedor AND c.nombre = 'Personas'
       AND NOT EXISTS (SELECT 1 FROM menus x WHERE x.ruta = $1::varchar);`,
    [MENU_CORREGIR_DATOS_CRITICOS],
  );
  await pool.query(
    `INSERT INTO rol_menus (rol_id, menu_id)
     SELECT r.id, m.id FROM roles r, menus m
     WHERE r.nombre = 'Administrador' AND m.ruta = $1
     ON CONFLICT DO NOTHING;`,
    [MENU_CORREGIR_DATOS_CRITICOS],
  );
  console.log("✔ Opción 'Corregir datos críticos' registrada (solo Administrador).");

  // RF-008: Menús "Secciones" y "Horarios" bajo el contenedor "Organización escolar"
  await pool.query(
    `INSERT INTO menus (modulo_id, nombre, orden, es_contenedor)
     SELECT m.id, 'Organización escolar', 1, true FROM modulos m
     WHERE m.codigo = 'academico'
       AND NOT EXISTS (
         SELECT 1 FROM menus x
         WHERE x.modulo_id = m.id AND x.es_contenedor AND x.nombre = 'Organización escolar'
       );`,
  );
  await pool.query(
    `INSERT INTO menus (modulo_id, menu_padre_id, nombre, ruta, icono, orden, es_contenedor)
     SELECT c.modulo_id, c.id, 'Secciones', $1::varchar, 'UserGroupIcon', 1, false
     FROM menus c JOIN modulos m ON m.id = c.modulo_id
     WHERE m.codigo = 'academico' AND c.es_contenedor AND c.nombre = 'Organización escolar'
       AND NOT EXISTS (SELECT 1 FROM menus x WHERE x.ruta = $1::varchar);`,
    [MENU_SECCIONES],
  );
  await pool.query(
    `INSERT INTO menus (modulo_id, menu_padre_id, nombre, ruta, icono, orden, es_contenedor)
     SELECT c.modulo_id, c.id, 'Horarios', $1::varchar, 'Clock01Icon', 2, false
     FROM menus c JOIN modulos m ON m.id = c.modulo_id
     WHERE m.codigo = 'academico' AND c.es_contenedor AND c.nombre = 'Organización escolar'
       AND NOT EXISTS (SELECT 1 FROM menus x WHERE x.ruta = $1::varchar);`,
    [MENU_HORARIOS],
  );
  await pool.query(
    `INSERT INTO rol_menus (rol_id, menu_id)
     SELECT r.id, m.id FROM roles r, menus m
     WHERE r.nombre IN ('Administrador', 'Subdirector')
       AND m.ruta IN ($1, $2)
     ON CONFLICT DO NOTHING;`,
    [MENU_SECCIONES, MENU_HORARIOS],
  );
  await pool.query(
    `INSERT INTO menus (modulo_id, menu_padre_id, nombre, ruta, icono, orden, es_contenedor)
     SELECT c.modulo_id, c.id, 'Mi horario', $1::varchar, 'Clock01Icon', 3, false
     FROM menus c JOIN modulos m ON m.id = c.modulo_id
     WHERE m.codigo = 'academico' AND c.es_contenedor AND c.nombre = 'Organización escolar'
       AND NOT EXISTS (SELECT 1 FROM menus x WHERE x.ruta = $1::varchar);`,
    [MENU_MI_HORARIO],
  );
  await pool.query(
    `INSERT INTO rol_menus (rol_id, menu_id)
     SELECT r.id, m.id FROM roles r, menus m
     WHERE r.nombre IN ('Docente', 'Estudiante', 'Apoderado')
       AND m.ruta = $1
     ON CONFLICT DO NOTHING;`,
    [MENU_MI_HORARIO],
  );
  console.log("✔ Opción 'Mi horario' registrada (Docente, Estudiante y Apoderado).");

  // RF-010: menús de Asistencia bajo el contenedor "Asistencia"
  await pool.query(
    `INSERT INTO menus (modulo_id, nombre, orden, es_contenedor)
     SELECT m.id, 'Asistencia', 1, true FROM modulos m
     WHERE m.codigo = 'asistencia'
       AND NOT EXISTS (
         SELECT 1 FROM menus x
         WHERE x.modulo_id = m.id AND x.es_contenedor AND x.nombre = 'Asistencia'
       );`,
  );
  const MENUS_ASISTENCIA: {
    nombre: string;
    ruta: string;
    icono: string;
    orden: number;
    roles: string[];
  }[] = [
    {
      nombre: "Marcaciones de hoy",
      ruta: MENU_MARCACIONES_HOY,
      icono: "Clock01Icon",
      orden: 1,
      roles: ["Director", "Subdirector", "Secretaria"],
    },
    {
      nombre: "Marcación manual",
      ruta: MENU_MARCACION_MANUAL,
      icono: "Clock01Icon",
      orden: 2,
      roles: ["Secretaria"],
    },
    {
      nombre: "Asistencia",
      ruta: MENU_ASISTENCIA_CLASE,
      icono: "UserGroupIcon",
      orden: 3,
      roles: ["Docente"],
    },
    {
      nombre: "Asistencia de mi sección",
      ruta: MENU_ASISTENCIA_SECCION,
      icono: "UserGroupIcon",
      orden: 4,
      roles: ["Docente", "Director", "Subdirector", "Secretaria"],
    },
    {
      nombre: "Mi asistencia",
      ruta: MENU_MI_ASISTENCIA,
      icono: "UserGroupIcon",
      orden: 5,
      roles: ["Estudiante", "Apoderado"],
    },
    {
      nombre: "Marcaciones pendientes",
      ruta: MENU_MARCACIONES_PENDIENTES,
      icono: "FingerPrintIcon",
      orden: 6,
      roles: ["Soporte TI", "Secretaria"],
    },
  ];
  for (const menu of MENUS_ASISTENCIA) {
    await pool.query(
      `INSERT INTO menus (modulo_id, menu_padre_id, nombre, ruta, icono, orden, es_contenedor)
       SELECT c.modulo_id, c.id, $2::varchar, $1::varchar, $3::varchar, $4::int, false
       FROM menus c JOIN modulos m ON m.id = c.modulo_id
       WHERE m.codigo = 'asistencia' AND c.es_contenedor AND c.nombre = 'Asistencia'
         AND NOT EXISTS (SELECT 1 FROM menus x WHERE x.ruta = $1::varchar);`,
      [menu.ruta, menu.nombre, menu.icono, menu.orden],
    );
    await pool.query(
      `INSERT INTO rol_menus (rol_id, menu_id)
       SELECT r.id, m.id FROM roles r, menus m
       WHERE r.nombre = ANY($2::varchar[]) AND m.ruta = $1
       ON CONFLICT DO NOTHING;`,
      [menu.ruta, menu.roles],
    );
  }
  console.log("✔ Opciones de Asistencia registradas.");

  // RF-011: menús de Seguimiento docente
  await pool.query(
    `INSERT INTO menus (modulo_id, nombre, orden, es_contenedor)
     SELECT m.id, 'Seguimiento docente', 3, true FROM modulos m
     WHERE m.codigo = 'academico'
       AND NOT EXISTS (
         SELECT 1 FROM menus x
         WHERE x.modulo_id = m.id AND x.es_contenedor AND x.nombre = 'Seguimiento docente'
       );`,
  );
  const MENUS_SESIONES = [
    {
      nombre: "Sesiones de hoy",
      ruta: MENU_SESIONES_HOY,
      icono: "Clock01Icon",
      orden: 1,
      roles: ["Director", "Subdirector"],
    },
    {
      nombre: "Justificaciones de sesiones",
      ruta: MENU_JUSTIFICACIONES_SESION,
      icono: "CheckmarkCircle02Icon",
      orden: 2,
      roles: ["Subdirector"],
    },
    {
      nombre: "Mis sesiones",
      ruta: MENU_MIS_SESIONES,
      icono: "BookOpen01Icon",
      orden: 3,
      roles: ["Docente"],
    },
  ];
  for (const menu of MENUS_SESIONES) {
    await pool.query(
      `INSERT INTO menus (modulo_id, menu_padre_id, nombre, ruta, icono, orden, es_contenedor)
       SELECT c.modulo_id, c.id, $2::varchar, $1::varchar, $3::varchar, $4::int, false
       FROM menus c JOIN modulos m ON m.id = c.modulo_id
       WHERE m.codigo = 'academico' AND c.es_contenedor AND c.nombre = 'Seguimiento docente'
         AND NOT EXISTS (SELECT 1 FROM menus x WHERE x.ruta = $1::varchar);`,
      [menu.ruta, menu.nombre, menu.icono, menu.orden],
    );
    await pool.query(
      `INSERT INTO rol_menus (rol_id, menu_id)
       SELECT r.id, m.id FROM roles r, menus m
       WHERE r.nombre = ANY($2::varchar[]) AND m.ruta = $1
       ON CONFLICT DO NOTHING;`,
      [menu.ruta, menu.roles],
    );
  }
  console.log("✔ Opciones de Seguimiento docente registradas.");

  // RF-012: menús de Ausencias docentes bajo el contenedor "Seguimiento docente"
  const MENUS_AUSENCIAS = [
    {
      nombre: "Ausencias docentes",
      ruta: MENU_AUSENCIAS_DOCENTES,
      icono: "UserGroupIcon",
      orden: 4,
      roles: ["Director", "Subdirector", "Administrador"],
    },
    {
      nombre: "Mis ausencias",
      ruta: MENU_MIS_AUSENCIAS,
      icono: "Task01Icon",
      orden: 5,
      roles: ["Docente"],
    },
  ];
  for (const menu of MENUS_AUSENCIAS) {
    await pool.query(
      `INSERT INTO menus (modulo_id, menu_padre_id, nombre, ruta, icono, orden, es_contenedor)
       SELECT c.modulo_id, c.id, $2::varchar, $1::varchar, $3::varchar, $4::int, false
       FROM menus c JOIN modulos m ON m.id = c.modulo_id
       WHERE m.codigo = 'academico' AND c.es_contenedor AND c.nombre = 'Seguimiento docente'
         AND NOT EXISTS (SELECT 1 FROM menus x WHERE x.ruta = $1::varchar);`,
      [menu.ruta, menu.nombre, menu.icono, menu.orden],
    );
    await pool.query(
      `INSERT INTO rol_menus (rol_id, menu_id)
       SELECT r.id, m.id FROM roles r, menus m
       WHERE r.nombre = ANY($2::varchar[]) AND m.ruta = $1
       ON CONFLICT DO NOTHING;`,
      [menu.ruta, menu.roles],
    );
  }

  // RF-013: menús de Consolidado y seguimiento docente bajo el contenedor "Seguimiento docente"
  const MENUS_CONSOLIDADOS = [
    {
      nombre: "Consolidados docentes",
      ruta: MENU_CONSOLIDADOS_DOCENTES,
      icono: "ChartBarLineIcon",
      orden: 6,
      roles: ["Director", "Subdirector", "Administrador"],
    },
    {
      nombre: "Mi seguimiento",
      ruta: MENU_MI_SEGUIMIENTO,
      icono: "File02Icon",
      orden: 7,
      roles: ["Docente"],
    },
  ];
  for (const menu of MENUS_CONSOLIDADOS) {
    await pool.query(
      `INSERT INTO menus (modulo_id, menu_padre_id, nombre, ruta, icono, orden, es_contenedor)
       SELECT c.modulo_id, c.id, $2::varchar, $1::varchar, $3::varchar, $4::int, false
       FROM menus c JOIN modulos m ON m.id = c.modulo_id
       WHERE m.codigo = 'academico' AND c.es_contenedor AND c.nombre = 'Seguimiento docente'
         AND NOT EXISTS (SELECT 1 FROM menus x WHERE x.ruta = $1::varchar);`,
      [menu.ruta, menu.nombre, menu.icono, menu.orden],
    );
    await pool.query(
      `INSERT INTO rol_menus (rol_id, menu_id)
       SELECT r.id, m.id FROM roles r, menus m
       WHERE r.nombre = ANY($2::varchar[]) AND m.ruta = $1
       ON CONFLICT DO NOTHING;`,
      [menu.ruta, menu.roles],
    );
  }

  // RF-020: menús de Indicadores de la tesis bajo el contenedor "Seguimiento docente"
  const MENUS_INDICADORES_SEED = [
    {
      nombre: "Indicadores",
      ruta: MENU_INDICADORES,
      icono: "ChartBarLineIcon",
      orden: 8,
      roles: ["Director", "Subdirector", "Administrador"],
    },
    {
      nombre: "Mis indicadores",
      ruta: MENU_MIS_INDICADORES,
      icono: "File02Icon",
      orden: 9,
      roles: ["Docente"],
    },
  ];
  for (const menu of MENUS_INDICADORES_SEED) {
    await pool.query(
      `INSERT INTO menus (modulo_id, menu_padre_id, nombre, ruta, icono, orden, es_contenedor)
       SELECT c.modulo_id, c.id, $2::varchar, $1::varchar, $3::varchar, $4::int, false
       FROM menus c JOIN modulos m ON m.id = c.modulo_id
       WHERE m.codigo = 'academico' AND c.es_contenedor AND c.nombre = 'Seguimiento docente'
         AND NOT EXISTS (SELECT 1 FROM menus x WHERE x.ruta = $1::varchar);`,
      [menu.ruta, menu.nombre, menu.icono, menu.orden],
    );
    await pool.query(
      `INSERT INTO rol_menus (rol_id, menu_id)
       SELECT r.id, m.id FROM roles r, menus m
       WHERE r.nombre = ANY($2::varchar[]) AND m.ruta = $1
       ON CONFLICT DO NOTHING;`,
      [menu.ruta, menu.roles],
    );
  }
  console.log("✔ Opciones de Indicadores de la tesis registradas (RF-020).");

  // RF-015: menús del Aula virtual bajo el contenedor "Aula virtual"
  await pool.query(
    `INSERT INTO menus (modulo_id, nombre, orden, es_contenedor)
     SELECT m.id, 'Aula virtual', 1, true FROM modulos m
     WHERE m.codigo = 'aula-virtual'
       AND NOT EXISTS (
         SELECT 1 FROM menus x
         WHERE x.modulo_id = m.id AND x.es_contenedor AND x.nombre = 'Aula virtual'
       );`,
  );
  const MENUS_AULA_VIRTUAL: {
    nombre: string;
    ruta: string;
    icono: string;
    orden: number;
    roles: string[];
  }[] = [
    {
      nombre: "Mis aulas virtuales",
      ruta: MENU_AULA_VIRTUAL,
      icono: "BookOpen01Icon",
      orden: 1,
      roles: ["Director", "Subdirector", "Docente", "Estudiante", "Apoderado"],
    },
    {
      nombre: "Materiales del bimestre",
      ruta: MENU_MATERIALES_BIMESTRE,
      icono: "ChartBarLineIcon",
      orden: 2,
      roles: ["Director", "Subdirector"],
    },
    {
      nombre: "Solicitudes de cambio de fecha",
      ruta: MENU_SOLICITUDES_CAMBIO_FECHA,
      icono: "Calendar03Icon",
      orden: 3,
      roles: ["Docente", "Subdirector"],
    },
  ];
  for (const menu of MENUS_AULA_VIRTUAL) {
    await pool.query(
      `INSERT INTO menus (modulo_id, menu_padre_id, nombre, ruta, icono, orden, es_contenedor)
       SELECT c.modulo_id, c.id, $2::varchar, $1::varchar, $3::varchar, $4::int, false
       FROM menus c JOIN modulos m ON m.id = c.modulo_id
       WHERE m.codigo = 'aula-virtual' AND c.es_contenedor AND c.nombre = 'Aula virtual'
         AND NOT EXISTS (SELECT 1 FROM menus x WHERE x.ruta = $1::varchar);`,
      [menu.ruta, menu.nombre, menu.icono, menu.orden],
    );
    await pool.query(
      `INSERT INTO rol_menus (rol_id, menu_id)
       SELECT r.id, m.id FROM roles r, menus m
       WHERE r.nombre = ANY($2::varchar[]) AND m.ruta = $1
       ON CONFLICT DO NOTHING;`,
      [menu.ruta, menu.roles],
    );
  }
  console.log("✔ Opciones del Aula virtual registradas.");

  await pool.query(
    `INSERT INTO menus (modulo_id, nombre, orden, es_contenedor)
     SELECT m.id, 'Libretas', 1, true FROM modulos m
     WHERE m.codigo = 'libretas'
       AND NOT EXISTS (
         SELECT 1 FROM menus x
         WHERE x.modulo_id = m.id AND x.es_contenedor AND x.nombre = 'Libretas'
       );`,
  );
  const MENUS_LIBRETAS_SEED = [
    {
      nombre: "Libretas",
      ruta: MENU_LIBRETAS,
      icono: "Notebook01Icon",
      orden: 1,
      roles: ["Administrador", "Director", "Subdirector", "Secretaria", "Docente"],
    },
    {
      nombre: "Mis libretas",
      ruta: MENU_MIS_LIBRETAS,
      icono: "Notebook01Icon",
      orden: 2,
      roles: ["Estudiante", "Apoderado"],
    },
  ];
  for (const menu of MENUS_LIBRETAS_SEED) {
    await pool.query(
      `INSERT INTO menus (modulo_id, menu_padre_id, nombre, ruta, icono, orden, es_contenedor)
       SELECT c.modulo_id, c.id, $2::varchar, $1::varchar, $3::varchar, $4::int, false
       FROM menus c JOIN modulos m ON m.id = c.modulo_id
       WHERE m.codigo = 'libretas' AND c.es_contenedor AND c.nombre = 'Libretas'
         AND NOT EXISTS (SELECT 1 FROM menus x WHERE x.ruta = $1::varchar);`,
      [menu.ruta, menu.nombre, menu.icono, menu.orden],
    );
    await pool.query(
      `INSERT INTO rol_menus (rol_id, menu_id)
       SELECT r.id, m.id FROM roles r, menus m
       WHERE r.nombre = ANY($2::varchar[]) AND m.ruta = $1
       ON CONFLICT DO NOTHING;`,
      [menu.ruta, menu.roles],
    );
  }
  console.log("✔ Opciones de Libretas registradas.");

  // Aplicación de escritorio: configuración del reloj biométrico (solo escritorio; el portal web no la muestra)
  await pool.query(
    `INSERT INTO menus (modulo_id, nombre, orden, es_contenedor)
     SELECT m.id, 'Dispositivos', 90, true FROM modulos m
     WHERE m.codigo = 'seguridad'
       AND NOT EXISTS (
         SELECT 1 FROM menus x
         WHERE x.modulo_id = m.id AND x.es_contenedor AND x.nombre = 'Dispositivos'
       );`,
  );
  await pool.query(
    `INSERT INTO menus (modulo_id, menu_padre_id, nombre, ruta, icono, orden, es_contenedor, aplicaciones)
     SELECT c.modulo_id, c.id, 'Biométricos', $1::varchar, 'biometrico', 1, false, ARRAY['escritorio']::text[]
     FROM menus c JOIN modulos m ON m.id = c.modulo_id
     WHERE m.codigo = 'seguridad' AND c.es_contenedor AND c.nombre = 'Dispositivos'
       AND NOT EXISTS (SELECT 1 FROM menus x WHERE x.ruta = $1::varchar);`,
    [MENU_ESCRITORIO_BIOMETRICOS],
  );
  await pool.query(
    `INSERT INTO rol_menus (rol_id, menu_id)
     SELECT r.id, m.id FROM roles r, menus m
     WHERE r.nombre = 'Administrador' AND m.ruta = $1
     ON CONFLICT DO NOTHING;`,
    [MENU_ESCRITORIO_BIOMETRICOS],
  );
  console.log("✔ Opción 'Biométricos' del escritorio registrada (solo Administrador).");

  // RF-022: cuenta de servicio con la que el programa del reloj pide la aprobación de su equipo.
  await asegurarCuentaServicioBiometrico(pool);

  await pool.end();
  console.log("==========================================");
  console.log("🎉 Seed maestro completado exitosamente.");
  console.log("==========================================");
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
