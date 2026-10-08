# -*- coding: utf-8 -*-
# Layout v2 (col, y) aplicado sobre model.py
from model import ENTS, NOTES, SPEC
SPEC[0].update(cy=1280, ly=1255)

POS = {
    'ROL': (0, 290), 'PERMISO': (1, 290), 'USUARIO': (0, 540), 'SESION': (1, 540),
    'PERSONA': (0, 820), 'BITACORA': (1, 820), 'CREDENCIAL': (1, 1110),
    'APODERADO': (0, 1400), 'ESTUDIANTE': (1, 1420),
    'MARCACION': (1, 1740),
    'USUARIO_C': (0, 1880), 'NOTIFICACION': (0, 2020), 'COMUNICADO': (0, 2330),
    'INCIDENCIA': (1, 2100), 'OBSERVACION': (1, 2430),
    'INSTITUCION': (2, 290), 'ESCALA': (2, 610), 'TURNO': (2, 880), 'DOCENTE': (2, 1210),
    'LIBRETA': (2, 1760),
    'ANIO': (3, 290), 'SECCION': (3, 900), 'MATRICULA': (3, 1330), 'ASISTENCIA': (3, 1780),
    'PERIODO': (4, 290), 'EVENTO': (4, 610), 'HORARIO': (4, 1200), 'SESION_CLASE': (4, 1520),
    'NIVEL': (5, 290), 'GRADO': (5, 520), 'CURSO_SECCION': (5, 900), 'EVALUACION': (5, 1330), 'CALIFICACION': (5, 1740),
    'CURSO': (6, 520), 'COMPETENCIA': (7, 520), 'CAPACIDAD': (8, 520),
    'UNIDAD': (6, 900), 'TAREA': (6, 1230), 'ENTREGA_TAREA': (6, 1590), 'PUBLICACION': (6, 1990), 'MENSAJE': (6, 2350),
    'MATERIAL': (7, 900), 'PREGUNTA': (7, 1230), 'MATRICULA_A': (7, 1660), 'COMENTARIO': (7, 2010), 'USUARIO_A': (7, 2380),
    'OPCION': (8, 1230), 'ACTIVIDAD': (8, 1590),
}
for _k, (_c, _y) in POS.items():
    ENTS[_k]['col'] = _c
    ENTS[_k]['y'] = _y
for _k in ('LIBRETA', 'CURSO_SECCION'):
    ENTS[_k].pop('dx', None)

SUBS = {
    'CURSO_SECCION': ('CURSO-SECCIÓN', 'carga académica del docente'),
    'MARCACION': ('MARCACIÓN', 'ingreso / salida del colegio'),
    'HORARIO': ('HORARIO', 'bloque semanal de la sección'),
    'EVALUACION': ('EVALUACIÓN', 'instrumento de evaluación'),
    'LIBRETA': (None, 'informe de progreso al apoderado'),
    'SESION_CLASE': (None, 'clase programada de un día'),
    'MATERIAL': (None, 'recurso del aula virtual'),
    'ASISTENCIA': ('ASISTENCIA', 'del estudiante en la sesión'),
    'OBSERVACION': ('OBSERVACIÓN', 'tutorial / psicopedagógica'),
    'CALIFICACION': ('CALIFICACIÓN', 'resultado del periodo por competencia'),
    'CURSO': ('CURSO', 'área curricular o taller'),
    'INCIDENCIA': ('INCIDENCIA', 'de convivencia (mérito o falta)'),
    'ESCALA': ('ESCALA', 'de calificación del año'),
    'EVENTO': ('EVENTO', 'del calendario escolar'),
    'BITACORA': ('BITÁCORA', 'de auditoría (inmutable)'),
    'CREDENCIAL': ('CREDENCIAL', 'carné con QR para el kiosko'),
}
for _k in ('ASISTENCIA', 'OBSERVACION', 'CALIFICACION'):
    ENTS[_k].pop('w', None)
for _k, (_t, _s) in SUBS.items():
    if _t: ENTS[_k]['title'] = _t
    ENTS[_k]['sub'] = _s
ENTS['CURSO_SECCION']['w'] = 400

NOTES[0].update(x=90, y=1580)
NOTES[1].update(x=2365, y=690)
NOTES[2].update(x=1910, y=1860)
LEGEND_BOX = (1000, 2330, 1290, 610)
