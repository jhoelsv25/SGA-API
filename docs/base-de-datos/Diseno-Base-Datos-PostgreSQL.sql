/* ============================================================================
   SGA COLEGIO - SISTEMA DE GESTIÓN ACADÉMICA
   Diseño de Base de Datos (PostgreSQL 16+) - Versión 3.3
   Proyecto de tesis - 2026-10-09

   Diseño limpio: parte de lo que hace el sistema actual (SGA-BACK/SGA-FRONT),
   pero se reorganiza para un colegio de SECUNDARIA (1.° a 5.°):
   se eliminan tablas técnicas y duplicadas, se corrigen relaciones y se
   agregan las piezas que faltaban.

   ---------------------------------------------------------------------------
   58 TABLAS EN 10 MÓDULOS
   ---------------------------------------------------------------------------
   1. Seguridad ............ personas, roles, modulos, permisos, rol_permisos,
                             menus, usuarios, usuario_roles, sesiones,
                             bitacora_auditoria
   2. Institución .......... institucion, variables_sistema, turnos,
                             dispositivos_marcacion
   3. Estructura académica . anios_academicos, periodos_academicos,
                             calendario_eventos, escalas_calificacion, grados,
                             cursos, plan_estudios
   4. Comunidad educativa .. docentes, estudiantes, apoderados,
                             estudiante_apoderados, credenciales, cargos,
                             persona_cargos, cargo_perfiles_sugeridos
   5. Organización y
      matrícula ............ secciones, cursos_seccion, horarios, matriculas
   6. Libretas ............. libretas, libretas_archivos
   7. Asistencia y
      seguimiento docente .. marcaciones, sesiones_clase,
                             asistencias_estudiante, ausencias_sesion,
                             evidencias_ausencia, consolidados_docente,
                             solicitudes_revision_consolidado
   8. Convivencia y
      comunicación ......... incidencias_conducta, observaciones_estudiante,
                             comunicados, notificaciones
   9. Aula virtual ......... unidades_aprendizaje, materiales,
                             materiales_cambios_fecha, tareas,
                             preguntas_tarea, opciones_pregunta, entregas_tarea,
                             publicaciones_aula, comentarios_publicacion,
                             mensajes_chat, actividad_aula
  10. Indicadores ......... mediciones_indicador (pretest / postest de ISA, CSP, IGM)

   ---------------------------------------------------------------------------
   ALCANCE DE LAS NOTAS
   ---------------------------------------------------------------------------
   * La única nota que genera el sistema es la del aula virtual
     (entregas_tarea.nota). El aula virtual es de reforzamiento.
   * Las notas del aula real NO entran al sistema. El docente sube la libreta
     en PDF descargada del SIAGIE; el sistema la asigna al estudiante por su
     código (estudiantes.codigo) y la publica (tabla libretas, indicador ISA).

   ---------------------------------------------------------------------------
   QUÉ SE ELIMINÓ O UNIFICÓ (respecto a las 62 tablas del sistema actual)
   ---------------------------------------------------------------------------
   * Eliminadas por ser técnicas (no son datos del negocio):
     preferencias de usuario, historial de importaciones, suscripciones push,
     reportes generados (un reporte es una consulta, no una tabla),
     colores por entidad (el color queda como columna en cursos).
   * Eliminadas por alcance (v3.1):
     - niveles: el colegio es solo de secundaria.
     - evaluaciones, notas, calificaciones_periodo, competencias,
       (escalas_calificacion volvió en v3.2 solo para exportar la nota final
       del aula virtual a literal): las notas del aula real no se registran.
   * Unificadas:
     - credenciales de docente + de estudiante + de marcado -> credenciales
     - asistencia docente + intervalos -> sesiones_clase (cumplimiento, CSP)
     - asistencia diaria docente + eventos de marcado -> marcaciones
     - configuración de marcado (JSON) -> turnos (tabla normalizada)
     - notificaciones + destinatarios -> notificaciones (una por usuario)
     - salas + participantes + mensajes de chat -> mensajes_chat
     - firmas de docente -> columna firma_url en docentes
     - comentarios de tarea -> retroalimentación en entregas_tarea
   * Instituciones: un colegio = una institución; ya no se repite
     institucion_id en todas las tablas (tabla de una sola fila).

   ---------------------------------------------------------------------------
   QUÉ SE AGREGÓ (faltaba para un colegio)
   ---------------------------------------------------------------------------
   * Apellido paterno y materno por separado (formato peruano / SIAGIE).
   * Tutor de sección como docente (antes era texto libre).
   * Un turno por tipo de persona (estudiantes, docentes, administrativos)
     con ventanas de marcado, para calcular tardanzas en las marcaciones.
   * Equipos autorizados (v3.2): la marcación y la firma de sesiones solo se
     hacen en equipos registrados dentro del colegio (kiosko de estudiantes,
     kiosko de docentes, kiosko de sesiones en la subdirección). Preparado
     para relojes biométricos (ZKTeco). Se elimina la geolocalización.
   * Parentesco en la relación estudiante-apoderado (un mismo apoderado puede
     ser padre de uno y tutor legal de otro).
   * Horario ligado a la sección (permite recesos) y sesión de clase ligada
     al horario (base del indicador de cumplimiento de sesión).
   * Seguimiento docente: el docente registra su sesión (tema, hora de inicio
     y fin, firma de ingreso y salida); el director registra de vez en cuando
     los tramos en que el docente no estaba en clase (ausencias_sesion), con
     fotos (evidencias_ausencia), y al cierre del bimestre genera el
     consolidado informativo (consolidados_docente, versionado); el docente
     puede pedir revisión (solicitudes_revision_consolidado).
   * Libretas del SIAGIE en PDF por estudiante y periodo (indicador ISA).
   * Menú del sistema: modulos + menus (padre/hijo en la misma tabla).
   * Terminología: PERFIL = acceso al sistema (tabla técnica `roles`); CARGO =
     puesto en el colegio (tabla `cargos`). Los permisos se dan solo por perfil.
   * v3.3: varios perfiles por usuario (usuario_roles) y variables configurables
     con historial (variables_sistema, reemplaza a parametros_sistema).
   * Acceso por rol con alcance (propio, tutoría, mis secciones, colegio) en
     rol_permisos: configurable por el Administrador para todos los módulos.
   * Aula virtual como reforzamiento: materiales y tareas pueden ligarse a la
     sesión de clase que refuerzan.
   * Datos iniciales: grados, cursos (áreas del currículo + Taller de Computación),
     roles (incluye Subdirector y Soporte TI) y módulos.

   ---------------------------------------------------------------------------
   CONVENCIONES
   ---------------------------------------------------------------------------
   * Español, snake_case, sin tildes ni ñ (anio = año, manana = mañana).
   * PostgreSQL 13+ (usa gen_random_uuid()). Probado en PostgreSQL 17.
   * PK: id uuid DEFAULT gen_random_uuid().
   * creado_en / actualizado_en en todas las tablas; eliminado_en (borrado
     lógico) en las tablas maestras.
   * Estados y tipos: varchar + CHECK. JSON: jsonb (valida el formato por sí mismo).
   * actualizado_en se mantiene solo con el trigger fn_actualizar_fecha.
   * Unicidad de negocio con índices únicos parciales (WHERE ...).
   * CASCADE solo en tablas que "pertenecen" a su padre (detalle); el resto
     NO ACTION, sin rutas de cascada múltiples.

   Uso:
     psql -d <base> -f Diseno-Base-Datos-PostgreSQL.sql
   El script crea todo en el esquema "sga" y se puede ejecutar completo las
   veces que sea necesario (borra y recrea el esquema sga).
   ============================================================================ */

-- Ejecutable completo y repetible: crea todo dentro del esquema "sga".
-- ATENCIÓN: borra y recrea el esquema sga. No ejecutar sobre una base con datos reales.
BEGIN;

DROP SCHEMA IF EXISTS sga CASCADE;
CREATE SCHEMA sga;
SET search_path TO sga, public;

/* ############################################################################
   MÓDULO 1: SEGURIDAD
   ############################################################################ */

-- 1.1 PERSONAS: padrón único (docentes, estudiantes, apoderados y usuarios)
CREATE TABLE personas (
    id                uuid NOT NULL DEFAULT gen_random_uuid(),
    tipo_documento    VARCHAR(20)      NOT NULL DEFAULT 'dni',
    numero_documento  VARCHAR(20)      NOT NULL,
    nombres           varchar(100)    NOT NULL,
    apellido_paterno  varchar(60)     NOT NULL,
    apellido_materno  varchar(60)     NULL,
    fecha_nacimiento  DATE             NULL,
    sexo              CHAR(1)          NOT NULL,
    direccion         varchar(255)    NULL,
    distrito          varchar(100)    NULL,
    telefono          VARCHAR(20)      NULL,
    celular           VARCHAR(20)      NULL,
    correo            varchar(100)    NULL,
    foto_url          varchar(255)    NULL,
    creado_en         timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en    timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    eliminado_en      timestamp(0)     NULL,
    CONSTRAINT PK_personas PRIMARY KEY (id),
    CONSTRAINT CK_personas_tipo_documento CHECK (tipo_documento IN ('dni','carne_extranjeria','pasaporte','partida_nacimiento')),
    CONSTRAINT CK_personas_sexo CHECK (sexo IN ('M','F'))
);
CREATE UNIQUE INDEX UX_personas_documento ON personas (tipo_documento, numero_documento) WHERE eliminado_en IS NULL;
CREATE UNIQUE INDEX UX_personas_correo ON personas (correo) WHERE correo IS NOT NULL AND eliminado_en IS NULL;
CREATE INDEX IX_personas_apellidos ON personas (apellido_paterno, apellido_materno, nombres);
-- 1.2 ROLES
CREATE TABLE roles (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    nombre          varchar(50)     NOT NULL,
    descripcion     varchar(255)    NULL,
    es_sistema      boolean              NOT NULL DEFAULT false,   -- no se puede eliminar
    activo          boolean              NOT NULL DEFAULT true,
    creado_en       timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en  timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_roles PRIMARY KEY (id),
    CONSTRAINT UQ_roles_nombre UNIQUE (nombre)
);
-- 1.3 MODULOS: grandes áreas del sistema (agrupan permisos y menús)
CREATE TABLE modulos (
    id         uuid NOT NULL DEFAULT gen_random_uuid(),
    codigo     VARCHAR(30)      NOT NULL,   -- ej. seguimiento-docente
    nombre     varchar(50)     NOT NULL,
    icono      VARCHAR(50)      NULL,
    orden      SMALLINT         NOT NULL,
    vigente    boolean              NOT NULL DEFAULT true,
    creado_en  timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_modulos PRIMARY KEY (id),
    CONSTRAINT UQ_modulos_codigo UNIQUE (codigo)
);
-- 1.4 PERMISOS (acciones del sistema agrupadas por módulo)
CREATE TABLE permisos (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    modulo_id       uuid NOT NULL,
    codigo          VARCHAR(100)     NOT NULL,   -- ej. sesiones.registrar
    nombre          varchar(100)    NOT NULL,
    descripcion     varchar(255)    NULL,
    creado_en       timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_permisos PRIMARY KEY (id),
    CONSTRAINT UQ_permisos_codigo UNIQUE (codigo),
    CONSTRAINT FK_permisos_modulo FOREIGN KEY (modulo_id) REFERENCES modulos (id)
);
-- 1.5 ROL_PERMISOS: qué permisos tiene cada rol y con qué alcance.
--     propio        : solo sus propios datos o registros
--     tutoria       : la sección de la que es tutor
--     mis_secciones : las secciones donde es tutor o dicta algún curso
--     colegio       : todo el colegio
CREATE TABLE rol_permisos (
    rol_id      uuid NOT NULL,
    permiso_id  uuid NOT NULL,
    alcance     VARCHAR(20)      NOT NULL DEFAULT 'colegio',
    CONSTRAINT PK_rol_permisos PRIMARY KEY (rol_id, permiso_id),
    CONSTRAINT CK_rol_permisos_alcance CHECK (alcance IN ('propio','tutoria','mis_secciones','colegio')),
    CONSTRAINT FK_rol_permisos_rol     FOREIGN KEY (rol_id)     REFERENCES roles (id)    ON DELETE CASCADE,
    CONSTRAINT FK_rol_permisos_permiso FOREIGN KEY (permiso_id) REFERENCES permisos (id) ON DELETE CASCADE
);
-- 1.6 MENUS: contenedores (padre) y opciones (hijo) en la misma tabla.
--     Cada usuario ve las opciones cuyo permiso tiene su rol; un contenedor
--     se muestra si tiene al menos una opción visible.
CREATE TABLE menus (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    menu_padre_id  uuid NULL,     -- NULL = contenedor raíz
    modulo_id      uuid NOT NULL,
    permiso_id     uuid NULL,     -- permiso requerido para ver la opción
    nombre         varchar(100)    NOT NULL,
    ruta           varchar(255)    NULL,
    icono          VARCHAR(50)      NULL,
    orden          SMALLINT         NOT NULL,
    es_contenedor  boolean              NOT NULL DEFAULT false,
    vigente        boolean              NOT NULL DEFAULT true,
    creado_en      timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_menus PRIMARY KEY (id),
    CONSTRAINT CK_menus_tipo CHECK (
        (es_contenedor = true AND ruta IS NULL AND menu_padre_id IS NULL) OR
        (es_contenedor = false AND ruta IS NOT NULL AND menu_padre_id IS NOT NULL)),
    CONSTRAINT FK_menus_padre   FOREIGN KEY (menu_padre_id) REFERENCES menus (id),
    CONSTRAINT FK_menus_modulo  FOREIGN KEY (modulo_id)     REFERENCES modulos (id),
    CONSTRAINT FK_menus_permiso FOREIGN KEY (permiso_id)    REFERENCES permisos (id)
);
CREATE INDEX IX_menus_modulo_padre ON menus (modulo_id, menu_padre_id, orden);
-- 1.7 USUARIOS: toda cuenta pertenece a una persona
CREATE TABLE usuarios (
    id                        uuid NOT NULL DEFAULT gen_random_uuid(),
    persona_id                uuid NOT NULL,
    nombre_usuario            varchar(50)     NOT NULL,
    contrasena_hash           varchar(255)    NOT NULL,
    debe_cambiar_contrasena   boolean              NOT NULL DEFAULT true,
    estado                    VARCHAR(20)      NOT NULL DEFAULT 'activo',
    intentos_fallidos         smallint          NOT NULL DEFAULT 0,
    ultimo_acceso             timestamp(0)     NULL,
    creado_en                 timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en            timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    eliminado_en              timestamp(0)     NULL,
    CONSTRAINT PK_usuarios PRIMARY KEY (id),
    CONSTRAINT CK_usuarios_estado CHECK (estado IN ('activo','bloqueado','inactivo')),
    CONSTRAINT FK_usuarios_persona FOREIGN KEY (persona_id) REFERENCES personas (id)
);
CREATE UNIQUE INDEX UX_usuarios_nombre_usuario ON usuarios (nombre_usuario) WHERE eliminado_en IS NULL;
CREATE UNIQUE INDEX UX_usuarios_persona ON usuarios (persona_id) WHERE eliminado_en IS NULL;
-- 1.7b USUARIO_ROLES: un usuario puede tener varios roles (perfiles), por ejemplo
--      Docente y Apoderado. Uno es el principal (con el que inicia sesión); puede
--      cambiar de perfil sin volver a ingresar. Retirar un rol = vigente 0 (historial).
CREATE TABLE usuario_roles (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id      uuid NOT NULL,
    rol_id          uuid NOT NULL,
    es_principal    boolean              NOT NULL DEFAULT false,
    vigente         boolean              NOT NULL DEFAULT true,
    asignado_por_id uuid NULL,
    asignado_en     timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    retirado_por_id uuid NULL,
    retirado_en     timestamp(0)     NULL,
    CONSTRAINT PK_usuario_roles PRIMARY KEY (id),
    CONSTRAINT CK_usuario_roles_retiro CHECK (vigente = true OR (retirado_por_id IS NOT NULL AND retirado_en IS NOT NULL)),
    CONSTRAINT FK_usuario_roles_usuario     FOREIGN KEY (usuario_id)      REFERENCES usuarios (id),
    CONSTRAINT FK_usuario_roles_rol         FOREIGN KEY (rol_id)          REFERENCES roles (id),
    CONSTRAINT FK_usuario_roles_asignado    FOREIGN KEY (asignado_por_id) REFERENCES usuarios (id),
    CONSTRAINT FK_usuario_roles_retirado    FOREIGN KEY (retirado_por_id) REFERENCES usuarios (id)
);
CREATE UNIQUE INDEX UX_usuario_roles_vigente ON usuario_roles (usuario_id, rol_id) WHERE vigente = true;
CREATE UNIQUE INDEX UX_usuario_roles_principal ON usuario_roles (usuario_id) WHERE vigente = true AND es_principal = true;
-- 1.8 SESIONES: sesiones de inicio de sesión (permite ver y cerrar sesiones activas)
CREATE TABLE sesiones (
    id                uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id        uuid NOT NULL,
    token_hash        VARCHAR(128)     NOT NULL,
    direccion_ip      VARCHAR(45)      NULL,
    navegador         varchar(255)    NULL,
    iniciada_en       timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    ultima_actividad  timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    expira_en         timestamp(0)     NOT NULL,
    cerrada_en        timestamp(0)     NULL,
    CONSTRAINT PK_sesiones PRIMARY KEY (id),
    CONSTRAINT UQ_sesiones_token UNIQUE (token_hash),
    CONSTRAINT FK_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
);
CREATE INDEX IX_sesiones_usuario_activas ON sesiones (usuario_id, expira_en) WHERE cerrada_en IS NULL;
-- 1.9 BITACORA_AUDITORIA: registro inmutable de cambios (no se edita ni se borra)
CREATE TABLE bitacora_auditoria (
    id              bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    usuario_id      uuid     NULL,   -- sin FK: el registro se conserva aunque el usuario desaparezca
    accion          VARCHAR(20)          NOT NULL,
    tabla           VARCHAR(100)         NOT NULL,
    registro_id     uuid     NULL,
    valor_anterior  jsonb        NULL,
    valor_nuevo     jsonb        NULL,
    direccion_ip    VARCHAR(45)          NULL,
    registrado_en   timestamp(0)         NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_bitacora_auditoria PRIMARY KEY (id),
    CONSTRAINT CK_bitacora_accion CHECK (accion IN ('crear','actualizar','eliminar','iniciar_sesion','cerrar_sesion'))
);
CREATE INDEX IX_bitacora_tabla_registro ON bitacora_auditoria (tabla, registro_id);
CREATE INDEX IX_bitacora_usuario_fecha ON bitacora_auditoria (usuario_id, registrado_en);
/* ############################################################################
   MÓDULO 2: INSTITUCIÓN
   ############################################################################ */

-- 2.1 INSTITUCION: datos del colegio (una sola fila)
CREATE TABLE institucion (
    id                uuid NOT NULL DEFAULT gen_random_uuid(),
    fila_unica        boolean              NOT NULL DEFAULT true,
    nombre            varchar(150)    NOT NULL,
    codigo_modular    VARCHAR(20)      NOT NULL,
    codigo_local      VARCHAR(20)      NULL,
    tipo_gestion      VARCHAR(20)      NOT NULL,
    ugel              varchar(100)    NULL,
    dre               varchar(100)    NULL,
    director          varchar(150)    NULL,
    direccion         varchar(255)    NOT NULL,
    distrito          varchar(100)    NULL,
    provincia         varchar(100)    NULL,
    departamento      varchar(100)    NULL,
    telefono          VARCHAR(20)      NULL,
    correo            varchar(100)    NULL,
    logo_url          varchar(255)    NULL,
    creado_en         timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en    timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_institucion PRIMARY KEY (id),
    CONSTRAINT UQ_institucion_fila_unica UNIQUE (fila_unica),
    CONSTRAINT CK_institucion_fila_unica CHECK (fila_unica = true),
    CONSTRAINT CK_institucion_tipo_gestion CHECK (tipo_gestion IN ('publica','privada','convenio'))
);
-- 2.2 VARIABLES_SISTEMA: todo valor configurable del sistema (tolerancias, plazos,
--     límites, pesos...). Inspirado en la tabla de variables de ECred.
--     Un cambio NO sobrescribe: crea un registro nuevo vigente y el anterior queda
--     con vigente = false (historial con quién, cuándo y por qué).
CREATE TABLE variables_sistema (
    id                    integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    codigo                VARCHAR(60)       NOT NULL,   -- ej. sesion.tolerancia_ingreso_min
    descripcion           varchar(255)     NOT NULL,
    modulo                VARCHAR(30)       NOT NULL,   -- seguridad, sesiones, libretas...
    tipo                  VARCHAR(10)       NOT NULL,   -- texto, entero, decimal, booleano, fecha, hora, lista
    valor                 text     NOT NULL,
    unidad                varchar(20)      NULL,       -- minutos, días, MB, %
    valor_minimo          DECIMAL(18,4)     NULL,
    valor_maximo          DECIMAL(18,4)     NULL,
    editable              boolean               NOT NULL DEFAULT true,
    carga_en_aplicacion   boolean               NOT NULL DEFAULT true,  -- se carga en caché al iniciar
    vigente               boolean               NOT NULL DEFAULT true,
    motivo_cambio         varchar(500)     NULL,
    actualizado_por_id    uuid  NULL,
    creado_en             timestamp(0)      NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_variables_sistema PRIMARY KEY (id),
    CONSTRAINT CK_variables_sistema_tipo CHECK (tipo IN ('texto','entero','decimal','booleano','fecha','hora','lista')),
    CONSTRAINT CK_variables_sistema_rango CHECK (valor_minimo IS NULL OR valor_maximo IS NULL OR valor_maximo >= valor_minimo),
    CONSTRAINT FK_variables_sistema_actualizado_por FOREIGN KEY (actualizado_por_id) REFERENCES usuarios (id)
);
-- Un solo valor vigente por variable
CREATE UNIQUE INDEX UX_variables_sistema_vigente ON variables_sistema (codigo) WHERE vigente = true;
-- 2.3 TURNOS: un turno por tipo de persona (entrada, salida y tolerancia
--     para calcular tardanzas en las marcaciones)
CREATE TABLE turnos (
    id               uuid NOT NULL DEFAULT gen_random_uuid(),
    aplica_a         VARCHAR(20)      NOT NULL,        -- quién marca con este turno
    hora_entrada     TIME(0)          NOT NULL,   -- hora oficial
    entrada_desde    TIME(0)          NOT NULL,   -- ventana en que se acepta la entrada
    entrada_hasta    TIME(0)          NOT NULL,
    hora_salida      TIME(0)          NOT NULL,   -- hora oficial
    salida_desde     TIME(0)          NOT NULL,   -- ventana en que se acepta la salida
    salida_hasta     TIME(0)          NOT NULL,
    tolerancia_min   smallint          NOT NULL DEFAULT 10,
    dias_laborables  VARCHAR(20)      NOT NULL DEFAULT '1,2,3,4,5',  -- 1 = lunes ... 7 = domingo
    activo           boolean              NOT NULL DEFAULT true,
    creado_en        timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en   timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_turnos PRIMARY KEY (id),
    CONSTRAINT UQ_turnos_aplica_a UNIQUE (aplica_a),
    CONSTRAINT CK_turnos_aplica_a CHECK (aplica_a IN ('estudiantes','docentes','administrativos')),
    CONSTRAINT CK_turnos_horas CHECK (hora_salida > hora_entrada),
    CONSTRAINT CK_turnos_ventana_entrada CHECK (entrada_desde <= hora_entrada AND hora_entrada < entrada_hasta),
    CONSTRAINT CK_turnos_ventana_salida CHECK (salida_desde <= hora_salida AND hora_salida < salida_hasta),
    CONSTRAINT CK_turnos_ventanas CHECK (entrada_hasta <= salida_desde),
    CONSTRAINT CK_turnos_tolerancia CHECK (tolerancia_min BETWEEN 0 AND 60)
);
-- 2.4 DISPOSITIVOS_MARCACION: equipos autorizados dentro del colegio.
--     proposito = marcacion: entrada/salida al colegio (kiosko o biométrico).
--     proposito = sesiones : firma de ingreso/salida de sesiones de clase
--                            (PC fija en la subdirección; solo docentes).
--     Solo un equipo autorizado (clave guardada en el equipo) abre el kiosko.
CREATE TABLE dispositivos_marcacion (
    id                     uuid NOT NULL DEFAULT gen_random_uuid(),
    nombre                 varchar(100)    NOT NULL,   -- Kiosko Estudiantes - Puerta principal
    ubicacion              varchar(150)    NOT NULL,
    tipo                   VARCHAR(20)      NOT NULL DEFAULT 'kiosko',
    proposito              VARCHAR(20)      NOT NULL,
    permite_estudiantes    boolean              NOT NULL DEFAULT false,
    permite_docentes       boolean              NOT NULL DEFAULT false,
    permite_administrativos boolean             NOT NULL DEFAULT false,
    numero_serie           VARCHAR(50)      NULL,       -- reloj biométrico (ZKTeco)
    clave_hash             VARCHAR(128)     NULL,       -- se genera al autorizar el equipo
    autorizado_en          timestamp(0)     NULL,
    autorizado_por_id      uuid NULL,
    activo                 boolean              NOT NULL DEFAULT true,
    creado_en              timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en         timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_dispositivos_marcacion PRIMARY KEY (id),
    CONSTRAINT UQ_dispositivos_marcacion_nombre UNIQUE (nombre),
    CONSTRAINT CK_dispositivos_tipo CHECK (tipo IN ('kiosko','biometrico')),
    CONSTRAINT CK_dispositivos_proposito CHECK (proposito IN ('marcacion','sesiones')),
    CONSTRAINT CK_dispositivos_sesiones CHECK (proposito = 'marcacion' OR (tipo = 'kiosko' AND permite_docentes = true AND permite_estudiantes = false AND permite_administrativos = false)),
    CONSTRAINT CK_dispositivos_alguien CHECK (permite_estudiantes = true OR permite_docentes = true OR permite_administrativos = true),
    CONSTRAINT CK_dispositivos_autorizado CHECK (autorizado_en IS NULL OR (clave_hash IS NOT NULL AND autorizado_por_id IS NOT NULL)),
    CONSTRAINT FK_dispositivos_autorizado_por FOREIGN KEY (autorizado_por_id) REFERENCES usuarios (id)
);
CREATE UNIQUE INDEX UX_dispositivos_numero_serie ON dispositivos_marcacion (numero_serie) WHERE numero_serie IS NOT NULL;
/* ############################################################################
   MÓDULO 3: ESTRUCTURA ACADÉMICA
   ############################################################################ */

-- 3.1 ANIOS_ACADEMICOS
CREATE TABLE anios_academicos (
    id                 uuid NOT NULL DEFAULT gen_random_uuid(),
    anio               SMALLINT         NOT NULL,
    nombre             varchar(150)    NULL,    -- ej. "Año del Bicentenario..."
    fecha_inicio       DATE             NOT NULL,
    fecha_fin          DATE             NOT NULL,
    estado             VARCHAR(20)      NOT NULL DEFAULT 'planificado',
    reabierto_hasta    timestamp(0)     NULL,
    motivo_reapertura  varchar(500)    NULL,
    creado_en          timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en     timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_anios_academicos PRIMARY KEY (id),
    CONSTRAINT UQ_anios_academicos_anio UNIQUE (anio),
    CONSTRAINT CK_anios_academicos_estado CHECK (estado IN ('planificado','en_curso','cerrado','reabierto')),
    CONSTRAINT CK_anios_academicos_fechas CHECK (fecha_fin > fecha_inicio),
    CONSTRAINT CK_anios_academicos_reapertura CHECK (estado <> 'reabierto' OR (reabierto_hasta IS NOT NULL AND motivo_reapertura IS NOT NULL))
);
-- Solo un año puede estar en curso
CREATE UNIQUE INDEX UX_anios_academicos_en_curso ON anios_academicos (estado) WHERE estado = 'en_curso';
-- 3.2 PERIODOS_ACADEMICOS (bimestres o trimestres)
CREATE TABLE periodos_academicos (
    id                 uuid NOT NULL DEFAULT gen_random_uuid(),
    anio_academico_id  uuid NOT NULL,
    numero             smallint          NOT NULL,
    nombre             varchar(50)     NOT NULL,   -- I Bimestre
    tipo               VARCHAR(20)      NOT NULL,
    fecha_inicio       DATE             NOT NULL,
    fecha_fin          DATE             NOT NULL,
    estado             VARCHAR(20)      NOT NULL DEFAULT 'planificado',
    creado_en          timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en     timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_periodos_academicos PRIMARY KEY (id),
    CONSTRAINT UQ_periodos_academicos_numero UNIQUE (anio_academico_id, numero),
    CONSTRAINT CK_periodos_academicos_tipo CHECK (tipo IN ('bimestre','trimestre','semestre')),
    CONSTRAINT CK_periodos_academicos_estado CHECK (estado IN ('planificado','en_curso','cerrado')),
    CONSTRAINT CK_periodos_academicos_fechas CHECK (fecha_fin > fecha_inicio),
    CONSTRAINT FK_periodos_academicos_anio FOREIGN KEY (anio_academico_id) REFERENCES anios_academicos (id) ON DELETE CASCADE
);
-- 3.3 ESCALAS_CALIFICACION: rangos para convertir la nota final numérica (0-20)
--     del aula virtual a literal (AD, A, B, C). Solo se usa al exportar.
CREATE TABLE escalas_calificacion (
    id                 uuid NOT NULL DEFAULT gen_random_uuid(),
    anio_academico_id  uuid NOT NULL,
    literal            VARCHAR(5)       NOT NULL,
    descripcion        varchar(100)    NOT NULL,   -- Logro destacado, Logro esperado...
    nota_minima        DECIMAL(4,2)     NOT NULL,
    nota_maxima        DECIMAL(4,2)     NOT NULL,
    orden              smallint          NOT NULL,
    CONSTRAINT PK_escalas_calificacion PRIMARY KEY (id),
    CONSTRAINT UQ_escalas_calificacion_literal UNIQUE (anio_academico_id, literal),
    CONSTRAINT CK_escalas_calificacion_rango CHECK (nota_minima >= 0 AND nota_maxima <= 20 AND nota_maxima >= nota_minima),
    CONSTRAINT FK_escalas_calificacion_anio FOREIGN KEY (anio_academico_id) REFERENCES anios_academicos (id) ON DELETE CASCADE
);
-- 3.4 CALENDARIO_EVENTOS (feriados, suspensiones, reuniones, actividades)
CREATE TABLE calendario_eventos (
    id                 uuid NOT NULL DEFAULT gen_random_uuid(),
    anio_academico_id  uuid NOT NULL,
    titulo             varchar(150)    NOT NULL,
    descripcion        varchar(500)    NULL,
    tipo               VARCHAR(30)      NOT NULL,
    fecha_inicio       DATE             NOT NULL,
    fecha_fin          DATE             NOT NULL,
    suspende_clases    boolean              NOT NULL DEFAULT false,
    creado_por_id      uuid NULL,
    creado_en          timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en     timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_calendario_eventos PRIMARY KEY (id),
    CONSTRAINT CK_calendario_eventos_tipo CHECK (tipo IN ('feriado','suspension','jornada_pedagogica','reunion','actividad','examen')),
    CONSTRAINT CK_calendario_eventos_fechas CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT FK_calendario_eventos_anio    FOREIGN KEY (anio_academico_id) REFERENCES anios_academicos (id),
    CONSTRAINT FK_calendario_eventos_usuario FOREIGN KEY (creado_por_id)     REFERENCES usuarios (id)
);
CREATE INDEX IX_calendario_eventos_fechas ON calendario_eventos (fecha_inicio, fecha_fin);
-- 3.5 GRADOS (secundaria: 1.° a 5.°)
CREATE TABLE grados (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    numero          smallint          NOT NULL,
    nombre          varchar(50)     NOT NULL,   -- 1.° de secundaria
    creado_en       timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en  timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    eliminado_en    timestamp(0)     NULL,
    CONSTRAINT PK_grados PRIMARY KEY (id),
    CONSTRAINT CK_grados_numero CHECK (numero BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX UX_grados_numero ON grados (numero) WHERE eliminado_en IS NULL;
-- 3.6 CURSOS (áreas curriculares y talleres)
CREATE TABLE cursos (
    id               uuid NOT NULL DEFAULT gen_random_uuid(),
    codigo           VARCHAR(20)      NOT NULL,
    nombre           varchar(100)    NOT NULL,
    area_curricular  VARCHAR(30)      NOT NULL,
    descripcion      varchar(500)    NULL,
    color_hex        CHAR(7)          NULL,   -- #RRGGBB para horarios y aula virtual
    creado_en        timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en   timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    eliminado_en     timestamp(0)     NULL,
    CONSTRAINT PK_cursos PRIMARY KEY (id),
    CONSTRAINT CK_cursos_area CHECK (area_curricular IN (
        'matematica','comunicacion','ingles','arte_cultura','ciencias_sociales',
        'dpcc','educacion_fisica','educacion_religiosa','ciencia_tecnologia','ept','taller','tutoria')),
    CONSTRAINT CK_cursos_color CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9A-Fa-f]{6}$')
);
CREATE UNIQUE INDEX UX_cursos_codigo ON cursos (codigo) WHERE eliminado_en IS NULL;
-- 3.7 PLAN_ESTUDIOS: qué cursos lleva cada grado y cuántas horas
CREATE TABLE plan_estudios (
    id               uuid NOT NULL DEFAULT gen_random_uuid(),
    grado_id         uuid NOT NULL,
    curso_id         uuid NOT NULL,
    horas_semanales  smallint          NOT NULL,
    activo           boolean              NOT NULL DEFAULT true,
    CONSTRAINT PK_plan_estudios PRIMARY KEY (id),
    CONSTRAINT UQ_plan_estudios_grado_curso UNIQUE (grado_id, curso_id),
    CONSTRAINT CK_plan_estudios_horas CHECK (horas_semanales > 0),
    CONSTRAINT FK_plan_estudios_grado FOREIGN KEY (grado_id) REFERENCES grados (id) ON DELETE CASCADE,
    CONSTRAINT FK_plan_estudios_curso FOREIGN KEY (curso_id) REFERENCES cursos (id) ON DELETE CASCADE
);
/* ############################################################################
   MÓDULO 4: COMUNIDAD EDUCATIVA
   ############################################################################ */

-- 4.1 DOCENTES
CREATE TABLE docentes (
    id                  uuid NOT NULL DEFAULT gen_random_uuid(),
    persona_id          uuid NOT NULL,
    codigo              VARCHAR(20)      NOT NULL,
    especialidad        varchar(100)    NULL,
    titulo_profesional  varchar(150)    NULL,
    tipo_contrato       VARCHAR(20)      NOT NULL,
    jornada_horas       smallint          NOT NULL DEFAULT 30,
    fecha_ingreso       DATE             NOT NULL,
    fecha_cese          DATE             NULL,
    estado              VARCHAR(20)      NOT NULL DEFAULT 'activo',
    firma_url           varchar(255)    NULL,   -- imagen de firma para la ficha impresa
    creado_en           timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en      timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    eliminado_en        timestamp(0)     NULL,
    CONSTRAINT PK_docentes PRIMARY KEY (id),
    CONSTRAINT CK_docentes_contrato CHECK (tipo_contrato IN ('nombrado','contratado','practicante')),
    CONSTRAINT CK_docentes_jornada CHECK (jornada_horas IN (20,24,30,40)),
    CONSTRAINT CK_docentes_estado CHECK (estado IN ('activo','licencia','cesado')),
    CONSTRAINT CK_docentes_fechas CHECK (fecha_cese IS NULL OR fecha_cese >= fecha_ingreso),
    CONSTRAINT FK_docentes_persona FOREIGN KEY (persona_id) REFERENCES personas (id)
);
CREATE UNIQUE INDEX UX_docentes_codigo ON docentes (codigo) WHERE eliminado_en IS NULL;
CREATE UNIQUE INDEX UX_docentes_persona ON docentes (persona_id) WHERE eliminado_en IS NULL;
-- 4.2 ESTUDIANTES
CREATE TABLE estudiantes (
    id                    uuid NOT NULL DEFAULT gen_random_uuid(),
    persona_id            uuid NOT NULL,
    codigo                VARCHAR(20)      NOT NULL,   -- código del estudiante (SIAGIE)
    fecha_ingreso         DATE             NOT NULL,
    lengua_materna        varchar(50)     NULL,
    religion              varchar(50)     NULL,
    tiene_discapacidad    boolean              NOT NULL DEFAULT false,
    detalle_discapacidad  varchar(255)    NULL,
    grupo_sanguineo       VARCHAR(5)       NULL,
    alergias              varchar(255)    NULL,
    condiciones_medicas   varchar(500)    NULL,
    seguro_salud          varchar(100)    NULL,
    estado                VARCHAR(20)      NOT NULL DEFAULT 'activo',
    creado_en             timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en        timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    eliminado_en          timestamp(0)     NULL,
    CONSTRAINT PK_estudiantes PRIMARY KEY (id),
    CONSTRAINT CK_estudiantes_estado CHECK (estado IN ('activo','retirado','trasladado','egresado')),
    CONSTRAINT CK_estudiantes_discapacidad CHECK (tiene_discapacidad = true OR detalle_discapacidad IS NULL),
    CONSTRAINT FK_estudiantes_persona FOREIGN KEY (persona_id) REFERENCES personas (id)
);
CREATE UNIQUE INDEX UX_estudiantes_codigo ON estudiantes (codigo) WHERE eliminado_en IS NULL;
CREATE UNIQUE INDEX UX_estudiantes_persona ON estudiantes (persona_id) WHERE eliminado_en IS NULL;
-- 4.3 APODERADOS
CREATE TABLE apoderados (
    id                 uuid NOT NULL DEFAULT gen_random_uuid(),
    persona_id         uuid NOT NULL,
    ocupacion          varchar(100)    NULL,
    centro_laboral     varchar(150)    NULL,
    telefono_laboral   VARCHAR(20)      NULL,
    grado_instruccion  VARCHAR(20)      NULL,
    creado_en          timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en     timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    eliminado_en       timestamp(0)     NULL,
    CONSTRAINT PK_apoderados PRIMARY KEY (id),
    CONSTRAINT CK_apoderados_instruccion CHECK (grado_instruccion IS NULL OR grado_instruccion IN ('sin_estudios','primaria','secundaria','tecnica','universitaria','posgrado')),
    CONSTRAINT FK_apoderados_persona FOREIGN KEY (persona_id) REFERENCES personas (id)
);
CREATE UNIQUE INDEX UX_apoderados_persona ON apoderados (persona_id) WHERE eliminado_en IS NULL;
-- 4.4 ESTUDIANTE_APODERADOS: vínculo familiar (un estudiante, varios apoderados)
CREATE TABLE estudiante_apoderados (
    estudiante_id        uuid NOT NULL,
    apoderado_id         uuid NOT NULL,
    parentesco           VARCHAR(20)      NOT NULL,
    es_principal         boolean              NOT NULL DEFAULT false,   -- recibe comunicaciones y libreta
    vive_con_estudiante  boolean              NOT NULL DEFAULT false,
    autorizado_recoger   boolean              NOT NULL DEFAULT false,
    contacto_emergencia  boolean              NOT NULL DEFAULT false,
    creado_en            timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_estudiante_apoderados PRIMARY KEY (estudiante_id, apoderado_id),
    CONSTRAINT CK_estudiante_apoderados_parentesco CHECK (parentesco IN ('padre','madre','abuelo','abuela','hermano','hermana','tio','tia','tutor_legal','otro')),
    CONSTRAINT FK_estudiante_apoderados_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes (id) ON DELETE CASCADE,
    CONSTRAINT FK_estudiante_apoderados_apoderado  FOREIGN KEY (apoderado_id)  REFERENCES apoderados (id)  ON DELETE CASCADE
);
-- Un solo apoderado principal por estudiante
CREATE UNIQUE INDEX UX_estudiante_apoderados_principal ON estudiante_apoderados (estudiante_id) WHERE es_principal = true;
-- 4.5 CREDENCIALES: carné con QR y PIN para marcar en el kiosko (docentes, estudiantes y personal)
CREATE TABLE credenciales (
    id                uuid NOT NULL DEFAULT gen_random_uuid(),
    persona_id        uuid NOT NULL,
    codigo            VARCHAR(50)      NOT NULL,   -- valor del QR / código corto
    pin_hash          VARCHAR(128)     NULL,       -- verificación en kiosko
    activa            boolean              NOT NULL DEFAULT true,
    emitida_en        timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    vence_en          DATE             NULL,
    anulada_en        timestamp(0)     NULL,
    motivo_anulacion  varchar(255)    NULL,
    CONSTRAINT PK_credenciales PRIMARY KEY (id),
    CONSTRAINT CK_credenciales_anulacion CHECK (activa = true OR anulada_en IS NOT NULL),
    CONSTRAINT FK_credenciales_persona FOREIGN KEY (persona_id) REFERENCES personas (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX UX_credenciales_codigo_activa ON credenciales (codigo) WHERE activa = true;
CREATE UNIQUE INDEX UX_credenciales_persona_activa ON credenciales (persona_id) WHERE activa = true;
-- 4.6 CARGOS: puestos del personal del colegio (Director, Docente de aula,
--     Auxiliar...). El cargo NO da permisos: el acceso lo dan los perfiles (tabla
--     roles). Sirve para el organigrama, reportes, firmas e historial laboral.
CREATE TABLE cargos (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    nombre          varchar(80)     NOT NULL,
    descripcion     varchar(255)    NULL,
    vigente         boolean              NOT NULL DEFAULT true,
    creado_en       timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en  timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_cargos PRIMARY KEY (id),
    CONSTRAINT UQ_cargos_nombre UNIQUE (nombre)
);
-- 4.7 PERSONA_CARGOS: cargos que ocupa (u ocupó) una persona del personal, con
--     fechas. Un cargo que termina queda con vigente = false (historial laboral).
CREATE TABLE persona_cargos (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    persona_id      uuid NOT NULL,
    cargo_id        uuid NOT NULL,
    fecha_inicio    DATE             NOT NULL,
    fecha_fin       DATE             NULL,
    es_principal    boolean              NOT NULL DEFAULT true,   -- el que se imprime en reportes y firmas
    vigente         boolean              NOT NULL DEFAULT true,
    registrado_por_id uuid NULL,
    creado_en       timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_persona_cargos PRIMARY KEY (id),
    CONSTRAINT CK_persona_cargos_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
    CONSTRAINT CK_persona_cargos_vigente CHECK (vigente = true OR fecha_fin IS NOT NULL),
    CONSTRAINT FK_persona_cargos_persona   FOREIGN KEY (persona_id)        REFERENCES personas (id),
    CONSTRAINT FK_persona_cargos_cargo     FOREIGN KEY (cargo_id)          REFERENCES cargos (id),
    CONSTRAINT FK_persona_cargos_registrado FOREIGN KEY (registrado_por_id) REFERENCES usuarios (id)
);
CREATE UNIQUE INDEX UX_persona_cargos_vigente ON persona_cargos (persona_id, cargo_id) WHERE vigente = true;
CREATE UNIQUE INDEX UX_persona_cargos_principal ON persona_cargos (persona_id) WHERE vigente = true AND es_principal = true;
-- 4.8 CARGO_PERFILES_SUGERIDOS: perfiles que el sistema propone al asignar un cargo.
--     Son solo una sugerencia; el Administrador decide qué perfiles asigna.
CREATE TABLE cargo_perfiles_sugeridos (
    cargo_id  uuid NOT NULL,
    rol_id    uuid NOT NULL,   -- perfil sugerido
    CONSTRAINT PK_cargo_perfiles_sugeridos PRIMARY KEY (cargo_id, rol_id),
    CONSTRAINT FK_cargo_perfiles_cargo FOREIGN KEY (cargo_id) REFERENCES cargos (id) ON DELETE CASCADE,
    CONSTRAINT FK_cargo_perfiles_rol   FOREIGN KEY (rol_id)   REFERENCES roles (id)  ON DELETE CASCADE
);
/* ############################################################################
   MÓDULO 5: ORGANIZACIÓN Y MATRÍCULA
   ############################################################################ */

-- 5.1 SECCIONES (1° A, 1° B...) por año
CREATE TABLE secciones (
    id                 uuid NOT NULL DEFAULT gen_random_uuid(),
    anio_academico_id  uuid NOT NULL,
    grado_id           uuid NOT NULL,
    tutor_id           uuid NULL,     -- docente tutor
    nombre             varchar(10)     NOT NULL, -- A, B, Única
    aula               varchar(50)     NULL,
    vacantes           smallint          NOT NULL,
    estado             VARCHAR(20)      NOT NULL DEFAULT 'activa',
    creado_en          timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en     timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_secciones PRIMARY KEY (id),
    CONSTRAINT UQ_secciones_id_anio UNIQUE (id, anio_academico_id),     -- soporte para FK compuesta de matrículas
    CONSTRAINT UQ_secciones_grado_nombre UNIQUE (anio_academico_id, grado_id, nombre),
    CONSTRAINT CK_secciones_estado CHECK (estado IN ('activa','cerrada')),
    CONSTRAINT CK_secciones_vacantes CHECK (vacantes > 0),
    CONSTRAINT FK_secciones_anio  FOREIGN KEY (anio_academico_id) REFERENCES anios_academicos (id),
    CONSTRAINT FK_secciones_grado FOREIGN KEY (grado_id)          REFERENCES grados (id),
    CONSTRAINT FK_secciones_tutor FOREIGN KEY (tutor_id)          REFERENCES docentes (id)
);
-- 5.2 CURSOS_SECCION: curso dictado en una sección y su docente (carga académica)
CREATE TABLE cursos_seccion (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    seccion_id      uuid NOT NULL,
    curso_id        uuid NOT NULL,
    docente_id      uuid NULL,   -- NULL mientras no se asigne
    creado_en       timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en  timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_cursos_seccion PRIMARY KEY (id),
    CONSTRAINT UQ_cursos_seccion UNIQUE (seccion_id, curso_id),
    CONSTRAINT FK_cursos_seccion_seccion FOREIGN KEY (seccion_id) REFERENCES secciones (id),
    CONSTRAINT FK_cursos_seccion_curso   FOREIGN KEY (curso_id)   REFERENCES cursos (id),
    CONSTRAINT FK_cursos_seccion_docente FOREIGN KEY (docente_id) REFERENCES docentes (id)
);
CREATE INDEX IX_cursos_seccion_docente ON cursos_seccion (docente_id);
-- 5.3 HORARIOS: bloques semanales de la sección (clase o receso)
CREATE TABLE horarios (
    id                uuid NOT NULL DEFAULT gen_random_uuid(),
    seccion_id        uuid NOT NULL,
    curso_seccion_id  uuid NULL,   -- NULL en recesos
    dia_semana        smallint          NOT NULL,   -- 1 = lunes ... 7 = domingo
    hora_inicio       TIME(0)          NOT NULL,
    hora_fin          TIME(0)          NOT NULL,
    tipo_bloque       VARCHAR(10)      NOT NULL DEFAULT 'clase',
    aula              varchar(50)     NULL,
    creado_en         timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en    timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_horarios PRIMARY KEY (id),
    CONSTRAINT UQ_horarios_bloque UNIQUE (seccion_id, dia_semana, hora_inicio),
    CONSTRAINT CK_horarios_dia CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT CK_horarios_horas CHECK (hora_fin > hora_inicio),
    CONSTRAINT CK_horarios_tipo CHECK ((tipo_bloque = 'clase' AND curso_seccion_id IS NOT NULL) OR (tipo_bloque = 'receso' AND curso_seccion_id IS NULL)),
    CONSTRAINT FK_horarios_seccion      FOREIGN KEY (seccion_id)       REFERENCES secciones (id),
    CONSTRAINT FK_horarios_curso_seccion FOREIGN KEY (curso_seccion_id) REFERENCES cursos_seccion (id)
);
CREATE INDEX IX_horarios_curso_seccion ON horarios (curso_seccion_id);
-- 5.4 MATRICULAS: un estudiante, una sección por año
CREATE TABLE matriculas (
    id                   uuid NOT NULL DEFAULT gen_random_uuid(),
    estudiante_id        uuid NOT NULL,
    seccion_id           uuid NOT NULL,
    anio_academico_id    uuid NOT NULL,
    codigo               VARCHAR(20)      NOT NULL,
    fecha_matricula      DATE             NOT NULL,
    tipo                 VARCHAR(20)      NOT NULL,
    estado               VARCHAR(20)      NOT NULL DEFAULT 'matriculado',
    es_repitente         boolean              NOT NULL DEFAULT false,
    colegio_procedencia  varchar(150)    NULL,
    fecha_retiro         DATE             NULL,
    motivo_retiro        varchar(255)    NULL,
    colegio_destino      varchar(150)    NULL,   -- solo en traslado a otro colegio
    observaciones        varchar(500)    NULL,
    registrado_por_id    uuid NULL,
    creado_en            timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en       timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_matriculas PRIMARY KEY (id),
    CONSTRAINT UQ_matriculas_codigo UNIQUE (codigo),
    CONSTRAINT UQ_matriculas_estudiante_anio UNIQUE (estudiante_id, anio_academico_id),
    CONSTRAINT CK_matriculas_tipo CHECK (tipo IN ('nuevo','continuador','traslado')),
    CONSTRAINT CK_matriculas_estado CHECK (estado IN ('matriculado','retirado','trasladado','culminado')),
    CONSTRAINT CK_matriculas_retiro CHECK (estado NOT IN ('retirado','trasladado') OR fecha_retiro IS NOT NULL),
    CONSTRAINT CK_matriculas_destino CHECK (estado <> 'trasladado' OR colegio_destino IS NOT NULL),
    CONSTRAINT CK_matriculas_procedencia CHECK (tipo <> 'traslado' OR colegio_procedencia IS NOT NULL),
    CONSTRAINT FK_matriculas_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes (id),
    -- FK compuesta: garantiza que la sección pertenezca al mismo año de la matrícula
    CONSTRAINT FK_matriculas_seccion FOREIGN KEY (seccion_id, anio_academico_id) REFERENCES secciones (id, anio_academico_id),
    CONSTRAINT FK_matriculas_registrado_por FOREIGN KEY (registrado_por_id) REFERENCES usuarios (id)
);
CREATE INDEX IX_matriculas_seccion_estado ON matriculas (seccion_id, estado);
/* ############################################################################
   MÓDULO 6: LIBRETAS
   ############################################################################ */

-- 6.1 LIBRETAS: una por estudiante (matrícula) y bimestre; se programa con su
--     fecha límite y se completa cuando se sube el PDF del SIAGIE (indicador ISA).
--     ISA = libretas publicadas a tiempo / libretas programadas x 100
--     El estado se fija con la PRIMERA publicación; los reemplazos no lo cambian.
CREATE TABLE libretas (
    id                uuid NOT NULL DEFAULT gen_random_uuid(),
    matricula_id      uuid NOT NULL,
    periodo_id        uuid NOT NULL,
    fecha_limite      DATE             NOT NULL,   -- hasta cuándo debe estar publicada
    estado            VARCHAR(20)      NOT NULL DEFAULT 'pendiente',
    publicada_en      timestamp(0)     NULL,       -- primera publicación (base del ISA)
    visto_en          timestamp(0)     NULL,       -- primera vez que la vio el estudiante o apoderado
    programada_por_id uuid NOT NULL,
    creado_en         timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en    timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_libretas PRIMARY KEY (id),
    CONSTRAINT UQ_libretas_matricula_periodo UNIQUE (matricula_id, periodo_id),
    CONSTRAINT CK_libretas_estado CHECK (estado IN ('pendiente','a_tiempo','fuera_de_plazo')),
    CONSTRAINT CK_libretas_publicada CHECK ((estado = 'pendiente' AND publicada_en IS NULL) OR (estado <> 'pendiente' AND publicada_en IS NOT NULL)),
    CONSTRAINT CK_libretas_visto CHECK (visto_en IS NULL OR publicada_en IS NOT NULL),
    CONSTRAINT FK_libretas_matricula     FOREIGN KEY (matricula_id)      REFERENCES matriculas (id),
    CONSTRAINT FK_libretas_periodo       FOREIGN KEY (periodo_id)        REFERENCES periodos_academicos (id),
    CONSTRAINT FK_libretas_programada_por FOREIGN KEY (programada_por_id) REFERENCES usuarios (id)
);
CREATE INDEX IX_libretas_periodo_estado ON libretas (periodo_id, estado);
-- 6.2 LIBRETAS_ARCHIVOS: PDF subidos de cada libreta. Un reemplazo no borra el
--     archivo anterior: queda con vigente = false (baja lógica) con quién y por qué.
CREATE TABLE libretas_archivos (
    id                 uuid NOT NULL DEFAULT gen_random_uuid(),
    libreta_id         uuid NOT NULL,
    archivo_url        varchar(500)    NOT NULL,
    nombre_original    varchar(255)    NOT NULL,
    codigo_leido       VARCHAR(20)      NULL,      -- código del estudiante identificado en el archivo
    asignacion         VARCHAR(20)      NOT NULL,  -- automatica / manual
    vigente            boolean              NOT NULL DEFAULT true,
    motivo_reemplazo   varchar(500)    NULL,      -- obligatorio cuando reemplaza a otro archivo
    subido_por_id      uuid NOT NULL,
    subido_en          timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_libretas_archivos PRIMARY KEY (id),
    CONSTRAINT CK_libretas_archivos_asignacion CHECK (asignacion IN ('automatica','manual')),
    CONSTRAINT FK_libretas_archivos_libreta    FOREIGN KEY (libreta_id)    REFERENCES libretas (id) ON DELETE CASCADE,
    CONSTRAINT FK_libretas_archivos_subido_por FOREIGN KEY (subido_por_id) REFERENCES usuarios (id)
);
-- Un solo archivo vigente por libreta
CREATE UNIQUE INDEX UX_libretas_archivos_vigente ON libretas_archivos (libreta_id) WHERE vigente = true;
/* ############################################################################
   MÓDULO 7: ASISTENCIA Y SEGUIMIENTO DOCENTE
   ############################################################################ */

-- 7.1 MARCACIONES: entrada y salida al colegio (kiosko, biométrico o manual)
CREATE TABLE marcaciones (
    id                    uuid NOT NULL DEFAULT gen_random_uuid(),
    persona_id            uuid NOT NULL,
    credencial_id         uuid NULL,
    dispositivo_id        uuid NULL,   -- NULL solo en marcación manual
    turno_id              uuid NULL,
    tipo                  VARCHAR(10)      NOT NULL,
    fecha_hora            timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    origen                VARCHAR(10)      NOT NULL,
    resultado             VARCHAR(20)      NOT NULL,
    minutos_tardanza      SMALLINT         NOT NULL DEFAULT 0,
    registrado_por_id     uuid NULL,   -- quien registró la marcación manual
    observacion           varchar(500)    NULL,
    justificada           boolean              NOT NULL DEFAULT false,
    motivo_justificacion  varchar(500)    NULL,
    justificada_por_id    uuid NULL,
    justificada_en        timestamp(0)     NULL,
    CONSTRAINT PK_marcaciones PRIMARY KEY (id),
    CONSTRAINT CK_marcaciones_tipo CHECK (tipo IN ('entrada','salida')),
    CONSTRAINT CK_marcaciones_origen CHECK (origen IN ('kiosko','biometrico','manual')),
    CONSTRAINT CK_marcaciones_resultado CHECK (resultado IN ('puntual','tardanza','salida_anticipada','fuera_de_turno')),
    CONSTRAINT CK_marcaciones_minutos CHECK (minutos_tardanza >= 0),
    CONSTRAINT CK_marcaciones_origen_datos CHECK (
        (origen = 'manual' AND dispositivo_id IS NULL AND registrado_por_id IS NOT NULL AND observacion IS NOT NULL) OR
        (origen <> 'manual' AND dispositivo_id IS NOT NULL)),
    CONSTRAINT CK_marcaciones_justificacion CHECK (justificada = false OR (motivo_justificacion IS NOT NULL AND justificada_por_id IS NOT NULL AND justificada_en IS NOT NULL)),
    CONSTRAINT FK_marcaciones_persona         FOREIGN KEY (persona_id)         REFERENCES personas (id),
    CONSTRAINT FK_marcaciones_credencial      FOREIGN KEY (credencial_id)      REFERENCES credenciales (id),
    CONSTRAINT FK_marcaciones_dispositivo     FOREIGN KEY (dispositivo_id)     REFERENCES dispositivos_marcacion (id),
    CONSTRAINT FK_marcaciones_registrado_por  FOREIGN KEY (registrado_por_id)  REFERENCES usuarios (id),
    CONSTRAINT FK_marcaciones_turno           FOREIGN KEY (turno_id)           REFERENCES turnos (id),
    CONSTRAINT FK_marcaciones_justificada_por FOREIGN KEY (justificada_por_id) REFERENCES usuarios (id)
);
CREATE INDEX IX_marcaciones_persona_fecha ON marcaciones (persona_id, fecha_hora);
CREATE INDEX IX_marcaciones_fecha ON marcaciones (fecha_hora);
-- 7.2 SESIONES_CLASE: cumplimiento de cada clase programada por el docente (indicador CSP).
--     Se crean cada día desde horarios (pendiente). El docente va al kiosko de
--     sesiones (subdirección), se identifica con código + PIN, registra el tema
--     y firma ingreso (en_curso) y salida (cumplida o parcial); sin firma al
--     cierre del día queda no_cumplida. Reemplaza la hoja física.
CREATE TABLE sesiones_clase (
    id                      uuid NOT NULL DEFAULT gen_random_uuid(),
    horario_id              uuid NOT NULL,
    docente_id              uuid NOT NULL,   -- quien dictó (puede ser reemplazo)
    fecha                   DATE             NOT NULL,
    hora_inicio_real        TIME(0)          NULL,
    hora_fin_real           TIME(0)          NULL,
    estado                  VARCHAR(20)      NOT NULL DEFAULT 'pendiente',
    minutos_perdidos        SMALLINT         NOT NULL DEFAULT 0,
    tema                    varchar(500)    NULL,
    observaciones           varchar(500)    NULL,
    justificacion           varchar(500)    NULL,   -- motivo que presenta el docente
    justificacion_estado    VARCHAR(20)      NULL,   -- solicitada / aprobada / rechazada
    justificacion_documento_url varchar(255) NULL,
    justificada_por_id      uuid NULL,   -- subdirector que resolvió
    justificada_en          timestamp(0)     NULL,
    firmada_inicio_en       timestamp(0)     NULL,
    firmada_fin_en          timestamp(0)     NULL,
    dispositivo_inicio_id   uuid NULL,   -- kiosko de sesiones donde firmó el ingreso
    dispositivo_fin_id      uuid NULL,   -- kiosko de sesiones donde firmó la salida
    salida_automatica       boolean              NOT NULL DEFAULT false,  -- 1 = sin firma de salida; hora fin puesta por el sistema
    creado_en               timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en          timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_sesiones_clase PRIMARY KEY (id),
    CONSTRAINT UQ_sesiones_clase_horario_fecha UNIQUE (horario_id, fecha),
    CONSTRAINT CK_sesiones_clase_estado CHECK (estado IN ('pendiente','en_curso','cumplida','parcial','no_cumplida','justificada','reprogramada')),
    CONSTRAINT CK_sesiones_clase_horas CHECK (hora_fin_real IS NULL OR hora_inicio_real IS NULL OR hora_fin_real > hora_inicio_real),
    CONSTRAINT CK_sesiones_clase_minutos CHECK (minutos_perdidos >= 0),
    CONSTRAINT CK_sesiones_clase_justificada CHECK (estado <> 'justificada' OR justificacion_estado = 'aprobada'),
    CONSTRAINT CK_sesiones_clase_justif_estado CHECK (justificacion_estado IS NULL OR (justificacion_estado IN ('solicitada','aprobada','rechazada') AND justificacion IS NOT NULL)),
    CONSTRAINT CK_sesiones_clase_justif_resuelta CHECK (justificacion_estado IS NULL OR justificacion_estado = 'solicitada' OR (justificada_por_id IS NOT NULL AND justificada_en IS NOT NULL)),
    CONSTRAINT FK_sesiones_clase_horario FOREIGN KEY (horario_id) REFERENCES horarios (id),
    CONSTRAINT CK_sesiones_clase_firma_inicio CHECK (firmada_inicio_en IS NULL OR dispositivo_inicio_id IS NOT NULL),
    CONSTRAINT CK_sesiones_clase_firma_fin CHECK (firmada_fin_en IS NULL OR (dispositivo_fin_id IS NOT NULL AND firmada_inicio_en IS NOT NULL)),
    CONSTRAINT FK_sesiones_clase_docente FOREIGN KEY (docente_id) REFERENCES docentes (id),
    CONSTRAINT FK_sesiones_clase_justificada_por FOREIGN KEY (justificada_por_id) REFERENCES usuarios (id),
    CONSTRAINT FK_sesiones_clase_dispositivo_inicio FOREIGN KEY (dispositivo_inicio_id) REFERENCES dispositivos_marcacion (id),
    CONSTRAINT FK_sesiones_clase_dispositivo_fin    FOREIGN KEY (dispositivo_fin_id)    REFERENCES dispositivos_marcacion (id)
);
CREATE INDEX IX_sesiones_clase_docente_fecha ON sesiones_clase (docente_id, fecha);
CREATE INDEX IX_sesiones_clase_fecha_estado ON sesiones_clase (fecha, estado);
-- 7.3 ASISTENCIAS_ESTUDIANTE: asistencia del estudiante en cada sesión de clase
--     (la registra el docente). La asistencia al colegio sale de marcaciones.
CREATE TABLE asistencias_estudiante (
    id                 uuid NOT NULL DEFAULT gen_random_uuid(),
    sesion_clase_id    uuid NOT NULL,
    matricula_id       uuid NOT NULL,
    estado             VARCHAR(20)      NOT NULL DEFAULT 'presente',
    justificacion      varchar(500)    NULL,
    documento_url      varchar(255)    NULL,
    justificada_por_id uuid NULL,
    registrado_por_id  uuid NULL,
    registrado_en      timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en     timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_asistencias_estudiante PRIMARY KEY (id),
    CONSTRAINT UQ_asistencias_estudiante UNIQUE (sesion_clase_id, matricula_id),
    CONSTRAINT CK_asistencias_estudiante_estado CHECK (estado IN ('presente','tardanza','falta','falta_justificada')),
    CONSTRAINT CK_asistencias_estudiante_justif CHECK (estado <> 'falta_justificada' OR (justificacion IS NOT NULL AND justificada_por_id IS NOT NULL)),
    CONSTRAINT FK_asistencias_estudiante_sesion         FOREIGN KEY (sesion_clase_id)    REFERENCES sesiones_clase (id) ON DELETE CASCADE,
    CONSTRAINT FK_asistencias_estudiante_matricula      FOREIGN KEY (matricula_id)       REFERENCES matriculas (id),
    CONSTRAINT FK_asistencias_estudiante_justificada_por FOREIGN KEY (justificada_por_id) REFERENCES usuarios (id),
    CONSTRAINT FK_asistencias_estudiante_registrado_por FOREIGN KEY (registrado_por_id)  REFERENCES usuarios (id)
);
CREATE INDEX IX_asistencias_estudiante_matricula ON asistencias_estudiante (matricula_id);
-- 7.4 AUSENCIAS_SESION: tramos en que el director encontró al docente fuera
--     de clase durante una sesión (supervisión ocasional). El docente puede
--     dejar su descargo. No cambia el estado de la sesión; alimenta el
--     consolidado del bimestre.
--     Regla de la aplicación: el tramo debe caer dentro del horario de la sesión.
--     Historial: una corrección NO sobrescribe; crea una nueva versión (vigente = true)
--     y la anterior queda con vigente = false (baja lógica). Nada se elimina.
CREATE TABLE ausencias_sesion (
    id                 uuid NOT NULL DEFAULT gen_random_uuid(),
    sesion_clase_id    uuid NOT NULL,
    ausencia_origen_id uuid NULL,       -- NULL en la versión 1; en las siguientes, id de la versión 1
    version            smallint          NOT NULL DEFAULT 1,
    vigente            boolean              NOT NULL DEFAULT true,  -- 0 = versión reemplazada (baja lógica)
    motivo_cambio      varchar(500)    NULL,       -- obligatorio desde la versión 2
    registrado_por_id  uuid NOT NULL,   -- quien registró esta versión (director o subdirector)
    hora_desde         TIME(0)          NOT NULL,
    hora_hasta         TIME(0)          NOT NULL,
    minutos            integer GENERATED ALWAYS AS ((EXTRACT(EPOCH FROM (hora_hasta - hora_desde)) / 60)::integer) STORED,
    motivo             VARCHAR(30)      NOT NULL,
    observacion        varchar(1000)   NULL,
    descargo           varchar(1000)   NULL,       -- respuesta del docente
    descargo_en        timestamp(0)     NULL,
    anulada_en         timestamp(0)     NULL,       -- no se borra: se anula con motivo
    anulada_por_id     uuid NULL,
    motivo_anulacion   varchar(500)    NULL,
    registrado_en      timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en     timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_ausencias_sesion PRIMARY KEY (id),
    CONSTRAINT CK_ausencias_sesion_horas CHECK (hora_hasta > hora_desde),
    CONSTRAINT CK_ausencias_sesion_motivo CHECK (motivo IN ('fuera_del_aula','desayunando','servicios_higienicos','uso_celular','otro')),
    CONSTRAINT CK_ausencias_sesion_otro CHECK (motivo <> 'otro' OR observacion IS NOT NULL),
    CONSTRAINT CK_ausencias_sesion_descargo CHECK (descargo IS NULL OR descargo_en IS NOT NULL),
    CONSTRAINT CK_ausencias_sesion_version CHECK ((version = 1 AND ausencia_origen_id IS NULL) OR (version > 1 AND ausencia_origen_id IS NOT NULL AND motivo_cambio IS NOT NULL)),
    CONSTRAINT FK_ausencias_sesion_origen FOREIGN KEY (ausencia_origen_id) REFERENCES ausencias_sesion (id),
    CONSTRAINT CK_ausencias_sesion_anulacion CHECK (anulada_en IS NULL OR (anulada_por_id IS NOT NULL AND motivo_anulacion IS NOT NULL)),
    CONSTRAINT FK_ausencias_sesion_anulada_por FOREIGN KEY (anulada_por_id) REFERENCES usuarios (id),
    CONSTRAINT FK_ausencias_sesion_sesion        FOREIGN KEY (sesion_clase_id)   REFERENCES sesiones_clase (id) ON DELETE CASCADE,
    CONSTRAINT FK_ausencias_sesion_registrado_por FOREIGN KEY (registrado_por_id) REFERENCES usuarios (id)
);
CREATE INDEX IX_ausencias_sesion_sesion ON ausencias_sesion (sesion_clase_id) WHERE vigente = true;
-- Una sola versión vigente por ausencia
CREATE UNIQUE INDEX UX_ausencias_sesion_vigente ON ausencias_sesion (ausencia_origen_id) WHERE vigente = true AND ausencia_origen_id IS NOT NULL;
-- 7.5 EVIDENCIAS_AUSENCIA: fotos que sustentan cada tramo (puede haber varias).
--     Pertenecen a la versión de la ausencia; al crear una nueva versión se copian.
CREATE TABLE evidencias_ausencia (
    id           uuid NOT NULL DEFAULT gen_random_uuid(),
    ausencia_id  uuid NOT NULL,
    archivo_url  varchar(500)    NOT NULL,
    tomada_en    timestamp(0)     NULL,
    orden        smallint          NOT NULL DEFAULT 1,
    vigente      boolean              NOT NULL DEFAULT true,   -- 0 = foto retirada (baja lógica)
    creado_por_id uuid NULL,
    creado_en    timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_evidencias_ausencia PRIMARY KEY (id),
    CONSTRAINT FK_evidencias_ausencia_creado_por FOREIGN KEY (creado_por_id) REFERENCES usuarios (id),
    CONSTRAINT UQ_evidencias_ausencia_orden UNIQUE (ausencia_id, orden),
    CONSTRAINT FK_evidencias_ausencia_ausencia FOREIGN KEY (ausencia_id) REFERENCES ausencias_sesion (id) ON DELETE CASCADE
);
-- 7.6 CONSOLIDADOS_DOCENTE: resumen del bimestre por docente (informativo: total
--     de horas fuera de clase). El director decide con autonomía. Se puede reabrir:
--     cada cierre crea una versión nueva y la anterior queda con vigente = false.
--     Mientras está cerrado, las sesiones y ausencias del periodo no se editan.
CREATE TABLE consolidados_docente (
    id                       uuid NOT NULL DEFAULT gen_random_uuid(),
    docente_id               uuid NOT NULL,
    periodo_id               uuid NOT NULL,
    consolidado_origen_id    uuid NULL,   -- NULL en la versión 1
    version                  smallint          NOT NULL DEFAULT 1,
    vigente                  boolean              NOT NULL DEFAULT true,
    estado                   VARCHAR(20)      NOT NULL DEFAULT 'cerrado',
    sesiones_programadas     SMALLINT         NOT NULL,
    sesiones_cumplidas       SMALLINT         NOT NULL,
    sesiones_parciales       SMALLINT         NOT NULL DEFAULT 0,
    sesiones_no_cumplidas    SMALLINT         NOT NULL DEFAULT 0,
    sesiones_justificadas    SMALLINT         NOT NULL DEFAULT 0,
    minutos_perdidos_firma   INT              NOT NULL DEFAULT 0,   -- retrasos y salidas antes de tiempo (RF-011)
    total_ausencias          SMALLINT         NOT NULL DEFAULT 0,
    minutos_fuera_aula       INT              NOT NULL DEFAULT 0,   -- suma de ausencias vigentes (RF-012)
    decision                 VARCHAR(20)      NULL,
    observacion              varchar(1000)   NULL,
    motivo_cambio            varchar(500)    NULL,     -- obligatorio desde la versión 2
    generado_por_id          uuid NOT NULL,
    generado_en              timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    reabierto_por_id         uuid NULL,
    reabierto_en             timestamp(0)     NULL,
    CONSTRAINT PK_consolidados_docente PRIMARY KEY (id),
    CONSTRAINT CK_consolidados_docente_estado CHECK (estado IN ('cerrado','reabierto')),
    CONSTRAINT CK_consolidados_docente_sesiones CHECK (sesiones_programadas >= 0 AND sesiones_cumplidas + sesiones_parciales + sesiones_no_cumplidas + sesiones_justificadas <= sesiones_programadas),
    CONSTRAINT CK_consolidados_docente_minutos CHECK (minutos_perdidos_firma >= 0 AND total_ausencias >= 0 AND minutos_fuera_aula >= 0),
    CONSTRAINT CK_consolidados_docente_decision CHECK (decision IS NULL OR decision IN ('ninguna','llamada_atencion','compromiso_mejora','derivado')),
    CONSTRAINT CK_consolidados_docente_version CHECK ((version = 1 AND consolidado_origen_id IS NULL) OR (version > 1 AND consolidado_origen_id IS NOT NULL AND motivo_cambio IS NOT NULL)),
    CONSTRAINT CK_consolidados_docente_reapertura CHECK (estado = 'cerrado' OR (reabierto_por_id IS NOT NULL AND reabierto_en IS NOT NULL)),
    CONSTRAINT FK_consolidados_docente_docente      FOREIGN KEY (docente_id)            REFERENCES docentes (id),
    CONSTRAINT FK_consolidados_docente_periodo      FOREIGN KEY (periodo_id)            REFERENCES periodos_academicos (id),
    CONSTRAINT FK_consolidados_docente_origen       FOREIGN KEY (consolidado_origen_id) REFERENCES consolidados_docente (id),
    CONSTRAINT FK_consolidados_docente_generado_por FOREIGN KEY (generado_por_id)       REFERENCES usuarios (id),
    CONSTRAINT FK_consolidados_docente_reabierto_por FOREIGN KEY (reabierto_por_id)     REFERENCES usuarios (id)
);
-- Un solo consolidado vigente por docente y bimestre
CREATE UNIQUE INDEX UX_consolidados_docente_vigente ON consolidados_docente (docente_id, periodo_id) WHERE vigente = true;
-- 7.7 SOLICITUDES_REVISION_CONSOLIDADO: el docente pide un cambio en su consolidado;
--     el director la acepta (reabre y genera versión nueva) o la rechaza.
CREATE TABLE solicitudes_revision_consolidado (
    id               uuid NOT NULL DEFAULT gen_random_uuid(),
    consolidado_id   uuid NOT NULL,   -- versión sobre la que se solicita
    docente_id       uuid NOT NULL,
    motivo           varchar(1000)   NOT NULL,
    adjunto_url      varchar(500)    NULL,
    estado           VARCHAR(20)      NOT NULL DEFAULT 'solicitada',
    respuesta        varchar(1000)   NULL,
    resuelta_por_id  uuid NULL,
    resuelta_en      timestamp(0)     NULL,
    creado_en        timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_solicitudes_revision_consolidado PRIMARY KEY (id),
    CONSTRAINT CK_solicitudes_revision_estado CHECK (estado IN ('solicitada','aceptada','rechazada')),
    CONSTRAINT CK_solicitudes_revision_resuelta CHECK (estado = 'solicitada' OR (respuesta IS NOT NULL AND resuelta_por_id IS NOT NULL AND resuelta_en IS NOT NULL)),
    CONSTRAINT FK_solicitudes_revision_consolidado FOREIGN KEY (consolidado_id)  REFERENCES consolidados_docente (id),
    CONSTRAINT FK_solicitudes_revision_docente     FOREIGN KEY (docente_id)      REFERENCES docentes (id),
    CONSTRAINT FK_solicitudes_revision_resuelta_por FOREIGN KEY (resuelta_por_id) REFERENCES usuarios (id)
);
-- Una sola solicitud abierta por consolidado
CREATE UNIQUE INDEX UX_solicitudes_revision_abierta ON solicitudes_revision_consolidado (consolidado_id) WHERE estado = 'solicitada';
/* ############################################################################
   MÓDULO 8: CONVIVENCIA Y COMUNICACIÓN
   ############################################################################ */

-- 8.1 INCIDENCIAS_CONDUCTA: méritos y faltas
CREATE TABLE incidencias_conducta (
    id                     uuid NOT NULL DEFAULT gen_random_uuid(),
    matricula_id           uuid NOT NULL,
    periodo_id             uuid NOT NULL,
    registrado_por_id      uuid NOT NULL,   -- usuario (docente, auxiliar, tutor)
    fecha                  DATE             NOT NULL,
    tipo                   VARCHAR(10)      NOT NULL,
    categoria              varchar(100)    NOT NULL,
    gravedad               VARCHAR(10)      NULL,
    descripcion            varchar(1000)   NOT NULL,
    lugar                  varchar(100)    NULL,
    medidas_tomadas        varchar(1000)   NULL,
    apoderado_notificado   boolean              NOT NULL DEFAULT false,
    fecha_notificacion     DATE             NULL,
    incidencia_origen_id   uuid NULL,   -- NULL en la versión 1; luego, id de la versión 1
    version                smallint          NOT NULL DEFAULT 1,
    vigente                boolean              NOT NULL DEFAULT true,  -- 0 = versión reemplazada (baja lógica)
    motivo_cambio          varchar(500)    NULL,
    anulada_en             timestamp(0)     NULL,
    anulada_por_id         uuid NULL,
    motivo_anulacion       varchar(500)    NULL,
    creado_en              timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en         timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_incidencias_conducta PRIMARY KEY (id),
    CONSTRAINT CK_incidencias_tipo CHECK (tipo IN ('merito','falta')),
    CONSTRAINT CK_incidencias_gravedad CHECK ((tipo = 'merito' AND gravedad IS NULL) OR (tipo = 'falta' AND gravedad IN ('leve','grave','muy_grave'))),
    CONSTRAINT CK_incidencias_notificacion CHECK (apoderado_notificado = false OR fecha_notificacion IS NOT NULL),
    CONSTRAINT CK_incidencias_version CHECK ((version = 1 AND incidencia_origen_id IS NULL) OR (version > 1 AND incidencia_origen_id IS NOT NULL AND motivo_cambio IS NOT NULL)),
    CONSTRAINT CK_incidencias_anulacion CHECK (anulada_en IS NULL OR (anulada_por_id IS NOT NULL AND motivo_anulacion IS NOT NULL)),
    CONSTRAINT FK_incidencias_origen         FOREIGN KEY (incidencia_origen_id) REFERENCES incidencias_conducta (id),
    CONSTRAINT FK_incidencias_anulada_por    FOREIGN KEY (anulada_por_id)    REFERENCES usuarios (id),
    CONSTRAINT FK_incidencias_matricula      FOREIGN KEY (matricula_id)      REFERENCES matriculas (id),
    CONSTRAINT FK_incidencias_periodo        FOREIGN KEY (periodo_id)        REFERENCES periodos_academicos (id),
    CONSTRAINT FK_incidencias_registrado_por FOREIGN KEY (registrado_por_id) REFERENCES usuarios (id)
);
CREATE INDEX IX_incidencias_matricula_fecha ON incidencias_conducta (matricula_id, fecha);
-- 8.2 OBSERVACIONES_ESTUDIANTE: seguimiento tutorial / psicopedagógico
CREATE TABLE observaciones_estudiante (
    id                 uuid NOT NULL DEFAULT gen_random_uuid(),
    matricula_id       uuid NOT NULL,
    registrado_por_id  uuid NOT NULL,
    fecha              DATE             NOT NULL,
    tipo               VARCHAR(20)      NOT NULL,
    observacion        varchar(2000)   NOT NULL,
    seguimiento        varchar(2000)   NULL,
    derivado_a         varchar(100)    NULL,   -- psicología, DEMUNA, centro de salud...
    es_confidencial    boolean              NOT NULL DEFAULT false,   -- solo autor, tutor, apoderados y Director
    observacion_origen_id  uuid NULL,   -- NULL en la versión 1; luego, id de la versión 1
    version                smallint          NOT NULL DEFAULT 1,
    vigente                boolean              NOT NULL DEFAULT true,  -- 0 = versión reemplazada (baja lógica)
    motivo_cambio          varchar(500)    NULL,
    anulada_en             timestamp(0)     NULL,
    anulada_por_id         uuid NULL,
    motivo_anulacion       varchar(500)    NULL,
    creado_en          timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en     timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_observaciones_estudiante PRIMARY KEY (id),
    CONSTRAINT CK_observaciones_tipo CHECK (tipo IN ('academica','conductual','socioemocional','salud','familiar')),
    CONSTRAINT CK_observaciones_version CHECK ((version = 1 AND observacion_origen_id IS NULL) OR (version > 1 AND observacion_origen_id IS NOT NULL AND motivo_cambio IS NOT NULL)),
    CONSTRAINT CK_observaciones_anulacion CHECK (anulada_en IS NULL OR (anulada_por_id IS NOT NULL AND motivo_anulacion IS NOT NULL)),
    CONSTRAINT FK_observaciones_origen         FOREIGN KEY (observacion_origen_id) REFERENCES observaciones_estudiante (id),
    CONSTRAINT FK_observaciones_anulada_por    FOREIGN KEY (anulada_por_id)    REFERENCES usuarios (id),
    CONSTRAINT FK_observaciones_matricula      FOREIGN KEY (matricula_id)      REFERENCES matriculas (id),
    CONSTRAINT FK_observaciones_registrado_por FOREIGN KEY (registrado_por_id) REFERENCES usuarios (id)
);
CREATE INDEX IX_observaciones_matricula_fecha ON observaciones_estudiante (matricula_id, fecha);
-- 8.3 COMUNICADOS: anuncios a toda la comunidad, un grado o una sección
CREATE TABLE comunicados (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    autor_id        uuid NOT NULL,
    titulo          varchar(150)    NOT NULL,
    contenido       text    NOT NULL,
    dirigido_a      VARCHAR(20)      NOT NULL,   -- público
    grado_id        uuid NULL,       -- alcance: NULL = todo el colegio
    seccion_id      uuid NULL,
    prioridad       VARCHAR(10)      NOT NULL DEFAULT 'normal',
    estado          VARCHAR(20)      NOT NULL DEFAULT 'borrador',
    adjunto_url     varchar(255)    NULL,
    publicado_en    timestamp(0)     NULL,
    vence_en        timestamp(0)     NULL,
    creado_en       timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en  timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_comunicados PRIMARY KEY (id),
    CONSTRAINT CK_comunicados_dirigido CHECK (dirigido_a IN ('todos','docentes','estudiantes','apoderados')),
    CONSTRAINT CK_comunicados_prioridad CHECK (prioridad IN ('normal','importante','urgente')),
    CONSTRAINT CK_comunicados_estado CHECK (estado IN ('borrador','publicado','archivado')),
    CONSTRAINT CK_comunicados_publicado CHECK (estado = 'borrador' OR publicado_en IS NOT NULL),
    CONSTRAINT CK_comunicados_vence CHECK (vence_en IS NULL OR publicado_en IS NULL OR vence_en > publicado_en),
    CONSTRAINT FK_comunicados_autor   FOREIGN KEY (autor_id)   REFERENCES usuarios (id),
    CONSTRAINT FK_comunicados_grado   FOREIGN KEY (grado_id)   REFERENCES grados (id),
    CONSTRAINT FK_comunicados_seccion FOREIGN KEY (seccion_id) REFERENCES secciones (id)
);
CREATE INDEX IX_comunicados_estado_fecha ON comunicados (estado, publicado_en);
-- 8.4 NOTIFICACIONES: avisos personales a cada usuario (bandeja)
CREATE TABLE notificaciones (
    id           uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id   uuid NOT NULL,
    titulo       varchar(150)    NOT NULL,
    mensaje      varchar(500)    NOT NULL,
    tipo         VARCHAR(20)      NOT NULL DEFAULT 'informacion',
    enlace_url       varchar(255)    NULL,
    comunicado_id    uuid NULL,   -- si avisa de un comunicado (control de lectura)
    sesion_clase_id  uuid NULL,   -- si avisa de una sesión (ej. ausencia registrada)
    leida        boolean              NOT NULL DEFAULT false,
    leida_en     timestamp(0)     NULL,
    creado_en    timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_notificaciones PRIMARY KEY (id),
    CONSTRAINT CK_notificaciones_tipo CHECK (tipo IN ('informacion','alerta','recordatorio')),
    CONSTRAINT CK_notificaciones_leida CHECK (leida = false OR leida_en IS NOT NULL),
    CONSTRAINT FK_notificaciones_usuario    FOREIGN KEY (usuario_id)      REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT FK_notificaciones_comunicado FOREIGN KEY (comunicado_id)   REFERENCES comunicados (id),
    CONSTRAINT FK_notificaciones_sesion     FOREIGN KEY (sesion_clase_id) REFERENCES sesiones_clase (id)
);
CREATE INDEX IX_notificaciones_usuario_no_leidas ON notificaciones (usuario_id, creado_en) WHERE leida = false;
CREATE INDEX IX_notificaciones_comunicado ON notificaciones (comunicado_id) WHERE comunicado_id IS NOT NULL;
/* ############################################################################
   MÓDULO 9: AULA VIRTUAL (reforzamiento de lo enseñado en el aula)
   ############################################################################ */

-- 9.1 UNIDADES_APRENDIZAJE: organización del curso en el aula virtual
CREATE TABLE unidades_aprendizaje (
    id                uuid NOT NULL DEFAULT gen_random_uuid(),
    curso_seccion_id  uuid NOT NULL,
    periodo_id        uuid NULL,
    titulo            varchar(150)    NOT NULL,
    descripcion       varchar(1000)   NULL,
    orden             smallint          NOT NULL DEFAULT 1,
    fecha_inicio      DATE             NULL,
    fecha_fin         DATE             NULL,
    publicada         boolean              NOT NULL DEFAULT false,
    creado_en         timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en    timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_unidades_aprendizaje PRIMARY KEY (id),
    CONSTRAINT CK_unidades_fechas CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio),
    CONSTRAINT FK_unidades_curso_seccion FOREIGN KEY (curso_seccion_id) REFERENCES cursos_seccion (id),
    CONSTRAINT FK_unidades_periodo       FOREIGN KEY (periodo_id)       REFERENCES periodos_academicos (id)
);
CREATE INDEX IX_unidades_curso_seccion ON unidades_aprendizaje (curso_seccion_id, orden);
-- 9.2 MATERIALES: recursos de reforzamiento del docente (indicador IGM).
--     Planificado (planificado = true): se registra en la ventana de planificación
--     del bimestre con su fecha programada; al cerrar la ventana la fecha queda
--     congelada y solo cambia por solicitud aprobada (materiales_cambios_fecha).
--     Extra (planificado = false): se publica sin plan y no cuenta en el IGM.
--     IGM = planificados publicados hasta su fecha programada / planificados x 100
CREATE TABLE materiales (
    id                  uuid NOT NULL DEFAULT gen_random_uuid(),
    unidad_id           uuid NOT NULL,
    horario_id          uuid NULL,       -- bloque de clase que refuerza (al planificar)
    sesion_clase_id     uuid NULL,       -- sesión real; la enlaza el sistema al generarla
    publicado_por_id    uuid NOT NULL,   -- docente
    titulo              varchar(150)    NOT NULL,
    descripcion         varchar(1000)   NULL,
    tipo                VARCHAR(20)      NOT NULL,
    planificado         boolean              NOT NULL DEFAULT true,
    fecha_programada    DATE             NULL,       -- vigente; los cambios quedan en materiales_cambios_fecha
    fecha_congelada     boolean              NOT NULL DEFAULT false,
    url                 varchar(500)    NULL,       -- archivo o enlace; NULL mientras solo está planificado
    tamano_bytes        BIGINT           NULL,
    permite_descarga    boolean              NOT NULL DEFAULT true,
    visible             boolean              NOT NULL DEFAULT true,
    orden               smallint          NOT NULL DEFAULT 1,
    publicado_en        timestamp(0)     NULL,       -- publicación real
    vigente             boolean              NOT NULL DEFAULT true,  -- 0 = retirado (baja lógica)
    creado_en           timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en      timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_materiales PRIMARY KEY (id),
    CONSTRAINT CK_materiales_tipo CHECK (tipo IN ('documento','presentacion','hoja_calculo','imagen','video','audio','enlace','otro')),
    CONSTRAINT CK_materiales_planificado CHECK (planificado = false OR fecha_programada IS NOT NULL),
    CONSTRAINT CK_materiales_extra CHECK (planificado = true OR (publicado_en IS NOT NULL AND url IS NOT NULL)),
    CONSTRAINT CK_materiales_publicado CHECK (publicado_en IS NULL OR url IS NOT NULL),
    CONSTRAINT CK_materiales_tamano CHECK (tamano_bytes IS NULL OR tamano_bytes <= 52428800),   -- 50 MB
    CONSTRAINT FK_materiales_unidad        FOREIGN KEY (unidad_id)        REFERENCES unidades_aprendizaje (id),
    CONSTRAINT FK_materiales_horario       FOREIGN KEY (horario_id)       REFERENCES horarios (id),
    CONSTRAINT FK_materiales_sesion_clase  FOREIGN KEY (sesion_clase_id)  REFERENCES sesiones_clase (id),
    CONSTRAINT FK_materiales_publicado_por FOREIGN KEY (publicado_por_id) REFERENCES docentes (id)
);
CREATE INDEX IX_materiales_unidad ON materiales (unidad_id, orden);
CREATE INDEX IX_materiales_igm ON materiales (fecha_programada) WHERE planificado = true AND vigente = true;
-- 9.3 MATERIALES_CAMBIOS_FECHA: solicitudes de cambio de fecha programada de un
--     material congelado. Al aprobarse, materiales.fecha_programada toma la nueva
--     fecha; la anterior queda registrada aquí (historial, nada se borra).
CREATE TABLE materiales_cambios_fecha (
    id                 uuid NOT NULL DEFAULT gen_random_uuid(),
    material_id        uuid NOT NULL,
    fecha_anterior     DATE             NOT NULL,
    fecha_nueva        DATE             NOT NULL,
    motivo             varchar(500)    NOT NULL,
    estado             VARCHAR(20)      NOT NULL DEFAULT 'solicitada',
    respuesta          varchar(500)    NULL,
    solicitado_por_id  uuid NOT NULL,
    solicitado_en      timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    resuelto_por_id    uuid NULL,
    resuelto_en        timestamp(0)     NULL,
    CONSTRAINT PK_materiales_cambios_fecha PRIMARY KEY (id),
    CONSTRAINT CK_materiales_cambios_estado CHECK (estado IN ('solicitada','aprobada','rechazada')),
    CONSTRAINT CK_materiales_cambios_fechas CHECK (fecha_nueva <> fecha_anterior),
    CONSTRAINT CK_materiales_cambios_resuelto CHECK (estado = 'solicitada' OR (resuelto_por_id IS NOT NULL AND resuelto_en IS NOT NULL)),
    CONSTRAINT FK_materiales_cambios_material      FOREIGN KEY (material_id)       REFERENCES materiales (id) ON DELETE CASCADE,
    CONSTRAINT FK_materiales_cambios_solicitado_por FOREIGN KEY (solicitado_por_id) REFERENCES usuarios (id),
    CONSTRAINT FK_materiales_cambios_resuelto_por  FOREIGN KEY (resuelto_por_id)   REFERENCES usuarios (id)
);
-- Una sola solicitud abierta por material
CREATE UNIQUE INDEX UX_materiales_cambios_abierta ON materiales_cambios_fecha (material_id) WHERE estado = 'solicitada';
-- 9.4 TAREAS: tipos configurables (inspirado en Google Classroom).
--     trabajo / proyecto  : una entrega editable hasta la fecha límite; calificación manual.
--     cuestionario / examen: preguntas con intentos configurables; calificación automática
--                            si todas las preguntas son cerradas; si hay abiertas, manual.
--     Nota numérica 0-20; la conversión a literal (AD/A/B/C) solo al exportar (escalas_calificacion).
CREATE TABLE tareas (
    id                       uuid NOT NULL DEFAULT gen_random_uuid(),
    curso_seccion_id         uuid NOT NULL,
    unidad_id                uuid NULL,
    sesion_clase_id          uuid NULL,   -- clase que refuerza (opcional)
    titulo                   varchar(150)    NOT NULL,
    instrucciones            text    NULL,
    tipo                     VARCHAR(20)      NOT NULL,
    puntaje_maximo           DECIMAL(4,2)     NOT NULL DEFAULT 20,
    publicada_en             timestamp(0)     NULL,
    fecha_limite             timestamp(0)     NOT NULL,
    permite_entrega_tardia   boolean              NOT NULL DEFAULT false,   -- por defecto no; lo cambia el docente
    intentos_maximos         smallint          NOT NULL DEFAULT 1,
    nota_por_intentos        VARCHAR(20)      NOT NULL DEFAULT 'mas_alta',
    mostrar_resultados       VARCHAR(30)      NOT NULL DEFAULT 'al_terminar_intentos',
    tiempo_limite_min        SMALLINT         NULL,     -- solo cuestionario / examen
    tipos_archivo            VARCHAR(100)     NULL,   -- ej. pdf,docx,jpg
    estado                   VARCHAR(20)      NOT NULL DEFAULT 'borrador',
    creado_en                timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en           timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_tareas PRIMARY KEY (id),
    CONSTRAINT CK_tareas_tipo CHECK (tipo IN ('trabajo','proyecto','cuestionario','examen')),
    CONSTRAINT CK_tareas_intentos_tipo CHECK (tipo IN ('cuestionario','examen') OR intentos_maximos = 1),
    CONSTRAINT CK_tareas_nota_intentos CHECK (nota_por_intentos IN ('mas_alta','ultima','promedio')),
    CONSTRAINT CK_tareas_mostrar CHECK (mostrar_resultados IN ('inmediato','al_terminar_intentos','despues_fecha_limite','nunca')),
    CONSTRAINT CK_tareas_tiempo CHECK (tiempo_limite_min IS NULL OR (tiempo_limite_min > 0 AND tipo IN ('cuestionario','examen'))),
    CONSTRAINT CK_tareas_estado CHECK (estado IN ('borrador','publicada','cerrada')),
    CONSTRAINT CK_tareas_puntaje CHECK (puntaje_maximo > 0 AND puntaje_maximo <= 20),
    CONSTRAINT CK_tareas_intentos CHECK (intentos_maximos BETWEEN 1 AND 10),
    CONSTRAINT CK_tareas_publicada CHECK (estado = 'borrador' OR publicada_en IS NOT NULL),
    CONSTRAINT CK_tareas_fechas CHECK (publicada_en IS NULL OR fecha_limite > publicada_en),
    CONSTRAINT FK_tareas_curso_seccion FOREIGN KEY (curso_seccion_id) REFERENCES cursos_seccion (id),
    CONSTRAINT FK_tareas_unidad        FOREIGN KEY (unidad_id)        REFERENCES unidades_aprendizaje (id),
    CONSTRAINT FK_tareas_sesion_clase  FOREIGN KEY (sesion_clase_id)  REFERENCES sesiones_clase (id)
);
CREATE INDEX IX_tareas_curso_seccion_limite ON tareas (curso_seccion_id, fecha_limite);
-- 9.5 PREGUNTAS_TAREA (solo cuestionario / examen). respuesta_corta = abierta: la califica el docente
CREATE TABLE preguntas_tarea (
    id          uuid NOT NULL DEFAULT gen_random_uuid(),
    tarea_id    uuid NOT NULL,
    enunciado   varchar(1000)   NOT NULL,
    tipo        VARCHAR(20)      NOT NULL,
    puntaje     DECIMAL(4,2)     NOT NULL DEFAULT 1,
    orden       smallint          NOT NULL,
    CONSTRAINT PK_preguntas_tarea PRIMARY KEY (id),
    CONSTRAINT UQ_preguntas_tarea_orden UNIQUE (tarea_id, orden),
    CONSTRAINT CK_preguntas_tarea_tipo CHECK (tipo IN ('opcion_unica','opcion_multiple','respuesta_corta')),
    CONSTRAINT CK_preguntas_tarea_puntaje CHECK (puntaje > 0),
    CONSTRAINT FK_preguntas_tarea_tarea FOREIGN KEY (tarea_id) REFERENCES tareas (id) ON DELETE CASCADE
);
-- 9.6 OPCIONES_PREGUNTA
CREATE TABLE opciones_pregunta (
    id           uuid NOT NULL DEFAULT gen_random_uuid(),
    pregunta_id  uuid NOT NULL,
    texto        varchar(255)    NOT NULL,
    es_correcta  boolean              NOT NULL DEFAULT false,
    orden        smallint          NOT NULL,
    CONSTRAINT PK_opciones_pregunta PRIMARY KEY (id),
    CONSTRAINT UQ_opciones_pregunta_orden UNIQUE (pregunta_id, orden),
    CONSTRAINT FK_opciones_pregunta_pregunta FOREIGN KEY (pregunta_id) REFERENCES preguntas_tarea (id) ON DELETE CASCADE
);
-- 9.7 ENTREGAS_TAREA: la nota del aula virtual (única nota que genera el sistema)
CREATE TABLE entregas_tarea (
    id                  uuid NOT NULL DEFAULT gen_random_uuid(),
    tarea_id            uuid NOT NULL,
    matricula_id        uuid NOT NULL,
    intento             smallint          NOT NULL DEFAULT 1,
    entregada_en        timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    texto               text    NULL,
    archivo_url         varchar(500)    NULL,
    enlace_url          varchar(500)    NULL,
    respuestas          jsonb    NULL,   -- JSON: respuestas del cuestionario
    es_tardia           boolean              NOT NULL DEFAULT false,
    estado              VARCHAR(20)      NOT NULL DEFAULT 'entregada',
    nota                DECIMAL(4,2)     NULL,
    calificacion        VARCHAR(20)      NULL,      -- automatica / manual
    retroalimentacion   varchar(2000)   NULL,
    calificada_por_id   uuid NULL,
    calificada_en       timestamp(0)     NULL,
    CONSTRAINT PK_entregas_tarea PRIMARY KEY (id),
    CONSTRAINT UQ_entregas_tarea_intento UNIQUE (tarea_id, matricula_id, intento),
    CONSTRAINT CK_entregas_tarea_estado CHECK (estado IN ('entregada','calificada','devuelta')),
    CONSTRAINT CK_entregas_tarea_contenido CHECK (texto IS NOT NULL OR archivo_url IS NOT NULL OR enlace_url IS NOT NULL OR respuestas IS NOT NULL),
    CONSTRAINT CK_entregas_tarea_nota CHECK (nota IS NULL OR nota BETWEEN 0 AND 20),
    CONSTRAINT CK_entregas_tarea_calificada CHECK (estado <> 'calificada' OR (nota IS NOT NULL AND calificada_en IS NOT NULL AND calificacion IS NOT NULL)),
    CONSTRAINT CK_entregas_tarea_tipo_calif CHECK (calificacion IS NULL OR calificacion IN ('automatica','manual')),
    CONSTRAINT CK_entregas_tarea_manual CHECK (calificacion <> 'manual' OR calificada_por_id IS NOT NULL),
    CONSTRAINT FK_entregas_tarea_tarea         FOREIGN KEY (tarea_id)          REFERENCES tareas (id),
    CONSTRAINT FK_entregas_tarea_matricula     FOREIGN KEY (matricula_id)      REFERENCES matriculas (id),
    CONSTRAINT FK_entregas_tarea_calificada_por FOREIGN KEY (calificada_por_id) REFERENCES usuarios (id)
);
CREATE INDEX IX_entregas_tarea_matricula ON entregas_tarea (matricula_id);
-- 9.8 PUBLICACIONES_AULA: muro del curso; publican docente y estudiantes
CREATE TABLE publicaciones_aula (
    id                uuid NOT NULL DEFAULT gen_random_uuid(),
    curso_seccion_id  uuid NOT NULL,
    autor_id          uuid NOT NULL,
    contenido         text    NOT NULL,
    adjunto_url       varchar(500)    NULL,
    fijada            boolean              NOT NULL DEFAULT false,   -- solo el docente fija
    vigente           boolean              NOT NULL DEFAULT true,   -- 0 = oculto por moderación (baja lógica)
    ocultado_por_id   uuid NULL,
    ocultado_en       timestamp(0)     NULL,
    motivo_ocultado   varchar(255)    NULL,
    creado_en         timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    actualizado_en    timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_publicaciones_aula PRIMARY KEY (id),
    CONSTRAINT CK_publicaciones_aula_oculta CHECK (vigente = true OR (ocultado_por_id IS NOT NULL AND ocultado_en IS NOT NULL)),
    CONSTRAINT FK_publicaciones_aula_ocultado_por FOREIGN KEY (ocultado_por_id) REFERENCES usuarios (id),
    CONSTRAINT FK_publicaciones_aula_curso_seccion FOREIGN KEY (curso_seccion_id) REFERENCES cursos_seccion (id),
    CONSTRAINT FK_publicaciones_aula_autor         FOREIGN KEY (autor_id)         REFERENCES usuarios (id)
);
CREATE INDEX IX_publicaciones_aula_curso_fecha ON publicaciones_aula (curso_seccion_id, creado_en);
-- 9.9 COMENTARIOS_PUBLICACION
CREATE TABLE comentarios_publicacion (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    publicacion_id  uuid NOT NULL,
    autor_id        uuid NOT NULL,
    contenido       varchar(1000)   NOT NULL,
    vigente         boolean              NOT NULL DEFAULT true,   -- 0 = oculto por moderación (baja lógica)
    ocultado_por_id uuid NULL,
    ocultado_en     timestamp(0)     NULL,
    motivo_ocultado varchar(255)    NULL,
    creado_en       timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_comentarios_publicacion PRIMARY KEY (id),
    CONSTRAINT CK_comentarios_publicacion_oculto CHECK (vigente = true OR (ocultado_por_id IS NOT NULL AND ocultado_en IS NOT NULL)),
    CONSTRAINT FK_comentarios_publicacion_ocultado_por FOREIGN KEY (ocultado_por_id) REFERENCES usuarios (id),
    CONSTRAINT FK_comentarios_publicacion_publicacion FOREIGN KEY (publicacion_id) REFERENCES publicaciones_aula (id) ON DELETE CASCADE,
    CONSTRAINT FK_comentarios_publicacion_autor       FOREIGN KEY (autor_id)       REFERENCES usuarios (id)
);
CREATE INDEX IX_comentarios_publicacion ON comentarios_publicacion (publicacion_id, creado_en);
-- 9.10 MENSAJES_CHAT: un chat grupal por curso y sección (docente y estudiantes
--      matriculados). Sin mensajes privados.
CREATE TABLE mensajes_chat (
    id                uuid NOT NULL DEFAULT gen_random_uuid(),
    curso_seccion_id  uuid NOT NULL,
    emisor_id         uuid NOT NULL,
    contenido         varchar(2000)   NOT NULL,
    adjunto_url       varchar(500)    NULL,
    enviado_en        timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    vigente           boolean              NOT NULL DEFAULT true,   -- 0 = oculto por moderación (baja lógica)
    ocultado_por_id   uuid NULL,
    ocultado_en       timestamp(0)     NULL,
    motivo_ocultado   varchar(255)    NULL,
    CONSTRAINT PK_mensajes_chat PRIMARY KEY (id),
    CONSTRAINT CK_mensajes_chat_oculto CHECK (vigente = true OR (ocultado_por_id IS NOT NULL AND ocultado_en IS NOT NULL)),
    CONSTRAINT FK_mensajes_chat_ocultado_por FOREIGN KEY (ocultado_por_id) REFERENCES usuarios (id),
    CONSTRAINT FK_mensajes_chat_curso_seccion FOREIGN KEY (curso_seccion_id) REFERENCES cursos_seccion (id),
    CONSTRAINT FK_mensajes_chat_emisor        FOREIGN KEY (emisor_id)        REFERENCES usuarios (id)
);
CREATE INDEX IX_mensajes_chat_curso_fecha ON mensajes_chat (curso_seccion_id, enviado_en);
-- 9.11 ACTIVIDAD_AULA: seguimiento de lo que revisa cada estudiante
CREATE TABLE actividad_aula (
    id             bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    matricula_id   uuid     NOT NULL,
    material_id    uuid     NULL,
    tarea_id       uuid     NULL,
    accion         VARCHAR(20)          NOT NULL,
    registrado_en  timestamp(0)         NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_actividad_aula PRIMARY KEY (id),
    CONSTRAINT CK_actividad_aula_accion CHECK (accion IN ('visualizo','descargo','completo')),
    -- el registro es sobre un material o sobre una tarea (exactamente uno)
    CONSTRAINT CK_actividad_aula_recurso CHECK ((material_id IS NOT NULL AND tarea_id IS NULL) OR (material_id IS NULL AND tarea_id IS NOT NULL)),
    CONSTRAINT FK_actividad_aula_matricula FOREIGN KEY (matricula_id) REFERENCES matriculas (id),
    CONSTRAINT FK_actividad_aula_material  FOREIGN KEY (material_id)  REFERENCES materiales (id),
    CONSTRAINT FK_actividad_aula_tarea     FOREIGN KEY (tarea_id)     REFERENCES tareas (id)
);
CREATE INDEX IX_actividad_aula_matricula ON actividad_aula (matricula_id, registrado_en);
/* ############################################################################
   MÓDULO 10: INDICADORES DE LA TESIS
   ############################################################################ */

-- 10.1 MEDICIONES_INDICADOR: valores congelados de ISA, CSP e IGM para la tesis.
--      pretest : registrado a mano (antes del sistema), con su fuente.
--      postest : calculado por el sistema y congelado al cerrar la medición.
--      Una corrección crea una versión nueva; la anterior queda con vigente = false.
--      CSP = (cumplidas + parciales) / (planificadas - justificadas) x 100
--      ISA = libretas a tiempo / libretas programadas x 100
--      IGM = materiales planificados a tiempo / materiales planificados x 100
CREATE TABLE mediciones_indicador (
    id                   uuid NOT NULL DEFAULT gen_random_uuid(),
    indicador            VARCHAR(5)       NOT NULL,
    tipo                 VARCHAR(10)      NOT NULL,
    origen               VARCHAR(10)      NOT NULL,
    periodo_id           uuid NULL,       -- bimestre medido (postest)
    descripcion_periodo  varchar(100)    NOT NULL,   -- ej. "I Bimestre 2026 (antes del sistema)"
    fecha_desde          DATE             NOT NULL,
    fecha_hasta          DATE             NOT NULL,
    seccion_id           uuid NULL,       -- NULL = todo el colegio
    docente_id           uuid NULL,       -- NULL = todos los docentes
    numerador            INT              NOT NULL,
    denominador          INT              NOT NULL,
    valor                numeric(5,2) GENERATED ALWAYS AS (CASE WHEN denominador = 0 THEN NULL ELSE round(100.0 * numerador / denominador, 2) END) STORED,
    detalle              jsonb    NULL,       -- JSON con el desglose (cumplidas, parciales, ...)
    fuente               varchar(255)    NULL,       -- obligatorio en pretest (ej. "Hojas físicas de firma")
    medicion_origen_id   uuid NULL,
    version              smallint          NOT NULL DEFAULT 1,
    vigente              boolean              NOT NULL DEFAULT true,
    motivo_cambio        varchar(500)    NULL,
    registrado_por_id    uuid NOT NULL,
    registrado_en        timestamp(0)     NOT NULL DEFAULT LOCALTIMESTAMP(0),
    CONSTRAINT PK_mediciones_indicador PRIMARY KEY (id),
    CONSTRAINT CK_mediciones_indicador CHECK (indicador IN ('ISA','CSP','IGM')),
    CONSTRAINT CK_mediciones_tipo CHECK (tipo IN ('pretest','postest')),
    CONSTRAINT CK_mediciones_origen CHECK ((tipo = 'pretest' AND origen = 'manual' AND fuente IS NOT NULL) OR (tipo = 'postest' AND origen = 'sistema')),
    CONSTRAINT CK_mediciones_valores CHECK (numerador >= 0 AND denominador >= 0 AND numerador <= denominador),
    CONSTRAINT CK_mediciones_fechas CHECK (fecha_hasta >= fecha_desde),
    CONSTRAINT CK_mediciones_version CHECK ((version = 1 AND medicion_origen_id IS NULL) OR (version > 1 AND medicion_origen_id IS NOT NULL AND motivo_cambio IS NOT NULL)),
    CONSTRAINT FK_mediciones_periodo        FOREIGN KEY (periodo_id)         REFERENCES periodos_academicos (id),
    CONSTRAINT FK_mediciones_seccion        FOREIGN KEY (seccion_id)         REFERENCES secciones (id),
    CONSTRAINT FK_mediciones_docente        FOREIGN KEY (docente_id)         REFERENCES docentes (id),
    CONSTRAINT FK_mediciones_origen         FOREIGN KEY (medicion_origen_id) REFERENCES mediciones_indicador (id),
    CONSTRAINT FK_mediciones_registrado_por FOREIGN KEY (registrado_por_id)  REFERENCES usuarios (id)
);
CREATE INDEX IX_mediciones_indicador ON mediciones_indicador (indicador, tipo, fecha_desde) WHERE vigente = true;
/* ############################################################################
   ACTUALIZADO_EN AUTOMÁTICO
   En PostgreSQL el DEFAULT solo aplica al insertar; este trigger mantiene
   actualizado_en en cada UPDATE de las tablas que tienen esa columna.
   ############################################################################ */
CREATE FUNCTION fn_actualizar_fecha() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.actualizado_en := LOCALTIMESTAMP(0);
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables tb
          ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
        WHERE c.table_schema = 'sga'
          AND c.column_name = 'actualizado_en'
          AND tb.table_type = 'BASE TABLE'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%1$s_actualizado_en BEFORE UPDATE ON sga.%1$I
             FOR EACH ROW EXECUTE FUNCTION sga.fn_actualizar_fecha()', t);
    END LOOP;
END;
$$;


/* ############################################################################
   DATOS INICIALES
   ############################################################################ */
INSERT INTO grados (numero, nombre) VALUES
    (1, '1.° de secundaria'), (2, '2.° de secundaria'), (3, '3.° de secundaria'),
    (4, '4.° de secundaria'), (5, '5.° de secundaria');

INSERT INTO variables_sistema (codigo, descripcion, modulo, tipo, valor, unidad, valor_minimo, valor_maximo) VALUES
    ('seguridad.intentos_fallidos_bloqueo', 'Intentos fallidos antes de bloquear la cuenta (RF-001)', 'seguridad', 'entero', '5', 'intentos', 1, 20),
    ('seguridad.vigencia_enlace_recuperacion_min', 'Vigencia del enlace de recuperación de contraseña (RF-001)', 'seguridad', 'entero', '30', 'minutos', 5, 1440),
    ('seguridad.inactividad_sesion_min', 'Minutos sin actividad para cerrar la sesión (RF-001)', 'seguridad', 'entero', '30', 'minutos', 5, 480),
    ('seguridad.longitud_minima_contrasena', 'Longitud mínima de la contraseña (RF-001)', 'seguridad', 'entero', '8', 'caracteres', 6, 32),
    ('auditoria.rango_maximo_consulta_dias', 'Rango máximo de una consulta de la bitácora (RF-003)', 'auditoria', 'entero', '31', 'días', 1, 366),
    ('jornada.minutos_hora_pedagogica', 'Duración de la hora pedagógica (RF-008, P-03)', 'organizacion', 'entero', '45', 'minutos', 30, 90),
    ('jornada.horas_pedagogicas_dia', 'Horas pedagógicas por día (RF-008, P-03)', 'organizacion', 'entero', '7', 'horas', 1, 12),
    ('sesion.minutos_antes_firma_ingreso', 'Minutos antes del inicio del bloque desde los que se puede firmar el ingreso (RF-011, P-05)', 'sesiones', 'entero', '15', 'minutos', 0, 60),
    ('sesion.tolerancia_ingreso_min', 'Tolerancia al firmar el ingreso antes de contar minutos perdidos (RF-011, P-06)', 'sesiones', 'entero', '15', 'minutos', 0, 60),
    ('sesion.tolerancia_salida_min', 'Tolerancia al firmar la salida antes de contar minutos perdidos (RF-011, P-06)', 'sesiones', 'entero', '15', 'minutos', 0, 60),
    ('sesion.salida_automatica_sin_firma', 'Al cierre del día, poner hora de salida automática a sesiones sin firma de salida (RF-011, P-08)', 'sesiones', 'booleano', '1', NULL, NULL, NULL),
    ('ausencia.plazo_descargo_dias', 'Días calendario para presentar el descargo (RF-012, P-10)', 'supervision', 'entero', '7', 'días', 1, 30),
    ('ausencia.plazo_correccion_horas', 'Horas para corregir una ausencia registrada (RF-012)', 'supervision', 'entero', '24', 'horas', 1, 168),
    ('libreta.max_archivos_por_carga', 'Archivos por carga en bloque (RF-014)', 'libretas', 'entero', '50', 'archivos', 1, 200),
    ('libreta.tamano_maximo_mb', 'Tamaño máximo de cada PDF de libreta (RF-014)', 'libretas', 'entero', '5', 'MB', 1, 50),
    ('material.dias_planificacion', 'Días desde el inicio del bimestre para planificar materiales (RF-015, P-13)', 'aula_virtual', 'entero', '7', 'días', 1, 30),
    ('material.tamano_maximo_mb', 'Tamaño máximo de un material (RF-015)', 'aula_virtual', 'entero', '50', 'MB', 1, 500),
    ('nota.peso_examen', 'Peso del tipo examen en la nota final del aula virtual (RF-016, P-16)', 'aula_virtual', 'decimal', '25', '%', 0, 100),
    ('nota.peso_cuestionario', 'Peso del tipo cuestionario en la nota final (RF-016, P-16)', 'aula_virtual', 'decimal', '25', '%', 0, 100),
    ('nota.peso_trabajo', 'Peso del tipo trabajo en la nota final (RF-016, P-16)', 'aula_virtual', 'decimal', '25', '%', 0, 100),
    ('nota.peso_proyecto', 'Peso del tipo proyecto en la nota final (RF-016, P-16)', 'aula_virtual', 'decimal', '25', '%', 0, 100),
    ('aula.minutos_edicion_publicacion', 'Minutos para editar una publicación o comentario (RF-017)', 'aula_virtual', 'entero', '15', 'minutos', 0, 1440),
    ('conducta.plazo_correccion_horas', 'Horas para corregir una incidencia u observación (RF-018)', 'convivencia', 'entero', '24', 'horas', 1, 168);

INSERT INTO cursos (codigo, nombre, area_curricular) VALUES
    ('MAT',   'Matemática',                                   'matematica'),
    ('COM',   'Comunicación',                                 'comunicacion'),
    ('ING',   'Inglés',                                       'ingles'),
    ('ART',   'Arte y Cultura',                               'arte_cultura'),
    ('CCSS',  'Ciencias Sociales',                            'ciencias_sociales'),
    ('DPCC',  'Desarrollo Personal, Ciudadanía y Cívica',     'dpcc'),
    ('EF',    'Educación Física',                             'educacion_fisica'),
    ('REL',   'Educación Religiosa',                          'educacion_religiosa'),
    ('CYT',   'Ciencia y Tecnología',                         'ciencia_tecnologia'),
    ('EPT',   'Educación para el Trabajo',                    'ept'),
    ('TUT',   'Tutoría',                                      'tutoria'),
    ('TCOMP', 'Taller de Computación',                        'taller');

INSERT INTO roles (nombre, descripcion, es_sistema) VALUES
    ('Administrador', 'Acceso total al sistema', true),
    ('Director',      'Seguimiento docente, supervisión de sesiones y reportes', true),
    ('Subdirector',   'Panel en vivo de firmas de sesión y registro de ausencias docentes', true),
    ('Soporte TI',    'Equipos autorizados (kioskos y biométricos), cuentas y soporte técnico', true),
    ('Secretaria',    'Matrícula, estudiantes y apoderados', true),
    ('Docente',       'Sesiones de clase, libretas y aula virtual de sus cursos', true),
    ('Estudiante',    'Aula virtual, libretas y asistencia propias', true),
    ('Apoderado',     'Consulta de libretas, asistencia y comunicados de sus hijos', true);

INSERT INTO cargos (nombre, descripcion) VALUES
    ('Director(a)',               'Dirección del colegio'),
    ('Subdirector(a)',            'Subdirección y seguimiento de sesiones'),
    ('Coordinador(a) académico',  'Coordinación pedagógica'),
    ('Docente de aula',           'Docente que dicta cursos'),
    ('Auxiliar de educación',     'Apoyo en disciplina y asistencia'),
    ('Psicólogo(a)',              'Seguimiento socioemocional'),
    ('Secretario(a)',             'Matrícula y trámites'),
    ('Personal de TI',            'Soporte técnico y equipos');

-- Perfiles sugeridos por cargo (solo sugerencia)
INSERT INTO cargo_perfiles_sugeridos (cargo_id, rol_id)
SELECT c.id, r.id FROM cargos c JOIN roles r ON
     (c.nombre = 'Director(a)'              AND r.nombre = 'Director')
  OR (c.nombre = 'Subdirector(a)'           AND r.nombre = 'Subdirector')
  OR (c.nombre = 'Coordinador(a) académico' AND r.nombre = 'Subdirector')
  OR (c.nombre = 'Docente de aula'          AND r.nombre = 'Docente')
  OR (c.nombre = 'Secretario(a)'            AND r.nombre = 'Secretaria')
  OR (c.nombre = 'Personal de TI'           AND r.nombre = 'Soporte TI');

INSERT INTO modulos (codigo, nombre, orden) VALUES
    ('seguridad',           'Seguridad',             10),
    ('academico',           'Estructura académica',  20),
    ('matricula',           'Matrícula',             30),
    ('asistencia',          'Asistencia',            40),
    ('seguimiento-docente', 'Seguimiento docente',   50),
    ('libretas',            'Libretas',              60),
    ('aula-virtual',        'Aula virtual',          70),
    ('comunicacion',        'Comunicación',          80),
    ('configuracion',       'Configuración',         90);
COMMIT;

-- Verificación: debe devolver 58
SELECT count(*) AS total_tablas
FROM information_schema.tables
WHERE table_schema = 'sga' AND table_type = 'BASE TABLE';
