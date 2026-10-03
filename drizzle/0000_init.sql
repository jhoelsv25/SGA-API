/* ============================================================================
   0000_init - Esquema base SGA Colegio (48 tablas, 9 módulos)
   Origen: Tesis/02-Diseno-Base-Datos-PostgreSQL.sql v3.1, sin la sección
   0 (limpieza con DROP) ni BEGIN/COMMIT: drizzle-kit migrate ya ejecuta
   cada migración dentro de una transacción.
   ============================================================================ */


/* ############################################################################
   MÓDULO 1: SEGURIDAD
   ############################################################################ */

-- 1.1 PERSONAS: padrón único (docentes, estudiantes, apoderados y usuarios)
CREATE TABLE personas (
    id                UUID          NOT NULL DEFAULT gen_random_uuid(),
    tipo_documento    VARCHAR(20)   NOT NULL DEFAULT 'dni',
    numero_documento  VARCHAR(20)   NOT NULL,
    nombres           VARCHAR(100)  NOT NULL,
    apellido_paterno  VARCHAR(60)   NOT NULL,
    apellido_materno  VARCHAR(60)   NULL,
    fecha_nacimiento  DATE          NULL,
    sexo              CHAR(1)       NOT NULL,
    direccion         VARCHAR(255)  NULL,
    distrito          VARCHAR(100)  NULL,
    telefono          VARCHAR(20)   NULL,
    celular           VARCHAR(20)   NULL,
    correo            VARCHAR(100)  NULL,
    foto_url          VARCHAR(255)  NULL,
    creado_en         TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en    TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en      TIMESTAMP(0)  NULL,
    CONSTRAINT pk_personas PRIMARY KEY (id),
    CONSTRAINT ck_personas_tipo_documento CHECK (tipo_documento IN ('dni','carne_extranjeria','pasaporte','partida_nacimiento')),
    CONSTRAINT ck_personas_sexo CHECK (sexo IN ('M','F'))
);
CREATE UNIQUE INDEX ux_personas_documento ON personas (tipo_documento, numero_documento) WHERE eliminado_en IS NULL;
CREATE UNIQUE INDEX ux_personas_correo ON personas (correo) WHERE correo IS NOT NULL AND eliminado_en IS NULL;
CREATE INDEX ix_personas_apellidos ON personas (apellido_paterno, apellido_materno, nombres);

-- 1.2 ROLES
CREATE TABLE roles (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    nombre          VARCHAR(50)   NOT NULL,
    descripcion     VARCHAR(255)  NULL,
    es_sistema      BOOLEAN       NOT NULL DEFAULT FALSE,   -- no se puede eliminar
    activo          BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_roles PRIMARY KEY (id),
    CONSTRAINT uq_roles_nombre UNIQUE (nombre)
);

-- 1.3 MODULOS: grandes áreas del sistema (agrupan permisos y menús)
CREATE TABLE modulos (
    id         UUID          NOT NULL DEFAULT gen_random_uuid(),
    codigo     VARCHAR(30)   NOT NULL,   -- ej. seguimiento-docente
    nombre     VARCHAR(50)   NOT NULL,
    icono      VARCHAR(50)   NULL,
    orden      SMALLINT      NOT NULL,
    vigente    BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en  TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_modulos PRIMARY KEY (id),
    CONSTRAINT uq_modulos_codigo UNIQUE (codigo)
);

-- 1.4 PERMISOS (acciones del sistema agrupadas por módulo)
CREATE TABLE permisos (
    id           UUID          NOT NULL DEFAULT gen_random_uuid(),
    modulo_id    UUID          NOT NULL,
    codigo       VARCHAR(100)  NOT NULL,   -- ej. sesiones.registrar
    nombre       VARCHAR(100)  NOT NULL,
    descripcion  VARCHAR(255)  NULL,
    creado_en    TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_permisos PRIMARY KEY (id),
    CONSTRAINT uq_permisos_codigo UNIQUE (codigo),
    CONSTRAINT fk_permisos_modulo FOREIGN KEY (modulo_id) REFERENCES modulos (id)
);

-- 1.5 ROL_PERMISOS
CREATE TABLE rol_permisos (
    rol_id      UUID NOT NULL,
    permiso_id  UUID NOT NULL,
    CONSTRAINT pk_rol_permisos PRIMARY KEY (rol_id, permiso_id),
    CONSTRAINT fk_rol_permisos_rol     FOREIGN KEY (rol_id)     REFERENCES roles (id)    ON DELETE CASCADE,
    CONSTRAINT fk_rol_permisos_permiso FOREIGN KEY (permiso_id) REFERENCES permisos (id) ON DELETE CASCADE
);

-- 1.6 MENUS: contenedores (padre) y opciones (hijo) en la misma tabla.
--     Cada usuario ve las opciones cuyo permiso tiene su rol; un contenedor
--     se muestra si tiene al menos una opción visible.
CREATE TABLE menus (
    id             UUID          NOT NULL DEFAULT gen_random_uuid(),
    menu_padre_id  UUID          NULL,     -- NULL = contenedor raíz
    modulo_id      UUID          NOT NULL,
    permiso_id     UUID          NULL,     -- permiso requerido para ver la opción
    nombre         VARCHAR(100)  NOT NULL,
    ruta           VARCHAR(255)  NULL,
    icono          VARCHAR(50)   NULL,
    orden          SMALLINT      NOT NULL,
    es_contenedor  BOOLEAN       NOT NULL DEFAULT FALSE,
    vigente        BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en      TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_menus PRIMARY KEY (id),
    CONSTRAINT ck_menus_tipo CHECK (
        (es_contenedor AND ruta IS NULL AND menu_padre_id IS NULL) OR
        (NOT es_contenedor AND ruta IS NOT NULL AND menu_padre_id IS NOT NULL)),
    CONSTRAINT fk_menus_padre   FOREIGN KEY (menu_padre_id) REFERENCES menus (id),
    CONSTRAINT fk_menus_modulo  FOREIGN KEY (modulo_id)     REFERENCES modulos (id),
    CONSTRAINT fk_menus_permiso FOREIGN KEY (permiso_id)    REFERENCES permisos (id)
);
CREATE INDEX ix_menus_modulo_padre ON menus (modulo_id, menu_padre_id, orden);

-- 1.7 USUARIOS: toda cuenta pertenece a una persona
CREATE TABLE usuarios (
    id                       UUID          NOT NULL DEFAULT gen_random_uuid(),
    persona_id               UUID          NOT NULL,
    rol_id                   UUID          NOT NULL,
    nombre_usuario           VARCHAR(50)   NOT NULL,
    contrasena_hash          VARCHAR(255)  NOT NULL,
    debe_cambiar_contrasena  BOOLEAN       NOT NULL DEFAULT TRUE,
    estado                   VARCHAR(20)   NOT NULL DEFAULT 'activo',
    intentos_fallidos        SMALLINT      NOT NULL DEFAULT 0,
    ultimo_acceso            TIMESTAMP(0)  NULL,
    creado_en                TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en           TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en             TIMESTAMP(0)  NULL,
    CONSTRAINT pk_usuarios PRIMARY KEY (id),
    CONSTRAINT ck_usuarios_estado CHECK (estado IN ('activo','bloqueado','inactivo')),
    CONSTRAINT ck_usuarios_intentos CHECK (intentos_fallidos >= 0),
    CONSTRAINT fk_usuarios_persona FOREIGN KEY (persona_id) REFERENCES personas (id),
    CONSTRAINT fk_usuarios_rol     FOREIGN KEY (rol_id)     REFERENCES roles (id)
);
CREATE UNIQUE INDEX ux_usuarios_nombre_usuario ON usuarios (nombre_usuario) WHERE eliminado_en IS NULL;
CREATE UNIQUE INDEX ux_usuarios_persona ON usuarios (persona_id) WHERE eliminado_en IS NULL;

-- 1.8 SESIONES: sesiones de inicio de sesión (permite ver y cerrar sesiones activas)
CREATE TABLE sesiones (
    id                UUID          NOT NULL DEFAULT gen_random_uuid(),
    usuario_id        UUID          NOT NULL,
    token_hash        VARCHAR(128)  NOT NULL,
    direccion_ip      VARCHAR(45)   NULL,
    navegador         VARCHAR(255)  NULL,
    iniciada_en       TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultima_actividad  TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_en         TIMESTAMP(0)  NOT NULL,
    cerrada_en        TIMESTAMP(0)  NULL,
    CONSTRAINT pk_sesiones PRIMARY KEY (id),
    CONSTRAINT uq_sesiones_token UNIQUE (token_hash),
    CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
);
CREATE INDEX ix_sesiones_usuario_activas ON sesiones (usuario_id, expira_en) WHERE cerrada_en IS NULL;

-- 1.9 BITACORA_AUDITORIA: registro inmutable de cambios (no se edita ni se borra)
CREATE TABLE bitacora_auditoria (
    id              BIGINT        GENERATED ALWAYS AS IDENTITY,
    usuario_id      UUID          NULL,   -- sin FK: el registro se conserva aunque el usuario desaparezca
    accion          VARCHAR(20)   NOT NULL,
    tabla           VARCHAR(100)  NOT NULL,
    registro_id     UUID          NULL,
    valor_anterior  JSONB         NULL,
    valor_nuevo     JSONB         NULL,
    direccion_ip    VARCHAR(45)   NULL,
    registrado_en   TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_bitacora_auditoria PRIMARY KEY (id),
    CONSTRAINT ck_bitacora_accion CHECK (accion IN ('crear','actualizar','eliminar','iniciar_sesion','cerrar_sesion'))
);
CREATE INDEX ix_bitacora_tabla_registro ON bitacora_auditoria (tabla, registro_id);
CREATE INDEX ix_bitacora_usuario_fecha ON bitacora_auditoria (usuario_id, registrado_en);


/* ############################################################################
   MÓDULO 2: INSTITUCIÓN
   ############################################################################ */

-- 2.1 INSTITUCION: datos del colegio (una sola fila)
CREATE TABLE institucion (
    id                UUID           NOT NULL DEFAULT gen_random_uuid(),
    fila_unica        BOOLEAN        NOT NULL DEFAULT TRUE,
    nombre            VARCHAR(150)   NOT NULL,
    codigo_modular    VARCHAR(20)    NOT NULL,
    codigo_local      VARCHAR(20)    NULL,
    tipo_gestion      VARCHAR(20)    NOT NULL,
    ugel              VARCHAR(100)   NULL,
    dre               VARCHAR(100)   NULL,
    director          VARCHAR(150)   NULL,
    direccion         VARCHAR(255)   NOT NULL,
    distrito          VARCHAR(100)   NULL,
    provincia         VARCHAR(100)   NULL,
    departamento      VARCHAR(100)   NULL,
    telefono          VARCHAR(20)    NULL,
    correo            VARCHAR(100)   NULL,
    logo_url          VARCHAR(255)   NULL,
    latitud           NUMERIC(10,7)  NULL,   -- geocerca para marcaciones
    longitud          NUMERIC(10,7)  NULL,
    radio_geocerca_m  INTEGER        NOT NULL DEFAULT 120,
    creado_en         TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en    TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_institucion PRIMARY KEY (id),
    CONSTRAINT uq_institucion_fila_unica UNIQUE (fila_unica),
    CONSTRAINT ck_institucion_fila_unica CHECK (fila_unica),
    CONSTRAINT ck_institucion_tipo_gestion CHECK (tipo_gestion IN ('publica','privada','convenio')),
    CONSTRAINT ck_institucion_radio CHECK (radio_geocerca_m > 0)
);

-- 2.2 PARAMETROS_SISTEMA: configuración general clave-valor
CREATE TABLE parametros_sistema (
    clave           VARCHAR(100)  NOT NULL,
    valor           TEXT          NOT NULL,
    descripcion     VARCHAR(255)  NULL,
    actualizado_en  TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_parametros_sistema PRIMARY KEY (clave)
);

-- 2.3 TURNOS: un turno por tipo de persona (entrada, salida y tolerancia
--     para calcular tardanzas en las marcaciones)
CREATE TABLE turnos (
    id               UUID          NOT NULL DEFAULT gen_random_uuid(),
    aplica_a         VARCHAR(20)   NOT NULL,        -- quién marca con este turno
    hora_entrada     TIME(0)       NOT NULL,
    hora_salida      TIME(0)       NOT NULL,
    tolerancia_min   SMALLINT      NOT NULL DEFAULT 10,
    dias_laborables  VARCHAR(20)   NOT NULL DEFAULT '1,2,3,4,5',  -- 1 = lunes ... 7 = domingo
    activo           BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en        TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en   TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_turnos PRIMARY KEY (id),
    CONSTRAINT uq_turnos_aplica_a UNIQUE (aplica_a),
    CONSTRAINT ck_turnos_aplica_a CHECK (aplica_a IN ('estudiantes','docentes','administrativos')),
    CONSTRAINT ck_turnos_horas CHECK (hora_salida > hora_entrada),
    CONSTRAINT ck_turnos_tolerancia CHECK (tolerancia_min >= 0)
);


/* ############################################################################
   MÓDULO 3: ESTRUCTURA ACADÉMICA
   ############################################################################ */

-- 3.1 ANIOS_ACADEMICOS
CREATE TABLE anios_academicos (
    id                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    anio               SMALLINT      NOT NULL,
    nombre             VARCHAR(150)  NULL,    -- ej. "Año del Bicentenario..."
    fecha_inicio       DATE          NOT NULL,
    fecha_fin          DATE          NOT NULL,
    estado             VARCHAR(20)   NOT NULL DEFAULT 'planificado',
    reabierto_hasta    TIMESTAMP(0)  NULL,
    motivo_reapertura  VARCHAR(500)  NULL,
    creado_en          TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en     TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_anios_academicos PRIMARY KEY (id),
    CONSTRAINT uq_anios_academicos_anio UNIQUE (anio),
    CONSTRAINT ck_anios_academicos_estado CHECK (estado IN ('planificado','en_curso','cerrado','reabierto')),
    CONSTRAINT ck_anios_academicos_fechas CHECK (fecha_fin > fecha_inicio),
    CONSTRAINT ck_anios_academicos_reapertura CHECK (estado <> 'reabierto' OR (reabierto_hasta IS NOT NULL AND motivo_reapertura IS NOT NULL))
);
-- Solo un año puede estar en curso
CREATE UNIQUE INDEX ux_anios_academicos_en_curso ON anios_academicos (estado) WHERE estado = 'en_curso';

-- 3.2 PERIODOS_ACADEMICOS (bimestres o trimestres)
CREATE TABLE periodos_academicos (
    id                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    anio_academico_id  UUID          NOT NULL,
    numero             SMALLINT      NOT NULL,
    nombre             VARCHAR(50)   NOT NULL,   -- I Bimestre
    tipo               VARCHAR(20)   NOT NULL,
    fecha_inicio       DATE          NOT NULL,
    fecha_fin          DATE          NOT NULL,
    estado             VARCHAR(20)   NOT NULL DEFAULT 'planificado',
    creado_en          TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en     TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_periodos_academicos PRIMARY KEY (id),
    CONSTRAINT uq_periodos_academicos_numero UNIQUE (anio_academico_id, numero),
    CONSTRAINT ck_periodos_academicos_tipo CHECK (tipo IN ('bimestre','trimestre','semestre')),
    CONSTRAINT ck_periodos_academicos_estado CHECK (estado IN ('planificado','en_curso','cerrado')),
    CONSTRAINT ck_periodos_academicos_fechas CHECK (fecha_fin > fecha_inicio),
    CONSTRAINT fk_periodos_academicos_anio FOREIGN KEY (anio_academico_id) REFERENCES anios_academicos (id) ON DELETE CASCADE
);

-- 3.3 CALENDARIO_EVENTOS (feriados, suspensiones, reuniones, actividades)
CREATE TABLE calendario_eventos (
    id                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    anio_academico_id  UUID          NOT NULL,
    titulo             VARCHAR(150)  NOT NULL,
    descripcion        VARCHAR(500)  NULL,
    tipo               VARCHAR(30)   NOT NULL,
    fecha_inicio       DATE          NOT NULL,
    fecha_fin          DATE          NOT NULL,
    suspende_clases    BOOLEAN       NOT NULL DEFAULT FALSE,
    creado_por_id      UUID          NULL,
    creado_en          TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en     TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_calendario_eventos PRIMARY KEY (id),
    CONSTRAINT ck_calendario_eventos_tipo CHECK (tipo IN ('feriado','suspension','jornada_pedagogica','reunion','actividad','examen')),
    CONSTRAINT ck_calendario_eventos_fechas CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT fk_calendario_eventos_anio    FOREIGN KEY (anio_academico_id) REFERENCES anios_academicos (id),
    CONSTRAINT fk_calendario_eventos_usuario FOREIGN KEY (creado_por_id)     REFERENCES usuarios (id)
);
CREATE INDEX ix_calendario_eventos_fechas ON calendario_eventos (fecha_inicio, fecha_fin);

-- 3.4 GRADOS (secundaria: 1.° a 5.°)
CREATE TABLE grados (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    numero          SMALLINT      NOT NULL,
    nombre          VARCHAR(50)   NOT NULL,   -- 1.° de secundaria
    creado_en       TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en    TIMESTAMP(0)  NULL,
    CONSTRAINT pk_grados PRIMARY KEY (id),
    CONSTRAINT ck_grados_numero CHECK (numero BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX ux_grados_numero ON grados (numero) WHERE eliminado_en IS NULL;

-- 3.5 CURSOS (áreas curriculares y talleres)
CREATE TABLE cursos (
    id               UUID          NOT NULL DEFAULT gen_random_uuid(),
    codigo           VARCHAR(20)   NOT NULL,
    nombre           VARCHAR(100)  NOT NULL,
    area_curricular  VARCHAR(30)   NOT NULL,
    descripcion      VARCHAR(500)  NULL,
    color_hex        CHAR(7)       NULL,   -- #RRGGBB para horarios y aula virtual
    creado_en        TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en   TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en     TIMESTAMP(0)  NULL,
    CONSTRAINT pk_cursos PRIMARY KEY (id),
    CONSTRAINT ck_cursos_area CHECK (area_curricular IN (
        'matematica','comunicacion','ingles','arte_cultura','ciencias_sociales',
        'dpcc','educacion_fisica','educacion_religiosa','ciencia_tecnologia','ept','taller','tutoria')),
    CONSTRAINT ck_cursos_color CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9A-Fa-f]{6}$')
);
CREATE UNIQUE INDEX ux_cursos_codigo ON cursos (codigo) WHERE eliminado_en IS NULL;

-- 3.6 PLAN_ESTUDIOS: qué cursos lleva cada grado y cuántas horas
CREATE TABLE plan_estudios (
    id               UUID      NOT NULL DEFAULT gen_random_uuid(),
    grado_id         UUID      NOT NULL,
    curso_id         UUID      NOT NULL,
    horas_semanales  SMALLINT  NOT NULL,
    activo           BOOLEAN   NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_plan_estudios PRIMARY KEY (id),
    CONSTRAINT uq_plan_estudios_grado_curso UNIQUE (grado_id, curso_id),
    CONSTRAINT ck_plan_estudios_horas CHECK (horas_semanales > 0),
    CONSTRAINT fk_plan_estudios_grado FOREIGN KEY (grado_id) REFERENCES grados (id) ON DELETE CASCADE,
    CONSTRAINT fk_plan_estudios_curso FOREIGN KEY (curso_id) REFERENCES cursos (id) ON DELETE CASCADE
);


/* ############################################################################
   MÓDULO 4: COMUNIDAD EDUCATIVA
   ############################################################################ */

-- 4.1 DOCENTES
CREATE TABLE docentes (
    id                  UUID          NOT NULL DEFAULT gen_random_uuid(),
    persona_id          UUID          NOT NULL,
    codigo              VARCHAR(20)   NOT NULL,
    especialidad        VARCHAR(100)  NULL,
    titulo_profesional  VARCHAR(150)  NULL,
    tipo_contrato       VARCHAR(20)   NOT NULL,
    jornada_horas       SMALLINT      NOT NULL DEFAULT 30,
    fecha_ingreso       DATE          NOT NULL,
    fecha_cese          DATE          NULL,
    estado              VARCHAR(20)   NOT NULL DEFAULT 'activo',
    firma_url           VARCHAR(255)  NULL,   -- firma digital para sesiones de clase
    creado_en           TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en      TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en        TIMESTAMP(0)  NULL,
    CONSTRAINT pk_docentes PRIMARY KEY (id),
    CONSTRAINT ck_docentes_contrato CHECK (tipo_contrato IN ('nombrado','contratado','practicante')),
    CONSTRAINT ck_docentes_jornada CHECK (jornada_horas IN (20,24,30,40)),
    CONSTRAINT ck_docentes_estado CHECK (estado IN ('activo','licencia','cesado')),
    CONSTRAINT ck_docentes_fechas CHECK (fecha_cese IS NULL OR fecha_cese >= fecha_ingreso),
    CONSTRAINT fk_docentes_persona FOREIGN KEY (persona_id) REFERENCES personas (id)
);
CREATE UNIQUE INDEX ux_docentes_codigo ON docentes (codigo) WHERE eliminado_en IS NULL;
CREATE UNIQUE INDEX ux_docentes_persona ON docentes (persona_id) WHERE eliminado_en IS NULL;

-- 4.2 ESTUDIANTES
CREATE TABLE estudiantes (
    id                    UUID          NOT NULL DEFAULT gen_random_uuid(),
    persona_id            UUID          NOT NULL,
    codigo                VARCHAR(20)   NOT NULL,   -- código del estudiante (SIAGIE)
    fecha_ingreso         DATE          NOT NULL,
    lengua_materna        VARCHAR(50)   NULL,
    religion              VARCHAR(50)   NULL,
    tiene_discapacidad    BOOLEAN       NOT NULL DEFAULT FALSE,
    detalle_discapacidad  VARCHAR(255)  NULL,
    grupo_sanguineo       VARCHAR(5)    NULL,
    alergias              VARCHAR(255)  NULL,
    condiciones_medicas   VARCHAR(500)  NULL,
    seguro_salud          VARCHAR(100)  NULL,
    estado                VARCHAR(20)   NOT NULL DEFAULT 'activo',
    creado_en             TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en        TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en          TIMESTAMP(0)  NULL,
    CONSTRAINT pk_estudiantes PRIMARY KEY (id),
    CONSTRAINT ck_estudiantes_estado CHECK (estado IN ('activo','retirado','trasladado','egresado')),
    CONSTRAINT ck_estudiantes_discapacidad CHECK (tiene_discapacidad OR detalle_discapacidad IS NULL),
    CONSTRAINT fk_estudiantes_persona FOREIGN KEY (persona_id) REFERENCES personas (id)
);
CREATE UNIQUE INDEX ux_estudiantes_codigo ON estudiantes (codigo) WHERE eliminado_en IS NULL;
CREATE UNIQUE INDEX ux_estudiantes_persona ON estudiantes (persona_id) WHERE eliminado_en IS NULL;

-- 4.3 APODERADOS
CREATE TABLE apoderados (
    id                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    persona_id         UUID          NOT NULL,
    ocupacion          VARCHAR(100)  NULL,
    centro_laboral     VARCHAR(150)  NULL,
    telefono_laboral   VARCHAR(20)   NULL,
    grado_instruccion  VARCHAR(20)   NULL,
    creado_en          TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en     TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en       TIMESTAMP(0)  NULL,
    CONSTRAINT pk_apoderados PRIMARY KEY (id),
    CONSTRAINT ck_apoderados_instruccion CHECK (grado_instruccion IS NULL OR grado_instruccion IN ('sin_estudios','primaria','secundaria','tecnica','universitaria','posgrado')),
    CONSTRAINT fk_apoderados_persona FOREIGN KEY (persona_id) REFERENCES personas (id)
);
CREATE UNIQUE INDEX ux_apoderados_persona ON apoderados (persona_id) WHERE eliminado_en IS NULL;

-- 4.4 ESTUDIANTE_APODERADOS: vínculo familiar (un estudiante, varios apoderados)
CREATE TABLE estudiante_apoderados (
    estudiante_id        UUID          NOT NULL,
    apoderado_id         UUID          NOT NULL,
    parentesco           VARCHAR(20)   NOT NULL,
    es_principal         BOOLEAN       NOT NULL DEFAULT FALSE,   -- recibe comunicaciones y libreta
    vive_con_estudiante  BOOLEAN       NOT NULL DEFAULT FALSE,
    autorizado_recoger   BOOLEAN       NOT NULL DEFAULT FALSE,
    contacto_emergencia  BOOLEAN       NOT NULL DEFAULT FALSE,
    creado_en            TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_estudiante_apoderados PRIMARY KEY (estudiante_id, apoderado_id),
    CONSTRAINT ck_estudiante_apoderados_parentesco CHECK (parentesco IN ('padre','madre','abuelo','abuela','hermano','hermana','tio','tia','tutor_legal','otro')),
    CONSTRAINT fk_estudiante_apoderados_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes (id) ON DELETE CASCADE,
    CONSTRAINT fk_estudiante_apoderados_apoderado  FOREIGN KEY (apoderado_id)  REFERENCES apoderados (id)  ON DELETE CASCADE
);
-- Un solo apoderado principal por estudiante
CREATE UNIQUE INDEX ux_estudiante_apoderados_principal ON estudiante_apoderados (estudiante_id) WHERE es_principal;

-- 4.5 CREDENCIALES: carné con QR y PIN para marcar en el kiosko (docentes, estudiantes y personal)
CREATE TABLE credenciales (
    id                UUID          NOT NULL DEFAULT gen_random_uuid(),
    persona_id        UUID          NOT NULL,
    codigo            VARCHAR(50)   NOT NULL,   -- valor del QR / código corto
    pin_hash          VARCHAR(128)  NULL,       -- verificación en kiosko
    activa            BOOLEAN       NOT NULL DEFAULT TRUE,
    emitida_en        TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vence_en          DATE          NULL,
    anulada_en        TIMESTAMP(0)  NULL,
    motivo_anulacion  VARCHAR(255)  NULL,
    CONSTRAINT pk_credenciales PRIMARY KEY (id),
    CONSTRAINT ck_credenciales_anulacion CHECK (activa OR anulada_en IS NOT NULL),
    CONSTRAINT fk_credenciales_persona FOREIGN KEY (persona_id) REFERENCES personas (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX ux_credenciales_codigo_activa ON credenciales (codigo) WHERE activa;
CREATE UNIQUE INDEX ux_credenciales_persona_activa ON credenciales (persona_id) WHERE activa;


/* ############################################################################
   MÓDULO 5: ORGANIZACIÓN Y MATRÍCULA
   ############################################################################ */

-- 5.1 SECCIONES (1° A, 1° B...) por año
CREATE TABLE secciones (
    id                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    anio_academico_id  UUID          NOT NULL,
    grado_id           UUID          NOT NULL,
    tutor_id           UUID          NULL,     -- docente tutor
    nombre             VARCHAR(10)   NOT NULL, -- A, B, Única
    aula               VARCHAR(50)   NULL,
    vacantes           SMALLINT      NOT NULL,
    estado             VARCHAR(20)   NOT NULL DEFAULT 'activa',
    creado_en          TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en     TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_secciones PRIMARY KEY (id),
    CONSTRAINT uq_secciones_id_anio UNIQUE (id, anio_academico_id),     -- soporte para FK compuesta de matrículas
    CONSTRAINT uq_secciones_grado_nombre UNIQUE (anio_academico_id, grado_id, nombre),
    CONSTRAINT ck_secciones_estado CHECK (estado IN ('activa','cerrada')),
    CONSTRAINT ck_secciones_vacantes CHECK (vacantes > 0),
    CONSTRAINT fk_secciones_anio  FOREIGN KEY (anio_academico_id) REFERENCES anios_academicos (id),
    CONSTRAINT fk_secciones_grado FOREIGN KEY (grado_id)          REFERENCES grados (id),
    CONSTRAINT fk_secciones_tutor FOREIGN KEY (tutor_id)          REFERENCES docentes (id)
);

-- 5.2 CURSOS_SECCION: curso dictado en una sección y su docente (carga académica)
CREATE TABLE cursos_seccion (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    seccion_id      UUID          NOT NULL,
    curso_id        UUID          NOT NULL,
    docente_id      UUID          NULL,   -- NULL mientras no se asigne
    creado_en       TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_cursos_seccion PRIMARY KEY (id),
    CONSTRAINT uq_cursos_seccion_seccion_curso UNIQUE (seccion_id, curso_id),
    CONSTRAINT fk_cursos_seccion_seccion FOREIGN KEY (seccion_id) REFERENCES secciones (id),
    CONSTRAINT fk_cursos_seccion_curso   FOREIGN KEY (curso_id)   REFERENCES cursos (id),
    CONSTRAINT fk_cursos_seccion_docente FOREIGN KEY (docente_id) REFERENCES docentes (id)
);
CREATE INDEX ix_cursos_seccion_docente ON cursos_seccion (docente_id);

-- 5.3 HORARIOS: bloques semanales de la sección (clase o receso)
CREATE TABLE horarios (
    id                UUID          NOT NULL DEFAULT gen_random_uuid(),
    seccion_id        UUID          NOT NULL,
    curso_seccion_id  UUID          NULL,   -- NULL en recesos
    dia_semana        SMALLINT      NOT NULL,   -- 1 = lunes ... 7 = domingo
    hora_inicio       TIME(0)       NOT NULL,
    hora_fin          TIME(0)       NOT NULL,
    tipo_bloque       VARCHAR(10)   NOT NULL DEFAULT 'clase',
    aula              VARCHAR(50)   NULL,
    creado_en         TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en    TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_horarios PRIMARY KEY (id),
    CONSTRAINT uq_horarios_bloque UNIQUE (seccion_id, dia_semana, hora_inicio),
    CONSTRAINT ck_horarios_dia CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT ck_horarios_horas CHECK (hora_fin > hora_inicio),
    CONSTRAINT ck_horarios_tipo CHECK ((tipo_bloque = 'clase' AND curso_seccion_id IS NOT NULL) OR (tipo_bloque = 'receso' AND curso_seccion_id IS NULL)),
    CONSTRAINT fk_horarios_seccion       FOREIGN KEY (seccion_id)       REFERENCES secciones (id),
    CONSTRAINT fk_horarios_curso_seccion FOREIGN KEY (curso_seccion_id) REFERENCES cursos_seccion (id)
);
CREATE INDEX ix_horarios_curso_seccion ON horarios (curso_seccion_id);

-- 5.4 MATRICULAS: un estudiante, una sección por año
CREATE TABLE matriculas (
    id                   UUID          NOT NULL DEFAULT gen_random_uuid(),
    estudiante_id        UUID          NOT NULL,
    seccion_id           UUID          NOT NULL,
    anio_academico_id    UUID          NOT NULL,
    codigo               VARCHAR(20)   NOT NULL,
    fecha_matricula      DATE          NOT NULL,
    tipo                 VARCHAR(20)   NOT NULL,
    estado               VARCHAR(20)   NOT NULL DEFAULT 'matriculado',
    es_repitente         BOOLEAN       NOT NULL DEFAULT FALSE,
    colegio_procedencia  VARCHAR(150)  NULL,
    fecha_retiro         DATE          NULL,
    motivo_retiro        VARCHAR(255)  NULL,
    observaciones        VARCHAR(500)  NULL,
    registrado_por_id    UUID          NULL,
    creado_en            TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en       TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_matriculas PRIMARY KEY (id),
    CONSTRAINT uq_matriculas_codigo UNIQUE (codigo),
    CONSTRAINT uq_matriculas_estudiante_anio UNIQUE (estudiante_id, anio_academico_id),
    CONSTRAINT ck_matriculas_tipo CHECK (tipo IN ('nuevo','continuador','traslado')),
    CONSTRAINT ck_matriculas_estado CHECK (estado IN ('matriculado','retirado','trasladado','culminado')),
    CONSTRAINT ck_matriculas_retiro CHECK (estado NOT IN ('retirado','trasladado') OR fecha_retiro IS NOT NULL),
    CONSTRAINT fk_matriculas_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes (id),
    -- FK compuesta: garantiza que la sección pertenezca al mismo año de la matrícula
    CONSTRAINT fk_matriculas_seccion FOREIGN KEY (seccion_id, anio_academico_id) REFERENCES secciones (id, anio_academico_id),
    CONSTRAINT fk_matriculas_registrado_por FOREIGN KEY (registrado_por_id) REFERENCES usuarios (id)
);
CREATE INDEX ix_matriculas_seccion_estado ON matriculas (seccion_id, estado);


/* ############################################################################
   MÓDULO 6: LIBRETAS
   ############################################################################ */

-- 6.1 LIBRETAS: libreta en PDF descargada del SIAGIE, una por estudiante y
--     periodo (indicador ISA). El docente la sube; el sistema lee el código
--     del estudiante del archivo y la asigna por estudiantes.codigo.
--     ISA = libretas a tiempo / libretas programadas x 100
CREATE TABLE libretas (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    matricula_id    UUID          NOT NULL,
    periodo_id      UUID          NOT NULL,
    fecha_limite    DATE          NOT NULL,   -- hasta cuándo debe estar publicada
    archivo_url     VARCHAR(500)  NULL,       -- PDF del SIAGIE
    codigo_leido    VARCHAR(20)   NULL,       -- código leído del archivo (auditoría)
    subido_por_id   UUID          NULL,
    subido_en       TIMESTAMP(0)  NULL,
    estado          VARCHAR(20)   NOT NULL DEFAULT 'pendiente',
    visto_en        TIMESTAMP(0)  NULL,       -- primera vez que la vio el estudiante o apoderado
    creado_en       TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_libretas PRIMARY KEY (id),
    CONSTRAINT uq_libretas_matricula_periodo UNIQUE (matricula_id, periodo_id),
    CONSTRAINT ck_libretas_estado CHECK (estado IN ('pendiente','a_tiempo','fuera_de_plazo')),
    CONSTRAINT ck_libretas_subida CHECK (
        (estado = 'pendiente' AND archivo_url IS NULL AND subido_en IS NULL) OR
        (estado <> 'pendiente' AND archivo_url IS NOT NULL AND subido_en IS NOT NULL AND subido_por_id IS NOT NULL)),
    CONSTRAINT ck_libretas_visto CHECK (visto_en IS NULL OR subido_en IS NOT NULL),
    CONSTRAINT fk_libretas_matricula  FOREIGN KEY (matricula_id)  REFERENCES matriculas (id),
    CONSTRAINT fk_libretas_periodo    FOREIGN KEY (periodo_id)    REFERENCES periodos_academicos (id),
    CONSTRAINT fk_libretas_subido_por FOREIGN KEY (subido_por_id) REFERENCES usuarios (id)
);
CREATE INDEX ix_libretas_periodo_estado ON libretas (periodo_id, estado);


/* ############################################################################
   MÓDULO 7: ASISTENCIA Y SEGUIMIENTO DOCENTE
   ############################################################################ */

-- 7.1 ASISTENCIAS_ESTUDIANTE: asistencia a cada curso (la registra el docente)
CREATE TABLE asistencias_estudiante (
    id                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    matricula_id       UUID          NOT NULL,
    curso_seccion_id   UUID          NOT NULL,
    fecha              DATE          NOT NULL,
    estado             VARCHAR(20)   NOT NULL,
    justificacion      VARCHAR(500)  NULL,
    documento_url      VARCHAR(255)  NULL,
    registrado_por_id  UUID          NULL,
    registrado_en      TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en     TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_asistencias_estudiante PRIMARY KEY (id),
    CONSTRAINT uq_asistencias_estudiante UNIQUE (matricula_id, curso_seccion_id, fecha),
    CONSTRAINT ck_asistencias_estudiante_estado CHECK (estado IN ('presente','tardanza','falta','falta_justificada')),
    CONSTRAINT ck_asistencias_estudiante_justif CHECK (estado <> 'falta_justificada' OR justificacion IS NOT NULL),
    CONSTRAINT fk_asistencias_estudiante_matricula      FOREIGN KEY (matricula_id)      REFERENCES matriculas (id),
    CONSTRAINT fk_asistencias_estudiante_curso_seccion  FOREIGN KEY (curso_seccion_id)  REFERENCES cursos_seccion (id),
    CONSTRAINT fk_asistencias_estudiante_registrado_por FOREIGN KEY (registrado_por_id) REFERENCES usuarios (id)
);
CREATE INDEX ix_asistencias_estudiante_curso_fecha ON asistencias_estudiante (curso_seccion_id, fecha);

-- 7.2 MARCACIONES: entrada y salida al colegio (kiosko, intranet o manual)
CREATE TABLE marcaciones (
    id                    UUID           NOT NULL DEFAULT gen_random_uuid(),
    persona_id            UUID           NOT NULL,
    credencial_id         UUID           NULL,
    turno_id              UUID           NULL,
    tipo                  VARCHAR(10)    NOT NULL,
    fecha_hora            TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    origen                VARCHAR(10)    NOT NULL,
    resultado             VARCHAR(20)    NOT NULL,
    minutos_tardanza      SMALLINT       NOT NULL DEFAULT 0,
    latitud               NUMERIC(10,7)  NULL,
    longitud              NUMERIC(10,7)  NULL,
    dentro_geocerca       BOOLEAN        NULL,
    justificada           BOOLEAN        NOT NULL DEFAULT FALSE,
    motivo_justificacion  VARCHAR(500)   NULL,
    justificada_por_id    UUID           NULL,
    justificada_en        TIMESTAMP(0)   NULL,
    CONSTRAINT pk_marcaciones PRIMARY KEY (id),
    CONSTRAINT ck_marcaciones_tipo CHECK (tipo IN ('entrada','salida')),
    CONSTRAINT ck_marcaciones_origen CHECK (origen IN ('kiosko','intranet','manual')),
    CONSTRAINT ck_marcaciones_resultado CHECK (resultado IN ('puntual','tardanza','salida_anticipada','fuera_de_turno')),
    CONSTRAINT ck_marcaciones_minutos CHECK (minutos_tardanza >= 0),
    CONSTRAINT ck_marcaciones_justificacion CHECK (NOT justificada OR (motivo_justificacion IS NOT NULL AND justificada_por_id IS NOT NULL AND justificada_en IS NOT NULL)),
    CONSTRAINT fk_marcaciones_persona         FOREIGN KEY (persona_id)         REFERENCES personas (id),
    CONSTRAINT fk_marcaciones_credencial      FOREIGN KEY (credencial_id)      REFERENCES credenciales (id),
    CONSTRAINT fk_marcaciones_turno           FOREIGN KEY (turno_id)           REFERENCES turnos (id),
    CONSTRAINT fk_marcaciones_justificada_por FOREIGN KEY (justificada_por_id) REFERENCES usuarios (id)
);
CREATE INDEX ix_marcaciones_persona_fecha ON marcaciones (persona_id, fecha_hora);
CREATE INDEX ix_marcaciones_fecha ON marcaciones (fecha_hora);

-- 7.3 SESIONES_CLASE: cumplimiento de cada clase programada por el docente (indicador CSP).
--     Se crean cada día desde horarios (pendiente). El docente registra el tema
--     y firma ingreso (en_curso) y salida (cumplida o parcial); sin firma al
--     cierre del día queda no_cumplida.
CREATE TABLE sesiones_clase (
    id                 UUID           NOT NULL DEFAULT gen_random_uuid(),
    horario_id         UUID           NOT NULL,
    docente_id         UUID           NOT NULL,   -- quien dictó (puede ser reemplazo)
    fecha              DATE           NOT NULL,
    hora_inicio_real   TIME(0)        NULL,
    hora_fin_real      TIME(0)        NULL,
    estado             VARCHAR(20)    NOT NULL DEFAULT 'pendiente',
    minutos_perdidos   SMALLINT       NOT NULL DEFAULT 0,
    tema               VARCHAR(500)   NULL,
    observaciones      VARCHAR(500)   NULL,
    justificacion      VARCHAR(500)   NULL,
    firmada_inicio_en  TIMESTAMP(0)   NULL,
    firmada_fin_en     TIMESTAMP(0)   NULL,
    latitud            NUMERIC(10,7)  NULL,
    longitud           NUMERIC(10,7)  NULL,
    dentro_geocerca    BOOLEAN        NULL,
    creado_en          TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en     TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_sesiones_clase PRIMARY KEY (id),
    CONSTRAINT uq_sesiones_clase_horario_fecha UNIQUE (horario_id, fecha),
    CONSTRAINT ck_sesiones_clase_estado CHECK (estado IN ('pendiente','en_curso','cumplida','parcial','no_cumplida','justificada','reprogramada')),
    CONSTRAINT ck_sesiones_clase_horas CHECK (hora_fin_real IS NULL OR hora_inicio_real IS NULL OR hora_fin_real > hora_inicio_real),
    CONSTRAINT ck_sesiones_clase_minutos CHECK (minutos_perdidos >= 0),
    CONSTRAINT ck_sesiones_clase_justificada CHECK (estado <> 'justificada' OR justificacion IS NOT NULL),
    CONSTRAINT fk_sesiones_clase_horario FOREIGN KEY (horario_id) REFERENCES horarios (id),
    CONSTRAINT fk_sesiones_clase_docente FOREIGN KEY (docente_id) REFERENCES docentes (id)
);
CREATE INDEX ix_sesiones_clase_docente_fecha ON sesiones_clase (docente_id, fecha);
CREATE INDEX ix_sesiones_clase_fecha_estado ON sesiones_clase (fecha, estado);

-- 7.4 AUSENCIAS_SESION: tramos en que el director encontró al docente fuera
--     de clase durante una sesión (supervisión ocasional). El docente puede
--     dejar su descargo. No cambia el estado de la sesión; alimenta el
--     consolidado del bimestre.
--     Regla de la aplicación: el tramo debe caer dentro del horario de la sesión.
CREATE TABLE ausencias_sesion (
    id                 UUID           NOT NULL DEFAULT gen_random_uuid(),
    sesion_clase_id    UUID           NOT NULL,
    registrado_por_id  UUID           NOT NULL,   -- director o coordinador
    hora_desde         TIME(0)        NOT NULL,
    hora_hasta         TIME(0)        NOT NULL,
    minutos            INTEGER        GENERATED ALWAYS AS ((EXTRACT(EPOCH FROM (hora_hasta - hora_desde)) / 60)::INTEGER) STORED,
    motivo             VARCHAR(30)    NOT NULL,
    observacion        VARCHAR(1000)  NULL,
    descargo           VARCHAR(1000)  NULL,       -- respuesta del docente
    descargo_en        TIMESTAMP(0)   NULL,
    registrado_en      TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en     TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_ausencias_sesion PRIMARY KEY (id),
    CONSTRAINT ck_ausencias_sesion_horas CHECK (hora_hasta > hora_desde),
    CONSTRAINT ck_ausencias_sesion_motivo CHECK (motivo IN ('fuera_del_aula','desayunando','servicios_higienicos','uso_celular','otro')),
    CONSTRAINT ck_ausencias_sesion_otro CHECK (motivo <> 'otro' OR observacion IS NOT NULL),
    CONSTRAINT ck_ausencias_sesion_descargo CHECK (descargo IS NULL OR descargo_en IS NOT NULL),
    CONSTRAINT fk_ausencias_sesion_sesion         FOREIGN KEY (sesion_clase_id)   REFERENCES sesiones_clase (id) ON DELETE CASCADE,
    CONSTRAINT fk_ausencias_sesion_registrado_por FOREIGN KEY (registrado_por_id) REFERENCES usuarios (id)
);
CREATE INDEX ix_ausencias_sesion_sesion ON ausencias_sesion (sesion_clase_id);

-- 7.5 EVIDENCIAS_AUSENCIA: fotos que sustentan cada tramo (puede haber varias)
CREATE TABLE evidencias_ausencia (
    id           UUID          NOT NULL DEFAULT gen_random_uuid(),
    ausencia_id  UUID          NOT NULL,
    archivo_url  VARCHAR(500)  NOT NULL,
    tomada_en    TIMESTAMP(0)  NULL,
    orden        SMALLINT      NOT NULL DEFAULT 1,
    creado_en    TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_evidencias_ausencia PRIMARY KEY (id),
    CONSTRAINT uq_evidencias_ausencia_orden UNIQUE (ausencia_id, orden),
    CONSTRAINT fk_evidencias_ausencia_ausencia FOREIGN KEY (ausencia_id) REFERENCES ausencias_sesion (id) ON DELETE CASCADE
);

-- 7.6 CONSOLIDADOS_DOCENTE: resumen congelado del bimestre por docente.
--     Una vez generado, las ausencias del periodo ya no se editan; sustenta
--     decisiones como llamadas de atención o descuentos.
CREATE TABLE consolidados_docente (
    id                    UUID           NOT NULL DEFAULT gen_random_uuid(),
    docente_id            UUID           NOT NULL,
    periodo_id            UUID           NOT NULL,
    sesiones_programadas  SMALLINT       NOT NULL,
    sesiones_cumplidas    SMALLINT       NOT NULL,
    total_ausencias       SMALLINT       NOT NULL DEFAULT 0,
    minutos_fuera_aula    INTEGER        NOT NULL DEFAULT 0,
    decision              VARCHAR(20)    NOT NULL DEFAULT 'ninguna',
    observacion           VARCHAR(1000)  NULL,
    generado_por_id       UUID           NOT NULL,
    generado_en           TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enviado_en            TIMESTAMP(0)   NULL,   -- cuándo se envió para el descuento
    CONSTRAINT pk_consolidados_docente PRIMARY KEY (id),
    CONSTRAINT uq_consolidados_docente UNIQUE (docente_id, periodo_id),
    CONSTRAINT ck_consolidados_docente_sesiones CHECK (sesiones_programadas >= 0 AND sesiones_cumplidas BETWEEN 0 AND sesiones_programadas),
    CONSTRAINT ck_consolidados_docente_ausencias CHECK (total_ausencias >= 0 AND minutos_fuera_aula >= 0),
    CONSTRAINT ck_consolidados_docente_decision CHECK (decision IN ('ninguna','llamada_atencion','descuento','derivado')),
    CONSTRAINT fk_consolidados_docente_docente      FOREIGN KEY (docente_id)      REFERENCES docentes (id),
    CONSTRAINT fk_consolidados_docente_periodo      FOREIGN KEY (periodo_id)      REFERENCES periodos_academicos (id),
    CONSTRAINT fk_consolidados_docente_generado_por FOREIGN KEY (generado_por_id) REFERENCES usuarios (id)
);


/* ############################################################################
   MÓDULO 8: CONVIVENCIA Y COMUNICACIÓN
   ############################################################################ */

-- 8.1 INCIDENCIAS_CONDUCTA: méritos y faltas
CREATE TABLE incidencias_conducta (
    id                    UUID           NOT NULL DEFAULT gen_random_uuid(),
    matricula_id          UUID           NOT NULL,
    periodo_id            UUID           NOT NULL,
    registrado_por_id     UUID           NOT NULL,   -- usuario (docente, auxiliar, tutor)
    fecha                 DATE           NOT NULL,
    tipo                  VARCHAR(10)    NOT NULL,
    categoria             VARCHAR(100)   NOT NULL,
    gravedad              VARCHAR(10)    NULL,
    descripcion           VARCHAR(1000)  NOT NULL,
    lugar                 VARCHAR(100)   NULL,
    medidas_tomadas       VARCHAR(1000)  NULL,
    apoderado_notificado  BOOLEAN        NOT NULL DEFAULT FALSE,
    fecha_notificacion    DATE           NULL,
    creado_en             TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en        TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_incidencias_conducta PRIMARY KEY (id),
    CONSTRAINT ck_incidencias_tipo CHECK (tipo IN ('merito','falta')),
    CONSTRAINT ck_incidencias_gravedad CHECK ((tipo = 'merito' AND gravedad IS NULL) OR (tipo = 'falta' AND gravedad IN ('leve','grave','muy_grave'))),
    CONSTRAINT ck_incidencias_notificacion CHECK (NOT apoderado_notificado OR fecha_notificacion IS NOT NULL),
    CONSTRAINT fk_incidencias_matricula      FOREIGN KEY (matricula_id)      REFERENCES matriculas (id),
    CONSTRAINT fk_incidencias_periodo        FOREIGN KEY (periodo_id)        REFERENCES periodos_academicos (id),
    CONSTRAINT fk_incidencias_registrado_por FOREIGN KEY (registrado_por_id) REFERENCES usuarios (id)
);
CREATE INDEX ix_incidencias_matricula_fecha ON incidencias_conducta (matricula_id, fecha);

-- 8.2 OBSERVACIONES_ESTUDIANTE: seguimiento tutorial / psicopedagógico
CREATE TABLE observaciones_estudiante (
    id                 UUID           NOT NULL DEFAULT gen_random_uuid(),
    matricula_id       UUID           NOT NULL,
    registrado_por_id  UUID           NOT NULL,
    fecha              DATE           NOT NULL,
    tipo               VARCHAR(20)    NOT NULL,
    observacion        VARCHAR(2000)  NOT NULL,
    seguimiento        VARCHAR(2000)  NULL,
    derivado_a         VARCHAR(100)   NULL,   -- psicología, DEMUNA, centro de salud...
    es_confidencial    BOOLEAN        NOT NULL DEFAULT FALSE,
    creado_en          TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en     TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_observaciones_estudiante PRIMARY KEY (id),
    CONSTRAINT ck_observaciones_tipo CHECK (tipo IN ('academica','conductual','socioemocional','salud','familiar')),
    CONSTRAINT fk_observaciones_matricula      FOREIGN KEY (matricula_id)      REFERENCES matriculas (id),
    CONSTRAINT fk_observaciones_registrado_por FOREIGN KEY (registrado_por_id) REFERENCES usuarios (id)
);
CREATE INDEX ix_observaciones_matricula_fecha ON observaciones_estudiante (matricula_id, fecha);

-- 8.3 COMUNICADOS: anuncios a toda la comunidad, un grado o una sección
CREATE TABLE comunicados (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    autor_id        UUID          NOT NULL,
    titulo          VARCHAR(150)  NOT NULL,
    contenido       TEXT          NOT NULL,
    dirigido_a      VARCHAR(20)   NOT NULL,   -- público
    grado_id        UUID          NULL,       -- alcance: NULL = todo el colegio
    seccion_id      UUID          NULL,
    prioridad       VARCHAR(10)   NOT NULL DEFAULT 'normal',
    estado          VARCHAR(20)   NOT NULL DEFAULT 'borrador',
    adjunto_url     VARCHAR(255)  NULL,
    publicado_en    TIMESTAMP(0)  NULL,
    vence_en        TIMESTAMP(0)  NULL,
    creado_en       TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_comunicados PRIMARY KEY (id),
    CONSTRAINT ck_comunicados_dirigido CHECK (dirigido_a IN ('todos','docentes','estudiantes','apoderados')),
    CONSTRAINT ck_comunicados_prioridad CHECK (prioridad IN ('normal','importante','urgente')),
    CONSTRAINT ck_comunicados_estado CHECK (estado IN ('borrador','publicado','archivado')),
    CONSTRAINT ck_comunicados_publicado CHECK (estado = 'borrador' OR publicado_en IS NOT NULL),
    CONSTRAINT ck_comunicados_vence CHECK (vence_en IS NULL OR publicado_en IS NULL OR vence_en > publicado_en),
    CONSTRAINT fk_comunicados_autor   FOREIGN KEY (autor_id)   REFERENCES usuarios (id),
    CONSTRAINT fk_comunicados_grado   FOREIGN KEY (grado_id)   REFERENCES grados (id),
    CONSTRAINT fk_comunicados_seccion FOREIGN KEY (seccion_id) REFERENCES secciones (id)
);
CREATE INDEX ix_comunicados_estado_fecha ON comunicados (estado, publicado_en);

-- 8.4 NOTIFICACIONES: avisos personales a cada usuario (bandeja)
CREATE TABLE notificaciones (
    id               UUID          NOT NULL DEFAULT gen_random_uuid(),
    usuario_id       UUID          NOT NULL,
    titulo           VARCHAR(150)  NOT NULL,
    mensaje          VARCHAR(500)  NOT NULL,
    tipo             VARCHAR(20)   NOT NULL DEFAULT 'informacion',
    enlace_url       VARCHAR(255)  NULL,
    comunicado_id    UUID          NULL,   -- si avisa de un comunicado (control de lectura)
    sesion_clase_id  UUID          NULL,   -- si avisa de una sesión (ej. ausencia registrada)
    leida            BOOLEAN       NOT NULL DEFAULT FALSE,
    leida_en         TIMESTAMP(0)  NULL,
    creado_en        TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_notificaciones PRIMARY KEY (id),
    CONSTRAINT ck_notificaciones_tipo CHECK (tipo IN ('informacion','alerta','recordatorio')),
    CONSTRAINT ck_notificaciones_leida CHECK (NOT leida OR leida_en IS NOT NULL),
    CONSTRAINT fk_notificaciones_usuario    FOREIGN KEY (usuario_id)      REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_notificaciones_comunicado FOREIGN KEY (comunicado_id)   REFERENCES comunicados (id),
    CONSTRAINT fk_notificaciones_sesion     FOREIGN KEY (sesion_clase_id) REFERENCES sesiones_clase (id)
);
CREATE INDEX ix_notificaciones_usuario_no_leidas ON notificaciones (usuario_id, creado_en) WHERE NOT leida;
CREATE INDEX ix_notificaciones_comunicado ON notificaciones (comunicado_id) WHERE comunicado_id IS NOT NULL;


/* ############################################################################
   MÓDULO 9: AULA VIRTUAL (reforzamiento de lo enseñado en el aula)
   ############################################################################ */

-- 9.1 UNIDADES_APRENDIZAJE: organización del curso en el aula virtual
CREATE TABLE unidades_aprendizaje (
    id                UUID           NOT NULL DEFAULT gen_random_uuid(),
    curso_seccion_id  UUID           NOT NULL,
    periodo_id        UUID           NULL,
    titulo            VARCHAR(150)   NOT NULL,
    descripcion       VARCHAR(1000)  NULL,
    orden             SMALLINT       NOT NULL DEFAULT 1,
    fecha_inicio      DATE           NULL,
    fecha_fin         DATE           NULL,
    publicada         BOOLEAN        NOT NULL DEFAULT FALSE,
    creado_en         TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en    TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_unidades_aprendizaje PRIMARY KEY (id),
    CONSTRAINT ck_unidades_fechas CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio),
    CONSTRAINT fk_unidades_curso_seccion FOREIGN KEY (curso_seccion_id) REFERENCES cursos_seccion (id),
    CONSTRAINT fk_unidades_periodo       FOREIGN KEY (periodo_id)       REFERENCES periodos_academicos (id)
);
CREATE INDEX ix_unidades_curso_seccion ON unidades_aprendizaje (curso_seccion_id, orden);

-- 9.2 MATERIALES: recursos publicados por el docente.
--     El estado "a tiempo / con retraso" no se guarda; se calcula
--     comparando publicado_en con fecha_programada.
CREATE TABLE materiales (
    id                UUID           NOT NULL DEFAULT gen_random_uuid(),
    unidad_id         UUID           NOT NULL,
    sesion_clase_id   UUID           NULL,       -- clase que refuerza (opcional)
    publicado_por_id  UUID           NOT NULL,   -- docente
    titulo            VARCHAR(150)   NOT NULL,
    descripcion       VARCHAR(1000)  NULL,
    tipo              VARCHAR(20)    NOT NULL,
    url               VARCHAR(500)   NOT NULL,
    permite_descarga  BOOLEAN        NOT NULL DEFAULT TRUE,
    visible           BOOLEAN        NOT NULL DEFAULT TRUE,
    orden             SMALLINT       NOT NULL DEFAULT 1,
    fecha_programada  TIMESTAMP(0)   NULL,   -- fecha en que debía publicarse
    publicado_en      TIMESTAMP(0)   NULL,   -- fecha real (a tiempo vs. con retraso)
    creado_en         TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en    TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_materiales PRIMARY KEY (id),
    CONSTRAINT ck_materiales_tipo CHECK (tipo IN ('documento','presentacion','video','audio','enlace','otro')),
    CONSTRAINT fk_materiales_unidad        FOREIGN KEY (unidad_id)        REFERENCES unidades_aprendizaje (id),
    CONSTRAINT fk_materiales_sesion_clase  FOREIGN KEY (sesion_clase_id)  REFERENCES sesiones_clase (id),
    CONSTRAINT fk_materiales_publicado_por FOREIGN KEY (publicado_por_id) REFERENCES docentes (id)
);
CREATE INDEX ix_materiales_unidad ON materiales (unidad_id, orden);

-- 9.3 TAREAS
CREATE TABLE tareas (
    id                      UUID          NOT NULL DEFAULT gen_random_uuid(),
    curso_seccion_id        UUID          NOT NULL,
    unidad_id               UUID          NULL,
    sesion_clase_id         UUID          NULL,   -- clase que refuerza (opcional)
    titulo                  VARCHAR(150)  NOT NULL,
    instrucciones           TEXT          NULL,
    tipo                    VARCHAR(20)   NOT NULL,
    puntaje_maximo          NUMERIC(4,2)  NOT NULL DEFAULT 20,
    publicada_en            TIMESTAMP(0)  NULL,
    fecha_limite            TIMESTAMP(0)  NOT NULL,
    permite_entrega_tardia  BOOLEAN       NOT NULL DEFAULT FALSE,
    intentos_maximos        SMALLINT      NOT NULL DEFAULT 1,
    tipos_archivo           VARCHAR(100)  NULL,   -- ej. pdf,docx,jpg
    estado                  VARCHAR(20)   NOT NULL DEFAULT 'borrador',
    creado_en               TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en          TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_tareas PRIMARY KEY (id),
    CONSTRAINT ck_tareas_tipo CHECK (tipo IN ('entregable','cuestionario','proyecto')),
    CONSTRAINT ck_tareas_estado CHECK (estado IN ('borrador','publicada','cerrada')),
    CONSTRAINT ck_tareas_puntaje CHECK (puntaje_maximo > 0 AND puntaje_maximo <= 20),
    CONSTRAINT ck_tareas_intentos CHECK (intentos_maximos > 0),
    CONSTRAINT ck_tareas_publicada CHECK (estado = 'borrador' OR publicada_en IS NOT NULL),
    CONSTRAINT ck_tareas_fechas CHECK (publicada_en IS NULL OR fecha_limite > publicada_en),
    CONSTRAINT fk_tareas_curso_seccion FOREIGN KEY (curso_seccion_id) REFERENCES cursos_seccion (id),
    CONSTRAINT fk_tareas_unidad        FOREIGN KEY (unidad_id)        REFERENCES unidades_aprendizaje (id),
    CONSTRAINT fk_tareas_sesion_clase  FOREIGN KEY (sesion_clase_id)  REFERENCES sesiones_clase (id)
);
CREATE INDEX ix_tareas_curso_seccion_limite ON tareas (curso_seccion_id, fecha_limite);

-- 9.4 PREGUNTAS_TAREA (solo para tareas tipo cuestionario)
CREATE TABLE preguntas_tarea (
    id         UUID           NOT NULL DEFAULT gen_random_uuid(),
    tarea_id   UUID           NOT NULL,
    enunciado  VARCHAR(1000)  NOT NULL,
    tipo       VARCHAR(20)    NOT NULL,
    puntaje    NUMERIC(4,2)   NOT NULL DEFAULT 1,
    orden      SMALLINT       NOT NULL,
    CONSTRAINT pk_preguntas_tarea PRIMARY KEY (id),
    CONSTRAINT uq_preguntas_tarea_orden UNIQUE (tarea_id, orden),
    CONSTRAINT ck_preguntas_tarea_tipo CHECK (tipo IN ('opcion_unica','opcion_multiple','respuesta_corta')),
    CONSTRAINT ck_preguntas_tarea_puntaje CHECK (puntaje > 0),
    CONSTRAINT fk_preguntas_tarea_tarea FOREIGN KEY (tarea_id) REFERENCES tareas (id) ON DELETE CASCADE
);

-- 9.5 OPCIONES_PREGUNTA
CREATE TABLE opciones_pregunta (
    id           UUID          NOT NULL DEFAULT gen_random_uuid(),
    pregunta_id  UUID          NOT NULL,
    texto        VARCHAR(255)  NOT NULL,
    es_correcta  BOOLEAN       NOT NULL DEFAULT FALSE,
    orden        SMALLINT      NOT NULL,
    CONSTRAINT pk_opciones_pregunta PRIMARY KEY (id),
    CONSTRAINT uq_opciones_pregunta_orden UNIQUE (pregunta_id, orden),
    CONSTRAINT fk_opciones_pregunta_pregunta FOREIGN KEY (pregunta_id) REFERENCES preguntas_tarea (id) ON DELETE CASCADE
);

-- 9.6 ENTREGAS_TAREA: la nota del aula virtual (única nota que genera el sistema)
CREATE TABLE entregas_tarea (
    id                 UUID           NOT NULL DEFAULT gen_random_uuid(),
    tarea_id           UUID           NOT NULL,
    matricula_id       UUID           NOT NULL,
    intento            SMALLINT       NOT NULL DEFAULT 1,
    entregada_en       TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    texto              TEXT           NULL,
    archivo_url        VARCHAR(500)   NULL,
    enlace_url         VARCHAR(500)   NULL,
    respuestas         JSONB          NULL,   -- respuestas del cuestionario
    es_tardia          BOOLEAN        NOT NULL DEFAULT FALSE,
    estado             VARCHAR(20)    NOT NULL DEFAULT 'entregada',
    nota               NUMERIC(4,2)   NULL,
    retroalimentacion  VARCHAR(2000)  NULL,
    calificada_por_id  UUID           NULL,
    calificada_en      TIMESTAMP(0)   NULL,
    CONSTRAINT pk_entregas_tarea PRIMARY KEY (id),
    CONSTRAINT uq_entregas_tarea_intento UNIQUE (tarea_id, matricula_id, intento),
    CONSTRAINT ck_entregas_tarea_estado CHECK (estado IN ('entregada','calificada','devuelta')),
    CONSTRAINT ck_entregas_tarea_contenido CHECK (texto IS NOT NULL OR archivo_url IS NOT NULL OR enlace_url IS NOT NULL OR respuestas IS NOT NULL),
    CONSTRAINT ck_entregas_tarea_nota CHECK (nota IS NULL OR nota BETWEEN 0 AND 20),
    CONSTRAINT ck_entregas_tarea_calificada CHECK (estado <> 'calificada' OR (nota IS NOT NULL AND calificada_en IS NOT NULL)),
    CONSTRAINT fk_entregas_tarea_tarea          FOREIGN KEY (tarea_id)          REFERENCES tareas (id),
    CONSTRAINT fk_entregas_tarea_matricula      FOREIGN KEY (matricula_id)      REFERENCES matriculas (id),
    CONSTRAINT fk_entregas_tarea_calificada_por FOREIGN KEY (calificada_por_id) REFERENCES usuarios (id)
);
CREATE INDEX ix_entregas_tarea_matricula ON entregas_tarea (matricula_id);

-- 9.7 PUBLICACIONES_AULA: muro del curso (anuncios del docente)
CREATE TABLE publicaciones_aula (
    id                UUID          NOT NULL DEFAULT gen_random_uuid(),
    curso_seccion_id  UUID          NOT NULL,
    autor_id          UUID          NOT NULL,
    contenido         TEXT          NOT NULL,
    adjunto_url       VARCHAR(500)  NULL,
    fijada            BOOLEAN       NOT NULL DEFAULT FALSE,
    creado_en         TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en    TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en      TIMESTAMP(0)  NULL,
    CONSTRAINT pk_publicaciones_aula PRIMARY KEY (id),
    CONSTRAINT fk_publicaciones_aula_curso_seccion FOREIGN KEY (curso_seccion_id) REFERENCES cursos_seccion (id),
    CONSTRAINT fk_publicaciones_aula_autor         FOREIGN KEY (autor_id)         REFERENCES usuarios (id)
);
CREATE INDEX ix_publicaciones_aula_curso_fecha ON publicaciones_aula (curso_seccion_id, creado_en);

-- 9.8 COMENTARIOS_PUBLICACION
CREATE TABLE comentarios_publicacion (
    id              UUID           NOT NULL DEFAULT gen_random_uuid(),
    publicacion_id  UUID           NOT NULL,
    autor_id        UUID           NOT NULL,
    contenido       VARCHAR(1000)  NOT NULL,
    creado_en       TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en    TIMESTAMP(0)   NULL,
    CONSTRAINT pk_comentarios_publicacion PRIMARY KEY (id),
    CONSTRAINT fk_comentarios_publicacion_publicacion FOREIGN KEY (publicacion_id) REFERENCES publicaciones_aula (id) ON DELETE CASCADE,
    CONSTRAINT fk_comentarios_publicacion_autor       FOREIGN KEY (autor_id)       REFERENCES usuarios (id)
);
CREATE INDEX ix_comentarios_publicacion ON comentarios_publicacion (publicacion_id, creado_en);

-- 9.9 MENSAJES_CHAT: chat del curso (grupal) o privado docente-estudiante
CREATE TABLE mensajes_chat (
    id                UUID           NOT NULL DEFAULT gen_random_uuid(),
    curso_seccion_id  UUID           NOT NULL,
    emisor_id         UUID           NOT NULL,
    receptor_id       UUID           NULL,   -- NULL = mensaje al grupo del curso
    contenido         VARCHAR(2000)  NOT NULL,
    adjunto_url       VARCHAR(500)   NULL,
    enviado_en        TIMESTAMP(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    leido_en          TIMESTAMP(0)   NULL,
    eliminado_en      TIMESTAMP(0)   NULL,
    CONSTRAINT pk_mensajes_chat PRIMARY KEY (id),
    CONSTRAINT ck_mensajes_chat_receptor CHECK (receptor_id IS NULL OR receptor_id <> emisor_id),
    CONSTRAINT fk_mensajes_chat_curso_seccion FOREIGN KEY (curso_seccion_id) REFERENCES cursos_seccion (id),
    CONSTRAINT fk_mensajes_chat_emisor        FOREIGN KEY (emisor_id)        REFERENCES usuarios (id),
    CONSTRAINT fk_mensajes_chat_receptor      FOREIGN KEY (receptor_id)      REFERENCES usuarios (id)
);
CREATE INDEX ix_mensajes_chat_curso_fecha ON mensajes_chat (curso_seccion_id, enviado_en);

-- 9.10 ACTIVIDAD_AULA: seguimiento de lo que revisa cada estudiante
CREATE TABLE actividad_aula (
    id             BIGINT        GENERATED ALWAYS AS IDENTITY,
    matricula_id   UUID          NOT NULL,
    material_id    UUID          NULL,
    tarea_id       UUID          NULL,
    accion         VARCHAR(20)   NOT NULL,
    registrado_en  TIMESTAMP(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_actividad_aula PRIMARY KEY (id),
    CONSTRAINT ck_actividad_aula_accion CHECK (accion IN ('visualizo','descargo','completo')),
    -- el registro es sobre un material o sobre una tarea (exactamente uno)
    CONSTRAINT ck_actividad_aula_recurso CHECK (num_nonnulls(material_id, tarea_id) = 1),
    CONSTRAINT fk_actividad_aula_matricula FOREIGN KEY (matricula_id) REFERENCES matriculas (id),
    CONSTRAINT fk_actividad_aula_material  FOREIGN KEY (material_id)  REFERENCES materiales (id),
    CONSTRAINT fk_actividad_aula_tarea     FOREIGN KEY (tarea_id)     REFERENCES tareas (id)
);
CREATE INDEX ix_actividad_aula_matricula ON actividad_aula (matricula_id, registrado_en);


/* ############################################################################
   ACTUALIZADO_EN AUTOMÁTICO
   En PostgreSQL el DEFAULT solo aplica al insertar; este trigger mantiene
   actualizado_en en cada UPDATE de las tablas que tienen esa columna.
   ############################################################################ */
CREATE FUNCTION fn_actualizar_fecha() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.actualizado_en := CURRENT_TIMESTAMP;
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
        WHERE c.table_schema = current_schema()
          AND c.column_name = 'actualizado_en'
          AND tb.table_type = 'BASE TABLE'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%1$s_actualizado_en BEFORE UPDATE ON %1$I
             FOR EACH ROW EXECUTE FUNCTION fn_actualizar_fecha()', t);
    END LOOP;
END;
$$;


/* ############################################################################
   DATOS INICIALES
   ############################################################################ */
INSERT INTO grados (numero, nombre) VALUES
    (1, '1.° de secundaria'), (2, '2.° de secundaria'), (3, '3.° de secundaria'),
    (4, '4.° de secundaria'), (5, '5.° de secundaria');

INSERT INTO roles (nombre, descripcion, es_sistema) VALUES
    ('Administrador', 'Acceso total al sistema', TRUE),
    ('Director',      'Seguimiento docente, supervisión de sesiones y reportes', TRUE),
    ('Secretaria',    'Matrícula, estudiantes y apoderados', TRUE),
    ('Docente',       'Sesiones de clase, libretas y aula virtual de sus cursos', TRUE),
    ('Estudiante',    'Aula virtual, libretas y asistencia propias', TRUE),
    ('Apoderado',     'Consulta de libretas, asistencia y comunicados de sus hijos', TRUE);

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

