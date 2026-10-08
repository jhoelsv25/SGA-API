import { Pool } from "pg";
import * as bcrypt from "bcryptjs";

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

interface PermisoSeed {
  moduloCodigo: string;
  codigo: string;
  nombre: string;
  descripcion: string;
}

const PERMISOS_SEED: PermisoSeed[] = [
  // 1. SEGURIDAD Y ACCESOS
  {
    moduloCodigo: "seguridad",
    codigo: "usuarios:listar",
    nombre: "Listar usuarios",
    descripcion: "Permite ver el directorio y estados de cuentas de acceso.",
  },
  {
    moduloCodigo: "seguridad",
    codigo: "usuarios:crear",
    nombre: "Crear usuario",
    descripcion: "Permite vincular personas y generar credenciales de acceso.",
  },
  {
    moduloCodigo: "seguridad",
    codigo: "usuarios:actualizar",
    nombre: "Modificar usuario",
    descripcion: "Permite cambiar nombres de usuario y asignaciones de rol.",
  },
  {
    moduloCodigo: "seguridad",
    codigo: "usuarios:bloquear",
    nombre: "Bloquear / Desbloquear usuario",
    descripcion: "Permite suspender o reactivar el acceso de una cuenta.",
  },
  {
    moduloCodigo: "seguridad",
    codigo: "usuarios:restablecer_clave",
    nombre: "Restablecer contraseña",
    descripcion: "Permite generar contraseñas temporales para usuarios.",
  },
  {
    moduloCodigo: "seguridad",
    codigo: "usuarios:importar",
    nombre: "Importar usuarios",
    descripcion: "Permite la creación masiva de cuentas desde archivos Excel o CSV.",
  },
  {
    moduloCodigo: "seguridad",
    codigo: "usuarios:exportar",
    nombre: "Exportar usuarios",
    descripcion: "Permite descargar listados de usuarios en formato Excel o PDF.",
  },
  {
    moduloCodigo: "seguridad",
    codigo: "roles:listar",
    nombre: "Listar roles",
    descripcion: "Permite ver los perfiles de acceso y número de cuentas asignadas.",
  },
  {
    moduloCodigo: "seguridad",
    codigo: "roles:crear",
    nombre: "Crear rol",
    descripcion: "Permite definir nuevos roles adicionales para la institución.",
  },
  {
    moduloCodigo: "seguridad",
    codigo: "roles:actualizar",
    nombre: "Modificar rol",
    descripcion: "Permite cambiar la descripción y configuración del rol.",
  },
  {
    moduloCodigo: "seguridad",
    codigo: "roles:eliminar",
    nombre: "Desactivar rol",
    descripcion: "Permite deshabilitar roles adicionales no asignados.",
  },
  {
    moduloCodigo: "seguridad",
    codigo: "roles:asignar_permisos",
    nombre: "Asignar permisos a rol",
    descripcion: "Permite configurar la matriz de privilegios por módulo.",
  },
  {
    moduloCodigo: "seguridad",
    codigo: "auditoria:listar",
    nombre: "Consultar bitácora de auditoría",
    descripcion: "Permite inspeccionar eventos, accesos y trazabilidad inmutable.",
  },
  {
    moduloCodigo: "seguridad",
    codigo: "auditoria:exportar",
    nombre: "Exportar bitácora de auditoría",
    descripcion: "Permite descargar reportes forenses y eventos de seguridad.",
  },
  {
    moduloCodigo: "seguridad",
    codigo: "sesiones:listar",
    nombre: "Ver sesiones activas",
    descripcion: "Permite monitorear accesos concurrentes e IPs conectadas.",
  },
  {
    moduloCodigo: "seguridad",
    codigo: "sesiones:cerrar",
    nombre: "Cerrar sesión remota",
    descripcion: "Permite revocar tokens JWT y forzar salida de usuarios.",
  },

  // 2. ESTRUCTURA ACADÉMICA
  {
    moduloCodigo: "academico",
    codigo: "anios_academicos:listar",
    nombre: "Listar años lectivos",
    descripcion: "Permite ver el historial de periodos escolares anuales.",
  },
  {
    moduloCodigo: "academico",
    codigo: "anios_academicos:crear",
    nombre: "Aperturar año lectivo",
    descripcion: "Permite configurar un nuevo ciclo escolar institucional.",
  },
  {
    moduloCodigo: "academico",
    codigo: "anios_academicos:actualizar",
    nombre: "Modificar año lectivo",
    descripcion: "Permite ajustar fechas y parámetros del periodo vigente.",
  },
  {
    moduloCodigo: "academico",
    codigo: "anios_academicos:cerrar",
    nombre: "Cierre anual escolar",
    descripcion: "Permite consolidar y cerrar formalmente el año académico.",
  },
  {
    moduloCodigo: "academico",
    codigo: "periodos:configurar",
    nombre: "Configurar periodos / bimestres",
    descripcion: "Permite definir bimestres, trimestres y fechas de corte.",
  },
  {
    moduloCodigo: "academico",
    codigo: "grados_secciones:listar",
    nombre: "Ver grados y secciones",
    descripcion: "Permite consultar aulas, vacantes y tutores asignados.",
  },
  {
    moduloCodigo: "academico",
    codigo: "secciones:crear",
    nombre: "Crear sección",
    descripcion: "Permite aperturar nuevas aulas por grado y turno.",
  },
  {
    moduloCodigo: "academico",
    codigo: "secciones:actualizar",
    nombre: "Modificar sección",
    descripcion: "Permite cambiar tutores, turnos y aforos de aula.",
  },
  {
    moduloCodigo: "academico",
    codigo: "cursos:listar",
    nombre: "Ver asignaturas curriculares",
    descripcion: "Permite consultar el plan de estudios y áreas curriculares.",
  },
  {
    moduloCodigo: "academico",
    codigo: "cursos:crear",
    nombre: "Crear asignatura",
    descripcion: "Permite registrar materias en el plan de estudios.",
  },
  {
    moduloCodigo: "academico",
    codigo: "cursos:actualizar",
    nombre: "Modificar asignatura",
    descripcion: "Permite ajustar horas pedagógicas y competencias curriculares.",
  },
  {
    moduloCodigo: "academico",
    codigo: "cursos:importar",
    nombre: "Importar plan de estudios",
    descripcion: "Permite cargar el plan de estudios desde archivos oficiales.",
  },
  {
    moduloCodigo: "academico",
    codigo: "cursos:exportar",
    nombre: "Exportar plan curricular",
    descripcion: "Permite descargar la estructura curricular en Excel o PDF.",
  },
  {
    moduloCodigo: "academico",
    codigo: "horarios:listar",
    nombre: "Ver horarios escolares",
    descripcion: "Permite consultar el cronograma de clases de aulas y docentes.",
  },
  {
    moduloCodigo: "academico",
    codigo: "horarios:configurar",
    nombre: "Configurar horarios de clase",
    descripcion: "Permite crear y ajustar los bloques horarios semanales.",
  },
  {
    moduloCodigo: "academico",
    codigo: "horarios:exportar",
    nombre: "Exportar horarios de clase",
    descripcion: "Permite imprimir o descargar los horarios oficiales.",
  },

  // 3. COMUNIDAD Y MATRÍCULA
  {
    moduloCodigo: "matricula",
    codigo: "personas:listar",
    nombre: "Listar personas del padrón",
    descripcion: "Permite consultar el directorio nominal central de personas.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "personas:crear",
    nombre: "Registrar persona",
    descripcion: "Permite dar de alta a una persona en el padrón institucional.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "personas:actualizar",
    nombre: "Modificar persona",
    descripcion: "Permite actualizar datos de filiación, dirección y contacto.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "personas:importar",
    nombre: "Importar padrón de personas",
    descripcion: "Permite carga masiva de personas desde Excel o CSV.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "personas:exportar",
    nombre: "Exportar padrón nominal",
    descripcion: "Permite generar reportes nominales del padrón a Excel.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "estudiantes:listar",
    nombre: "Listar estudiantes",
    descripcion: "Permite consultar nómina de estudiantes y legajos escolares.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "estudiantes:crear",
    nombre: "Registrar estudiante",
    descripcion: "Permite dar de alta expedientes estudiantiles con código modular.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "estudiantes:actualizar",
    nombre: "Modificar estudiante",
    descripcion: "Permite actualizar antecedentes y datos médicos del alumno.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "estudiantes:importar",
    nombre: "Importar nómina SIAGIE",
    descripcion: "Permite importar listas oficiales de alumnos desde SIAGIE.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "estudiantes:exportar",
    nombre: "Exportar nómina de alumnos",
    descripcion: "Permite descargar nóminas escolares a Excel o PDF.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "docentes:listar",
    nombre: "Listar docentes",
    descripcion: "Permite consultar personal docente y áreas a cargo.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "docentes:crear",
    nombre: "Registrar docente",
    descripcion: "Permite incorporar docentes al plantel educativo.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "docentes:actualizar",
    nombre: "Modificar docente",
    descripcion: "Permite actualizar especialidades y asignaciones horarias.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "docentes:importar",
    nombre: "Importar personal docente",
    descripcion: "Permite carga masiva de docentes desde archivo institucional.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "docentes:exportar",
    nombre: "Exportar plantilla docente",
    descripcion: "Permite descargar listado de docentes en Excel.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "apoderados:listar",
    nombre: "Listar apoderados",
    descripcion: "Permite consultar padres y tutores legales registrados.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "apoderados:vincular",
    nombre: "Vincular apoderado y estudiante",
    descripcion: "Permite asociar la responsabilidad tutelar a estudiantes.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "matriculas:listar",
    nombre: "Listar matrículas",
    descripcion: "Permite ver estados de matrícula y vacantes asignadas.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "matriculas:crear",
    nombre: "Registrar matrícula",
    descripcion: "Permite matricular estudiantes en grados y secciones.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "matriculas:actualizar",
    nombre: "Modificar matrícula",
    descripcion: "Permite cambiar de sección, turno o estado de matrícula.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "matriculas:anular",
    nombre: "Anular matrícula / Traslado",
    descripcion: "Permite procesar retiros, traslados y exoneraciones.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "matriculas:importar",
    nombre: "Importar nóminas de matrícula",
    descripcion: "Permite registrar matrículas en bloque desde SIAGIE.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "matriculas:exportar",
    nombre: "Exportar fichas de matrícula",
    descripcion: "Permite emitir nóminas oficiales y fichas de matrícula en PDF.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "credenciales:generar",
    nombre: "Generar carnés con QR",
    descripcion: "Permite emitir credenciales digitales y códigos QR de acceso.",
  },
  {
    moduloCodigo: "matricula",
    codigo: "credenciales:exportar",
    nombre: "Imprimir / Exportar carnés",
    descripcion: "Permite descargar carnés de identificación para impresión.",
  },

  // 4. ASISTENCIA Y CONTROL DE ACCESOS
  {
    moduloCodigo: "asistencia",
    codigo: "asistencias:listar",
    nombre: "Consultar asistencias",
    descripcion: "Permite ver el registro diario de asistencia escolar.",
  },
  {
    moduloCodigo: "asistencia",
    codigo: "asistencias:registrar",
    nombre: "Registrar asistencia manual",
    descripcion: "Permite marcar asistencias, tardanzas y faltas en aula.",
  },
  {
    moduloCodigo: "asistencia",
    codigo: "asistencias:marcar_qr",
    nombre: "Registro por lector QR",
    descripcion: "Permite procesar ingresos en puerta con lector de credenciales.",
  },
  {
    moduloCodigo: "asistencia",
    codigo: "asistencias:justificar",
    nombre: "Justificar inasistencias",
    descripcion: "Permite adjuntar constancias médicas y autorizar justificaciones.",
  },
  {
    moduloCodigo: "asistencia",
    codigo: "asistencias:importar",
    nombre: "Importar marcaciones biométricas",
    descripcion: "Permite subir ficheros de lectores o relojes de control.",
  },
  {
    moduloCodigo: "asistencia",
    codigo: "asistencias:exportar",
    nombre: "Exportar consolidados de asistencia",
    descripcion: "Permite generar reportes mensuales de asistencia y puntualidad.",
  },

  // 5. SEGUIMIENTO DOCENTE Y EVALUACIÓN
  {
    moduloCodigo: "seguimiento-docente",
    codigo: "sesiones_clase:listar",
    nombre: "Ver diario de clases",
    descripcion: "Permite consultar las sesiones de aprendizaje impartidas.",
  },
  {
    moduloCodigo: "seguimiento-docente",
    codigo: "sesiones_clase:registrar",
    nombre: "Registrar sesión de clase",
    descripcion: "Permite registrar el desarrollo de temas y competencias del día.",
  },
  {
    moduloCodigo: "seguimiento-docente",
    codigo: "calificaciones:listar",
    nombre: "Ver registro de calificaciones",
    descripcion: "Permite consultar registros auxiliares de evaluación por curso.",
  },
  {
    moduloCodigo: "seguimiento-docente",
    codigo: "calificaciones:registrar",
    nombre: "Registrar notas y niveles de logro",
    descripcion: "Permite calificar competencias y capacidades en el registro.",
  },
  {
    moduloCodigo: "seguimiento-docente",
    codigo: "calificaciones:cerrar_periodo",
    nombre: "Cierre de notas de periodo",
    descripcion: "Permite congelar y bloquear modificaciones de notas bimestrales.",
  },
  {
    moduloCodigo: "seguimiento-docente",
    codigo: "calificaciones:importar",
    nombre: "Importar notas desde Excel",
    descripcion: "Permite subir registros auxiliares llenados en plantillas Excel.",
  },
  {
    moduloCodigo: "seguimiento-docente",
    codigo: "calificaciones:exportar",
    nombre: "Exportar registros auxiliares",
    descripcion: "Permite descargar las sábanas de notas oficiales en Excel/PDF.",
  },
  {
    moduloCodigo: "seguimiento-docente",
    codigo: "incidencias:listar",
    nombre: "Ver anecdotario e incidencias",
    descripcion: "Permite consultar registros de conducta y llamados de atención.",
  },
  {
    moduloCodigo: "seguimiento-docente",
    codigo: "incidencias:registrar",
    nombre: "Registrar incidencia disciplinaria",
    descripcion: "Permite consignar hechos observados y compromisos firmados.",
  },
  {
    moduloCodigo: "seguimiento-docente",
    codigo: "incidencias:notificar",
    nombre: "Notificar citación al apoderado",
    descripcion: "Permite enviar citaciones formales y reportes de conducta.",
  },

  // 6. LIBRETAS E INFORMES DE PROGRESO
  {
    moduloCodigo: "libretas",
    codigo: "libretas:listar",
    nombre: "Consultar informes de progreso",
    descripcion: "Permite ver el estado de generación de libretas de notas.",
  },
  {
    moduloCodigo: "libretas",
    codigo: "libretas:generar",
    nombre: "Procesar y consolidar libretas",
    descripcion: "Permite calcular promedios, conclusiones descriptivas y méritos.",
  },
  {
    moduloCodigo: "libretas",
    codigo: "libretas:publicar",
    nombre: "Publicar libretas",
    descripcion: "Permite habilitar la visualización para apoderados y alumnos.",
  },
  {
    moduloCodigo: "libretas",
    codigo: "libretas:exportar",
    nombre: "Exportar / Imprimir libretas",
    descripcion: "Permite descargar el paquete de libretas oficiales en PDF masivo.",
  },
  {
    moduloCodigo: "libretas",
    codigo: "cuadro_merito:ver",
    nombre: "Ver cuadro de honor y méritos",
    descripcion: "Permite calcular y visualizar primeros puestos por grado.",
  },
  {
    moduloCodigo: "libretas",
    codigo: "cuadro_merito:exportar",
    nombre: "Exportar cuadro de méritos",
    descripcion: "Permite descargar actas oficiales de orden de mérito.",
  },

  // 7. AULA VIRTUAL Y RECURSOS
  {
    moduloCodigo: "aula-virtual",
    codigo: "unidades:gestionar",
    nombre: "Gestionar unidades de aprendizaje",
    descripcion: "Permite crear y organizar programaciones y unidades didácticas.",
  },
  {
    moduloCodigo: "aula-virtual",
    codigo: "materiales:listar",
    nombre: "Ver biblioteca de materiales",
    descripcion: "Permite explorar recursos didácticos y separatas del aula.",
  },
  {
    moduloCodigo: "aula-virtual",
    codigo: "materiales:crear",
    nombre: "Subir material pedagógico",
    descripcion: "Permite compartir PDFs, enlaces y archivos multimedia con alumnos.",
  },
  {
    moduloCodigo: "aula-virtual",
    codigo: "materiales:eliminar",
    nombre: "Eliminar material pedagógico",
    descripcion: "Permite retirar recursos obsoletos del aula virtual.",
  },
  {
    moduloCodigo: "aula-virtual",
    codigo: "tareas:listar",
    nombre: "Listar tareas y asignaciones",
    descripcion: "Permite ver actividades pendientes y plazos de entrega.",
  },
  {
    moduloCodigo: "aula-virtual",
    codigo: "tareas:crear",
    nombre: "Crear tarea o proyecto",
    descripcion: "Permite publicar asignaciones con criterios e instrucciones.",
  },
  {
    moduloCodigo: "aula-virtual",
    codigo: "tareas:calificar",
    nombre: "Calificar entregas de tareas",
    descripcion: "Permite revisar archivos entregados y asignar retroalimentación.",
  },
  {
    moduloCodigo: "aula-virtual",
    codigo: "tareas:exportar",
    nombre: "Exportar entregas y notas de tareas",
    descripcion: "Permite descargar consolidado de tareas en Excel.",
  },
  {
    moduloCodigo: "aula-virtual",
    codigo: "publicaciones:gestionar",
    nombre: "Gestionar muro de aula",
    descripcion: "Permite publicar avisos de clase y moderar intervenciones.",
  },

  // 8. COMUNICACIONES Y MENSAJERÍA
  {
    moduloCodigo: "comunicacion",
    codigo: "comunicados:listar",
    nombre: "Listar comunicados oficiales",
    descripcion: "Permite consultar boletines y avisos institucionales emitidos.",
  },
  {
    moduloCodigo: "comunicacion",
    codigo: "comunicados:crear",
    nombre: "Redactar comunicado",
    descripcion: "Permite elaborar avisos oficiales para la comunidad escolar.",
  },
  {
    moduloCodigo: "comunicacion",
    codigo: "comunicados:publicar",
    nombre: "Publicar y difundir comunicado",
    descripcion: "Permite emitir comunicados a apoderados, docentes y estudiantes.",
  },
  {
    moduloCodigo: "comunicacion",
    codigo: "notificaciones:enviar",
    nombre: "Enviar notificaciones urgentes",
    descripcion: "Permite emitir alertas inmediatas o recordatorios al portal.",
  },

  // 9. CONFIGURACIÓN DEL SISTEMA
  {
    moduloCodigo: "configuracion",
    codigo: "institucion:ver",
    nombre: "Consultar datos institucionales",
    descripcion: "Permite ver la ficha oficial de la I.E. y códigos de UGEL/DRE.",
  },
  {
    moduloCodigo: "configuracion",
    codigo: "institucion:actualizar",
    nombre: "Modificar datos institucionales",
    descripcion: "Permite actualizar nombre, lema, director y canales oficiales.",
  },
  {
    moduloCodigo: "configuracion",
    codigo: "parametros:ver",
    nombre: "Ver parámetros del sistema",
    descripcion: "Permite inspeccionar políticas de seguridad y umbrales de alerta.",
  },
  {
    moduloCodigo: "configuracion",
    codigo: "parametros:actualizar",
    nombre: "Modificar parámetros del sistema",
    descripcion: "Permite configurar límites de intentos fallidos y cierres de sesión.",
  },
  {
    moduloCodigo: "configuracion",
    codigo: "respaldos:generar",
    nombre: "Generar respaldo de base de datos",
    descripcion: "Permite ejecutar copias de seguridad de emergencia del sistema.",
  },
  {
    moduloCodigo: "configuracion",
    codigo: "respaldos:exportar",
    nombre: "Exportar / Descargar respaldos",
    descripcion: "Permite descargar volcados encriptados de la base de datos.",
  },
  {
    moduloCodigo: "configuracion",
    codigo: "turnos:ver",
    nombre: "Consultar turnos de marcación",
    descripcion: "Permite ver horarios de entrada, salida, ventanas y tolerancias.",
  },
  {
    moduloCodigo: "configuracion",
    codigo: "turnos:crear",
    nombre: "Registrar turno de marcación",
    descripcion: "Permite dar de alta turnos para estudiantes, docentes o administrativos.",
  },
  {
    moduloCodigo: "configuracion",
    codigo: "turnos:actualizar",
    nombre: "Modificar turno de marcación",
    descripcion: "Permite cambiar horarios oficiales, ventanas, tolerancias y estado activo.",
  },
  {
    moduloCodigo: "configuracion",
    codigo: "equipos:ver",
    nombre: "Consultar equipos autorizados",
    descripcion: "Permite listar kioskos de marcación, kioskos de sesiones y biométricos.",
  },
  {
    moduloCodigo: "configuracion",
    codigo: "equipos:crear",
    nombre: "Registrar equipo autorizado",
    descripcion: "Permite registrar un nuevo kiosko o biométrico en el sistema.",
  },
  {
    moduloCodigo: "configuracion",
    codigo: "equipos:actualizar",
    nombre: "Modificar equipo autorizado",
    descripcion: "Permite cambiar datos de equipos o desactivarlos inmediatamente.",
  },
  {
    moduloCodigo: "configuracion",
    codigo: "equipos:autorizar",
    nombre: "Autorizar equipo físico",
    descripcion: "Permite vincular y autorizar la clave de una PC física como kiosko.",
  },
];

async function seed() {
  console.log("Iniciando seed maestro de base de datos SGA...");

  // 1. Institución
  await pool.query(`
    INSERT INTO institucion (
      nombre, codigo_modular, tipo_gestion, ugel, dre, director, direccion, distrito, provincia, departamento, correo
    ) VALUES (
      'I.E. Carmelinas de Lircay',
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

  // 3. Mapear IDs de módulos
  const modulosMap = new Map<string, string>();
  const modulosRes = await pool.query<{ id: string; codigo: string }>(
    `SELECT id, codigo FROM modulos`,
  );
  for (const m of modulosRes.rows) {
    modulosMap.set(m.codigo, m.id);
  }

  // 4. Catálogo Completo de Permisos (CRUD + Import / Export + Específicos)
  let insertCount = 0;
  for (const perm of PERMISOS_SEED) {
    const moduloId = modulosMap.get(perm.moduloCodigo);
    if (!moduloId) {
      console.warn(`[WARN] Módulo no encontrado: ${perm.moduloCodigo}`);
      continue;
    }

    await pool.query(
      `INSERT INTO permisos (modulo_id, codigo, nombre, descripcion)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (codigo) DO UPDATE SET
         modulo_id = EXCLUDED.modulo_id,
         nombre = EXCLUDED.nombre,
         descripcion = EXCLUDED.descripcion;`,
      [moduloId, perm.codigo, perm.nombre, perm.descripcion],
    );
    insertCount++;
  }
  console.log(`✔ ${insertCount} Permisos registrados con éxito (CRUD, Import, Export).`);

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

  // 6. Obtener ID del rol Administrador y asignar el 100% de los permisos
  const adminRolRes = await pool.query<{ id: string }>(
    `SELECT id FROM roles WHERE nombre = 'Administrador' LIMIT 1`,
  );
  const adminRolId = adminRolRes.rows[0].id;

  const allPermsRes = await pool.query<{ id: string }>(`SELECT id FROM permisos`);
  const allPermIds = allPermsRes.rows.map((r) => r.id);

  // Asignar en lote al rol Administrador
  for (const permId of allPermIds) {
    await pool.query(
      `INSERT INTO rol_permisos (rol_id, permiso_id)
       VALUES ($1, $2)
       ON CONFLICT (rol_id, permiso_id) DO NOTHING;`,
      [adminRolId, permId],
    );
  }
  console.log(`✔ ${allPermIds.length} Permisos asignados en su totalidad al rol Administrador.`);

  // Asignar permisos esenciales al rol Director
  const directorRolRes = await pool.query<{ id: string }>(
    `SELECT id FROM roles WHERE nombre = 'Director' LIMIT 1`,
  );
  if (directorRolRes.rows.length > 0) {
    const directorRolId = directorRolRes.rows[0].id;
    // Permisos de consulta, reportes y supervisión para Dirección
    const directorPermsRes = await pool.query<{ id: string }>(
      `SELECT id FROM permisos WHERE codigo NOT LIKE 'roles:%' AND codigo NOT LIKE 'usuarios:bloquear'`,
    );
    for (const p of directorPermsRes.rows) {
      await pool.query(
        `INSERT INTO rol_permisos (rol_id, permiso_id)
         VALUES ($1, $2)
         ON CONFLICT (rol_id, permiso_id) DO NOTHING;`,
        [directorRolId, p.id],
      );
    }
    console.log("✔ Permisos directivos asignados al rol Director.");
  }

  // Asignar permisos pedagógicos al rol Docente
  const docenteRolRes = await pool.query<{ id: string }>(
    `SELECT id FROM roles WHERE nombre = 'Docente' LIMIT 1`,
  );
  if (docenteRolRes.rows.length > 0) {
    const docenteRolId = docenteRolRes.rows[0].id;
    const docentePermsRes = await pool.query<{ id: string }>(
      `SELECT id FROM permisos 
       WHERE modulo_id IN (
         SELECT id FROM modulos WHERE codigo IN ('asistencia', 'seguimiento-docente', 'aula-virtual', 'comunicacion')
       )`,
    );
    for (const p of docentePermsRes.rows) {
      await pool.query(
        `INSERT INTO rol_permisos (rol_id, permiso_id)
         VALUES ($1, $2)
         ON CONFLICT (rol_id, permiso_id) DO NOTHING;`,
        [docenteRolId, p.id],
      );
    }
    console.log("✔ Permisos pedagógicos asignados al rol Docente.");
  }

  // Asignar permisos técnicos al rol Soporte TI (RF-004)
  const soporteRolRes = await pool.query<{ id: string }>(
    `SELECT id FROM roles WHERE nombre = 'Soporte TI' LIMIT 1`,
  );
  if (soporteRolRes.rows.length > 0) {
    const soporteRolId = soporteRolRes.rows[0].id;
    const soportePermsRes = await pool.query<{ id: string }>(
      `SELECT id FROM permisos WHERE codigo LIKE 'equipos:%' OR codigo = 'institucion:ver'`,
    );
    for (const p of soportePermsRes.rows) {
      await pool.query(
        `INSERT INTO rol_permisos (rol_id, permiso_id)
         VALUES ($1, $2)
         ON CONFLICT (rol_id, permiso_id) DO NOTHING;`,
        [soporteRolId, p.id],
      );
    }
    console.log("✔ Permisos técnicos asignados al rol Soporte TI.");
  }

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

  await pool.end();
  console.log("==========================================");
  console.log("🎉 Seed maestro completado exitosamente.");
  console.log("==========================================");
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
