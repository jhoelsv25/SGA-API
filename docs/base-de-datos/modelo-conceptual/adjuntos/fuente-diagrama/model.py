# -*- coding: utf-8 -*-
# Modelo conceptual: entidades, atributos (sin claves foráneas), relaciones y cardinalidades.

TITLE = 'Modelo Conceptual de Datos · Diagrama Entidad-Relación'
SUBTITLE = (
    'Sistema Web de Gestión Académica (SGA) · I.E. Nuestra Señora del Carmen, Lircay – Huancavelica',
    'Fase 2 del diseño de BD · Notación pata de gallo (Crow\'s Foot) con marcas Barker (# * o) · 45 entidades en 9 módulos · '
    'v1.0 · 25/09/2026 · Lima De La Cruz Hever – Silvestre Vargas Jhoel',
)

COLS = {i: 90 + i * 460 for i in range(9)}

MODS = {
    'seg':  dict(name='Seguridad', color='#475569'),
    'inst': dict(name='Institución', color='#a16207'),
    'est':  dict(name='Estructura académica', color='#1d4ed8'),
    'com':  dict(name='Comunidad educativa', color='#0f766e'),
    'org':  dict(name='Organización y matrícula', color='#15803d'),
    'eva':  dict(name='Evaluación', color='#c2410c'),
    'asi':  dict(name='Asistencia', color='#be123c'),
    'cnv':  dict(name='Convivencia y comunicación', color='#7e22ce'),
    'aula': dict(name='Aula virtual', color='#0369a1'),
}

def E(title, mod, col, y, attrs, **kw):
    d = dict(title=title, mod=mod, col=col, y=y, attrs=attrs); d.update(kw); return d

ENTS = {
    # ---------------- SEGURIDAD
    'ROL': E('ROL', 'seg', 0, 290, [('#', 'id rol'), ('*', 'nombre'), ('o', 'descripción'), ('*', 'es de sistema')]),
    'PERMISO': E('PERMISO', 'seg', 1, 290, [('#', 'código'), ('*', 'nombre'), ('*', 'módulo'), ('o', 'descripción')]),
    'USUARIO': E('USUARIO', 'seg', 0, 520, [('#', 'nombre de usuario'), ('*', 'contraseña (cifrada)'), ('*', 'estado'),
                                             ('*', 'debe cambiar contraseña'), ('o', 'último acceso')]),
    'SESION': E('SESIÓN DE ACCESO', 'seg', 1, 520, [('#', 'id sesión'), ('*', 'iniciada en'), ('*', 'expira en'),
                                                     ('o', 'dirección IP / navegador'), ('o', 'cerrada en')]),
    'BITACORA': E('BITÁCORA DE AUDITORÍA', 'seg', 1, 790, [('#', 'id registro'), ('*', 'acción'), ('*', 'objeto afectado'),
                                                           ('o', 'valor anterior'), ('o', 'valor nuevo'), ('*', 'fecha y hora')]),
    'PERSONA': E('PERSONA', 'seg', 0, 790, [('#', 'id persona'), ('*', '(tipo doc., número doc.)'), ('*', 'nombres'),
                                            ('*', 'apellido paterno'), ('o', 'apellido materno'), ('o', 'fecha de nacimiento'),
                                            ('*', 'sexo'), ('o', '{teléfono}'), ('o', 'correo'), ('o', '(dirección, distrito)')]),
    # ---------------- COMUNIDAD
    'APODERADO': E('APODERADO', 'com', 0, 1340, [('o', 'ocupación'), ('o', 'centro laboral'), ('o', 'grado de instrucción')]),
    'ESTUDIANTE': E('ESTUDIANTE', 'com', 1, 1350, [('#', 'código de estudiante'), ('*', 'fecha de ingreso'), ('o', 'lengua materna'),
                                                   ('o', 'discapacidad'), ('o', '(grupo sang., alergias, seguro)'), ('*', 'estado')]),
    'DOCENTE': E('DOCENTE', 'com', 2, 1110, [('#', 'código docente'), ('o', 'especialidad'), ('*', 'tipo de contrato'),
                                             ('*', 'jornada (horas)'), ('*', 'fecha de ingreso'), ('*', 'estado'), ('o', 'firma digital')]),
    'CREDENCIAL': E('CREDENCIAL (carné)', 'com', 1, 1070, [('#', 'código QR'), ('o', 'PIN (cifrado)'), ('*', 'activa'),
                                                           ('*', 'emitida en'), ('o', 'vence en'), ('o', 'motivo de anulación')]),
    # ---------------- INSTITUCIÓN
    'INSTITUCION': E('INSTITUCIÓN', 'inst', 2, 290, [('#', 'código modular'), ('*', 'nombre'), ('*', 'tipo de gestión'),
                                                     ('o', 'UGEL / DRE'), ('*', 'dirección'), ('o', 'director'),
                                                     ('o', '(latitud, longitud, radio)')]),
    'TURNO': E('TURNO', 'inst', 2, 840, [('#', 'id turno'), ('*', 'nombre'), ('*', 'aplica a'), ('*', 'hora de entrada'),
                                         ('*', 'hora de salida'), ('*', 'tolerancia (min)')]),
    # ---------------- ESTRUCTURA ACADÉMICA
    'ANIO': E('AÑO ACADÉMICO', 'est', 3, 290, [('#', 'año'), ('o', 'denominación'), ('*', 'fecha de inicio'),
                                               ('*', 'fecha de fin'), ('*', 'estado'), ('o', 'motivo de reapertura')]),
    'PERIODO': E('PERIODO ACADÉMICO', 'est', 4, 290, [('#', 'id periodo'), ('*', 'número'), ('*', 'nombre'), ('*', 'tipo'),
                                                      ('*', 'fecha de inicio'), ('*', 'fecha de fin'), ('*', 'estado')]),
    'ESCALA': E('ESCALA DE CALIFICACIÓN', 'est', 2, 590, [('#', 'literal (AD, A, B, C)'), ('*', 'descripción'),
                                                          ('*', 'nota mínima'), ('*', 'nota máxima'), ('*', 'orden')]),
    'EVENTO': E('EVENTO DE CALENDARIO', 'est', 4, 590, [('#', 'id evento'), ('*', 'título'), ('*', 'tipo'),
                                                        ('*', 'fecha de inicio'), ('*', 'fecha de fin'), ('*', 'suspende clases')]),
    'NIVEL': E('NIVEL', 'est', 5, 290, [('#', 'id nivel'), ('*', 'nombre'), ('*', 'orden')]),
    'GRADO': E('GRADO', 'est', 5, 500, [('#', 'id grado'), ('*', 'número'), ('*', 'nombre')]),
    'CURSO': E('CURSO (área curricular)', 'est', 6, 500, [('#', 'código'), ('*', 'nombre'), ('*', 'área curricular'),
                                                          ('o', 'descripción'), ('o', 'color')]),
    'COMPETENCIA': E('COMPETENCIA', 'est', 7, 500, [('#', 'código'), ('*', 'nombre'), ('o', 'descripción'), ('*', 'orden')]),
    'CAPACIDAD': E('CAPACIDAD', 'est', 8, 500, [('#', 'código'), ('*', 'nombre'), ('*', 'orden')]),
    # ---------------- ORGANIZACIÓN Y MATRÍCULA
    'SECCION': E('SECCIÓN', 'org', 3, 880, [('#', 'id sección'), ('*', 'nombre (A, B…)'), ('o', 'aula'),
                                            ('*', 'vacantes'), ('*', 'estado')]),
    'CURSO_SECCION': E('CURSO-SECCIÓN (carga académica)', 'org', 5, 880, [('#', 'id curso-sección'), ('*', 'fecha de asignación'),
                                                                          ('*', 'estado')], w=400, dx=-30),
    'HORARIO': E('HORARIO (bloque semanal)', 'org', 4, 1150, [('#', 'id bloque'), ('*', 'día de la semana'), ('*', 'hora de inicio'),
                                                              ('*', 'hora de fin'), ('*', 'tipo (clase / receso)')]),
    'MATRICULA': E('MATRÍCULA', 'org', 3, 1250, [('#', 'código de matrícula'), ('*', 'fecha'), ('*', 'tipo'), ('*', 'estado'),
                                                 ('*', 'es repitente'), ('o', 'colegio de procedencia'), ('o', 'fecha de retiro'),
                                                 ('o', 'motivo de retiro')]),
    # ---------------- EVALUACIÓN
    'EVALUACION': E('EVALUACIÓN (instrumento)', 'eva', 5, 1250, [('#', 'id evaluación'), ('*', 'nombre'), ('*', 'tipo'),
                                                                 ('*', 'fecha'), ('*', 'peso'), ('*', 'estado')]),
    'CALIFICACION': E('CALIFICACIÓN DEL PERIODO', 'eva', 5, 1580, [('#', 'id calificación'), ('o', 'nota numérica (0–20)'),
                                                                  ('*', 'nota literal'), ('o', 'conclusión descriptiva'), ('*', 'cerrada')], w=360),
    'LIBRETA': E('ENTREGA DE LIBRETA', 'eva', 3, 1660, [('#', 'id entrega'), ('*', 'fecha límite'), ('o', 'entregada en'),
                                                        ('o', 'medio de entrega'), ('*', 'estado (a tiempo / con retraso)')], badge='ISA', w=380, dx=-20),
    # ---------------- ASISTENCIA
    'SESION_CLASE': E('SESIÓN DE CLASE', 'asi', 4, 1430, [('#', 'id sesión'), ('*', 'fecha'), ('o', 'hora real de inicio'),
                                                          ('o', 'hora real de fin'), ('*', 'estado'), ('o', 'propósito de aprendizaje'),
                                                          ('o', 'justificación')], badge='CSP'),
    'ASISTENCIA': E('ASISTENCIA DEL ESTUDIANTE', 'asi', 4, 1790, [('#', 'id asistencia'), ('*', 'estado (P / T / F / J)'),
                                                                  ('o', 'justificación')], w=360),
    'MARCACION': E('MARCACIÓN (entrada / salida)', 'asi', 2, 1720, [('#', 'id marcación'), ('*', 'tipo'), ('*', 'fecha y hora'),
                                                                    ('*', 'origen'), ('*', 'resultado'), ('*', 'minutos de tardanza'),
                                                                    ('o', '(latitud, longitud)'), ('o', 'justificación')]),
    # ---------------- CONVIVENCIA Y COMUNICACIÓN
    'USUARIO_C': E('USUARIO', 'seg', 0, 1580, [], ghost=True, ref='USUARIO'),
    'NOTIFICACION': E('NOTIFICACIÓN', 'cnv', 0, 1740, [('#', 'id notificación'), ('*', 'título'), ('*', 'mensaje'),
                                                       ('*', 'tipo'), ('*', 'leída')]),
    'COMUNICADO': E('COMUNICADO', 'cnv', 0, 2010, [('#', 'id comunicado'), ('*', 'título'), ('*', 'contenido'),
                                                   ('*', 'dirigido a'), ('*', 'prioridad'), ('*', 'estado'), ('o', 'publicado en')]),
    'INCIDENCIA': E('INCIDENCIA DE CONDUCTA', 'cnv', 1, 1740, [('#', 'id incidencia'), ('*', 'fecha'), ('*', 'tipo (mérito / falta)'),
                                                               ('*', 'categoría'), ('o', 'gravedad'), ('*', 'descripción'),
                                                               ('o', 'medidas tomadas')]),
    'OBSERVACION': E('OBSERVACIÓN DEL ESTUDIANTE', 'cnv', 1, 2070, [('#', 'id observación'), ('*', 'fecha'), ('*', 'tipo'),
                                                                   ('*', 'observación'), ('o', 'derivado a'), ('*', 'confidencial')], w=370),
    # ---------------- AULA VIRTUAL
    'UNIDAD': E('UNIDAD DE APRENDIZAJE', 'aula', 6, 840, [('#', 'id unidad'), ('*', 'título'), ('o', 'descripción'),
                                                          ('*', 'orden'), ('o', '(fecha inicio, fecha fin)'), ('*', 'publicada')]),
    'MATERIAL': E('MATERIAL', 'aula', 7, 840, [('#', 'id material'), ('*', 'título'), ('*', 'tipo'), ('*', 'URL / archivo'),
                                               ('*', 'fecha programada'), ('o', 'publicado en')], badge='IGM'),
    'TAREA': E('TAREA', 'aula', 6, 1150, [('#', 'id tarea'), ('*', 'título'), ('*', 'tipo'), ('*', 'puntaje máximo'),
                                          ('*', 'fecha límite'), ('*', 'estado')]),
    'PREGUNTA': E('PREGUNTA', 'aula', 7, 1150, [('#', 'id pregunta'), ('*', 'enunciado'), ('*', 'tipo'), ('*', 'puntaje')]),
    'OPCION': E('OPCIÓN DE RESPUESTA', 'aula', 8, 1150, [('#', 'id opción'), ('*', 'texto'), ('*', 'es correcta')]),
    'ENTREGA_TAREA': E('ENTREGA DE TAREA', 'aula', 6, 1460, [('#', 'id entrega'), ('*', 'intento'), ('*', 'entregada en'),
                                                             ('o', 'contenido / archivo'), ('o', 'nota'), ('o', 'retroalimentación')]),
    'MATRICULA_A': E('MATRÍCULA', 'org', 7, 1470, [], ghost=True, ref='MATRICULA'),
    'ACTIVIDAD': E('ACTIVIDAD EN EL AULA', 'aula', 8, 1460, [('#', 'id actividad'), ('*', 'acción'), ('*', 'fecha y hora')]),
    'PUBLICACION': E('PUBLICACIÓN DEL MURO', 'aula', 6, 1780, [('#', 'id publicación'), ('*', 'contenido'), ('o', 'adjunto'),
                                                               ('*', 'fijada')]),
    'COMENTARIO': E('COMENTARIO', 'aula', 7, 1800, [('#', 'id comentario'), ('*', 'contenido'), ('*', 'creado en')]),
    'MENSAJE': E('MENSAJE DE CHAT', 'aula', 6, 2030, [('#', 'id mensaje'), ('*', 'contenido'), ('*', 'enviado en'), ('o', 'leído en')]),
    'USUARIO_A': E('USUARIO', 'seg', 7, 2050, [], ghost=True, ref='USUARIO'),
}

def R(a, b, ca, cb, label, **kw):
    d = dict(a=a, b=b, ca=ca, cb=cb, label=label); d.update(kw); return d

# ca = cardinalidad en el extremo de A (cuántos A por cada B); cb = en el extremo de B (cuántos B por cada A)
RELS = [
    # Seguridad
    R('ROL', 'PERMISO', '0..N', '0..N', 'otorga', id='rol_perm'),
    R('ROL', 'USUARIO', '1', '0..N', 'se asigna a'),
    R('PERSONA', 'USUARIO', '1', '0..1', 'posee cuenta'),
    R('USUARIO', 'SESION', '1', '0..N', 'inicia'),
    R('USUARIO', 'BITACORA', '0..1', '0..N', 'genera'),
    # Comunidad
    R('PERSONA', 'CREDENCIAL', '1', '0..N', 'porta'),
    R('ESTUDIANTE', 'APODERADO', '1..N', '1..N', 'tiene', id='est_apo'),
    # Institución y estructura
    R('INSTITUCION', 'ANIO', '1', '1..N', 'organiza'),
    R('ANIO', 'PERIODO', '1', '1..N', 'se divide en'),
    R('ANIO', 'ESCALA', '1', '1..N', 'define'),
    R('ANIO', 'EVENTO', '1', '0..N', 'programa'),
    R('NIVEL', 'GRADO', '1', '1..N', 'agrupa'),
    R('GRADO', 'CURSO', '0..N', '1..N', 'incluye', id='plan'),
    R('CURSO', 'COMPETENCIA', '0..1', '0..N', 'desarrolla'),
    R('COMPETENCIA', 'CAPACIDAD', '1', '1..N', 'comprende'),
    # Organización y matrícula
    R('ANIO', 'SECCION', '1', '0..N', 'abre'),
    R('GRADO', 'SECCION', '1', '0..N', 'se organiza en'),
    R('TURNO', 'SECCION', '1', '0..N', 'rige'),
    R('DOCENTE', 'SECCION', '0..1', '0..N', 'es tutor de'),
    R('SECCION', 'CURSO_SECCION', '1', '1..N', 'programa'),
    R('CURSO', 'CURSO_SECCION', '1', '0..N', 'se dicta como'),
    R('DOCENTE', 'CURSO_SECCION', '0..1', '0..N', 'tiene a cargo'),
    R('SECCION', 'HORARIO', '1', '0..N', 'distribuye su semana en'),
    R('CURSO_SECCION', 'HORARIO', '0..1', '0..N', 'ocupa'),
    R('ESTUDIANTE', 'MATRICULA', '1', '0..N', 'se matricula'),
    R('SECCION', 'MATRICULA', '1', '0..N', 'acoge'),
    # Evaluación
    R('CURSO_SECCION', 'EVALUACION', '1', '0..N', 'programa'),
    R('PERIODO', 'EVALUACION', '1', '0..N', 'contiene'),
    R('COMPETENCIA', 'EVALUACION', '1', '0..N', 'se evalúa con'),
    R('MATRICULA', 'EVALUACION', '0..N', '0..N', 'obtiene nota en', id='nota'),
    R('MATRICULA', 'CALIFICACION', '1', '0..N', 'consolida'),
    R('PERIODO', 'CALIFICACION', '1', '0..N', 'cierra'),
    R('COMPETENCIA', 'CALIFICACION', '1', '0..N', 'califica'),
    R('MATRICULA', 'LIBRETA', '1', '0..N', 'genera'),
    R('PERIODO', 'LIBRETA', '1', '0..N', 'programa'),
    R('APODERADO', 'LIBRETA', '0..1', '0..N', 'recibe'),
    # Asistencia
    R('HORARIO', 'SESION_CLASE', '1', '0..N', 'se ejecuta en'),
    R('DOCENTE', 'SESION_CLASE', '1', '0..N', 'dicta'),
    R('SESION_CLASE', 'ASISTENCIA', '1', '0..N', 'registra'),
    R('MATRICULA', 'ASISTENCIA', '1', '0..N', 'acumula'),
    R('PERSONA', 'MARCACION', '1', '0..N', 'realiza'),
    R('CREDENCIAL', 'MARCACION', '0..1', '0..N', 'se usa en'),
    R('TURNO', 'MARCACION', '0..1', '0..N', 'evalúa'),
    # Convivencia y comunicación
    R('MATRICULA', 'INCIDENCIA', '1', '0..N', 'registra'),
    R('USUARIO_C', 'INCIDENCIA', '1', '0..N', 'reporta'),
    R('MATRICULA', 'OBSERVACION', '1', '0..N', 'recibe'),
    R('USUARIO_C', 'OBSERVACION', '1', '0..N', 'redacta'),
    R('USUARIO_C', 'COMUNICADO', '1', '0..N', 'publica'),
    R('USUARIO_C', 'NOTIFICACION', '1', '0..N', 'recibe'),
    R('SECCION', 'COMUNICADO', '0..1', '0..N', 'se dirige a', dashed=False),
    R('GRADO', 'COMUNICADO', '0..1', '0..N', 'se dirige a'),
    # Aula virtual
    R('CURSO_SECCION', 'UNIDAD', '1', '0..N', 'tiene'),
    R('PERIODO', 'UNIDAD', '0..1', '0..N', 'enmarca'),
    R('UNIDAD', 'MATERIAL', '1', '0..N', 'contiene'),
    R('UNIDAD', 'TAREA', '1', '0..N', 'propone'),
    R('EVALUACION', 'TAREA', '0..1', '0..N', 'se alimenta de'),
    R('TAREA', 'PREGUNTA', '1', '0..N', 'contiene'),
    R('PREGUNTA', 'OPCION', '1', '0..N', 'ofrece'),
    R('TAREA', 'ENTREGA_TAREA', '1', '0..N', 'recibe'),
    R('MATRICULA_A', 'ENTREGA_TAREA', '1', '0..N', 'presenta'),
    R('MATRICULA_A', 'ACTIVIDAD', '1', '0..N', 'genera'),
    R('MATERIAL', 'ACTIVIDAD', '0..1', '0..N', 'es consultado en'),
    R('TAREA', 'ACTIVIDAD', '0..1', '0..N', 'es consultada en'),
    R('CURSO_SECCION', 'PUBLICACION', '1', '0..N', 'muestra en su muro'),
    R('PUBLICACION', 'COMENTARIO', '1', '0..N', 'recibe'),
    R('CURSO_SECCION', 'MENSAJE', '1', '0..N', 'aloja'),
    R('USUARIO_A', 'PUBLICACION', '1', '0..N', 'escribe'),
    R('USUARIO_A', 'COMENTARIO', '1', '0..N', 'escribe'),
    R('USUARIO_A', 'MENSAJE', '1', '0..N', 'envía'),
]

SPEC = [
    dict(super='PERSONA', super_side='B', subs=['APODERADO', 'ESTUDIANTE', 'DOCENTE'],
         sub_side={'DOCENTE': 'L'}, cx=260, cy=1230, lx=300, ly=1205, label='es un (especialización)'),
]

NOTES = [
    dict(rel='est_apo', title='Vínculo familiar', x=90, y=1480, w=330,
         attrs=['* parentesco', '* es apoderado principal', '* vive con el estudiante', '* autorizado a recoger']),
    dict(rel='plan', title='Plan de estudios', x=1910, y=700, w=330, attrs=['* horas semanales', '* vigente']),
    dict(rel='nota', title='Atributos de la NOTA', x=1000, y=2040, w=340,
         attrs=['o nota numérica (0–20)', 'o nota literal', 'o observación', '* registrada en']),
]
LEGEND_BOX = (2820, 2250, 1290, 690)
