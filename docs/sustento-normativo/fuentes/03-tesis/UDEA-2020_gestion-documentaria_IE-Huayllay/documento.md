---
titulo: "Desarrollo de un Sistema de Información para la Gestión Documentaria de la I.E. Mixta “Señor de Huayllay”, 2019"
emisor: "Candiotti Sarmiento, Yudit — Universidad para el Desarrollo Andino"
fecha: "2020"
fuente: "Repositorio UDEA · CC BY-NC 4.0"
url: "https://hdl.handle.net/20.500.14502/141"
descargado: 2026-11-26
paginas: 108
extraccion: "texto del PDF (pypdf)"
sha256: e3fcb658e2ae012c4f681bf350c5bf8d0388d99c132cc7a8ff863158778e222c
---

# Desarrollo de un Sistema de Información para la Gestión Documentaria de la I.E. Mixta “Señor de Huayllay”, 2019

- **Emisor:** Candiotti Sarmiento, Yudit — Universidad para el Desarrollo Andino
- **Fecha:** 2020
- **Fuente:** [Repositorio UDEA · CC BY-NC 4.0](https://hdl.handle.net/20.500.14502/141)
- **Original:** [documento.pdf](documento.pdf) (108 páginas)
- **Observación:** Licencia no comercial.

> Conversión automática (texto del PDF (pypdf)) para buscar y citar. Puede tener errores de lectura, de columnas o de tablas. **Vale el PDF**: confirme ahí toda cita literal. El número de página es el del archivo PDF.

## Página 1

UNIVERSIDAD PARA EL DESARROLLO ANDINO
“Anti hatun yachay wasi, iskay simi yachachiypi umalliq”
FACULTAD DE CIENCIAS E INGENIERÍA
ESCUELA PROFESIONAL DE INGENIERÍA INFORMÁTICA

TESIS
Desarrollo de un Sistema de Información para la Gestión Documentaria de la
Institución Educativa Mixta "Señor de Huayllay", 2019

Tesis para optar el Título Profesional de
INGENIERO INFORMÁTICO
Presentado por

YUDIT CANDIOTTI SARMIENTO
Asesor
Mg. ROLANDO YOSSEF BENDEZÚ URETA
Lircay-Angaraes-Huancavelica-Perú
2020

## Página 2

DESARROLLO DE UN SISTEMA DE INFORMACIÓN PARA LA GESTIÓN
DOCUMENTARIA DE LA INSTITUCIÓN EDUCATIVA MIXTA "SEÑOR DE
HUAYLLAY", 2019

Autor

YUDIT CANDIOTTI SARMIENTO
Presentado para optar título de ingeniero informático
Asesor
Mg. ROLANDO YOSSEF BENDEZÚ URETA

UNIVERSIDAD PARA EL DESARROLLO ANDINO
FACULTAD DE CIENCIAS E INGENIERÍA
ESCUELA PROFESIONAL DE INGENIERÍA INFORMÁTICA
Lircay
2020

## Página 3

iii

DESARROLLO DE UN SISTEMA DE INFORMACIÓN PARA LA GESTIÓN
DOCUMENTARIA DE LA INSTITUCIÓN EDUCATIVA MIXTA "SEÑOR DE
HUAYLLAY", 2019
Desarrollo de un Sistema de Información para la Gestión Documentaria de la Institución
Educativa Mixta "Señor de Huayllay", 2019

Yudit Candiotti Sarmiento
Universidad Para el Desarrollo Andino
Facultad de Ciencias e Ingeniería
Escuela Profesional de Ingeniería Informática
Lircay - Angaraes - Huancavelica - Perú

Nota del autor
Yudit Candiotti Sarmiento, Mg. Rolando Yossef Bendezu Ureta, Facultad de Ciencias e
Ingeniería, Universidad Para el Desarrollo Andino, Av. Ricardo Fernández N° 103, E-mail:
yudit_20_4@gmail.com

## Página 4

iv

## Página 5

v

UNIVERSIDAD PARA EL DESARROLLO ANDINO
FACULTAD DE CIENCIAS E INGENIERÍA
ESCUELA PROFESIONAL DE INGENIERÍA INFORMÁTICA

DESARROLLO DE UN SISTEMA DE INFORMACIÓN PARA LA GESTIÓN
DOCUMENTARIA DE LA INSTITUCIÓN EDUCATIVA MIXTA "SEÑOR DE
HUAYLLAY", 2019
TESIS
PRESENTADA A LA DIRECCIÓN DE LA ESCUELA PROFESIONAL DE INGENIERÍA
INFORMÁTICA COMO REQUISITO PARCIAL PARA OPTAR EL TÍTULO PROFESIONAL
DE:
INGENIERO INFORMÁTICO

APROBADO POR:

## Página 6

vi

DEDICATORIA
Dedico el trabajo a nuestro creador por brindarme
tenacidad, fortaleza y salud para cumplir este significativo
meta en mi vida profesional. Asimismo, con todo mi amor
a mi querida madre, y a mi amado hijo porque son mi
constante motivación para salir adelante y vencer
cualquier obstáculo que se presente.
Yudit Candiotti Sarmiento

## Página 7

vii

AGRADECIMIENTOS
A la Universidad para el Desarrollo Andino por los
conocimientos recibidos en sus aulas, los cuales permitieron
terminar este trabajo de tesis. A mi asesor de tesis por haber
brindado su colaboración y conocimientos para guiarme y
culminar este proyecto. También a aquellas personas que de
forma desinteresada brindaron su ayuda en todo momento
para la elaboración de esta investigación.
Yudit Candiotti Sarmiento

## Página 8

viii

RESUMEN
El presente estudio se desarrolló bajo la línea de investigación de implementación de las
tecnologías de información y comunicación (TIC), el estudio tiene como objetivo de desarrollar
un sistema de información para optimizar la gestión documentaria de la Institución Educativa
Mixta “Señor de Huayllay”, 2019, tipo de investigación es cuantitativo de nivel descriptivo
correlacional y diseño no experimental transversal. La población para la presente investigación
está constituida por 240 personas, la muestra representada por 148 personas entre las cuales se
tiene a los docentes, administrativo, alumnos, padres de familias de la Institución. El tipo de
muestreo fue no probabilístico, la técnica empleada para la recopilación de datos fue encuestas, el
instrumento que se va utilizar para recolección de datos es en cuentas y cuestionarios para las
variables de estudio, con una escala de Likert graduado de la siguiente manera: Deficiente (1),
Regular (2), Bueno (3), Muy bueno (4), Excelente (5), luego para procesar las informaciones se
utilizará el software estadístico SPSS y Excel 2019. Así mismo, para la contratación de las
hipótesis plateado se utilizará la prueba de correlación del Chi cuadrado de Pearson, con ello se
demostrará la relación existente entre las variables involucradas en el estudio.
Para la elaboración del sistema de información y el cumplimiento de los objetivos planteados
se utiliza como lenguaje de programación a Power Builder y el sistema manejador de base de datos
SQL Server, mediante ello se desarrollará el sistema de información de la Institución Educativa
Mixta “Señor de Huayllay”, se optimizará los procesos de gestión documentaria e incrementando
la satisfacción de estudiantes y del personal.
Palabras claves: Sistema de información, gestión documentaria.

## Página 9

ix

ABSTRACT

This study was developed under the research line of implementation of information and
communication technologies (ICT), the study aims to develop an information system to optimize
the documentary management of the Mixed Educational Institution "Señor de Huayllay", 2019,
type of research is quantitative with a descriptive correlational level and a not experimental cross
sectional design. The population for the present research is made up of 240 people, the sample
represented by 148 people, among whom are the teachers, administrative staff, students, parents
of the Institution. The type of sampling was non probabilistic, the technique used for data
collection was surveys, the instrument to be used for data collection is in accounts and
questionnaires for the study variables, with a Likert scale graduated as follows : Poor (1), Regular
(2), Good (3), Very good (4), Excellent (5), then the statistical software SPSS and Excel 2019 will
be used to process the information. Likewise, for the contracting of the Silver hypothesis, Pearson's
Chi square correlation test will be used, thereby demonstrating the relationship between the
variables involved in the study.
For the elaboration of the information system and the fulfillment of the proposed objectives,
Power Builder and the SQL Server database management system are used as the programming
language, through which the information system of the Mixed Educational Institution "Señor de
Huayllay ”, the document management processes will be optimized and the satisfaction of students
and staff will be increased.
Keywords: Information system, document management.

## Página 10

x

CHINTI
Kay yachay maskayqa ruwasqa karqan, maskay taripay ruway tecnología willana rimanakuy
(TIC) nisqanwan, kay yachay maskaypa patqayninmi maskarichkan away willana chaymanta
sumaq ruwayta allin ruwaykuna qillqasqa willakuqpi kay Yachay Wasi warmi qaripaq “Señor
de Wayllay”, 2019, kay yachay maskaymi cuantitativo nisqan patay correlacional chaymanta sikwi
mana experimental transversal nisqan. Llapan miraq kaqkunam kay maskaypaq karqan 240
runakuna, qawachina rantichaynin kasqa 148 runakunawan chaykunamantan kachkan
yachachiqkuna, yachaywasipi llamkaqkuna, yachapakuqkuna, tayta mamakuna llapan yachay
wasipa. Kay maskay qawachinaqa karqan, mana probabilístico, yachay huñuy willaykunapaqtaq
karqan tapuy hinaspa sapan tapukuykuna yupachakuynin maskay yachaypaq, escala Likert
nisqawan riqsisqa kayman hina: Mana paqtaq (1) Kutinchaq (2), Allin (3), Llunpay allin (4),
qullana (5), chaymanta ichiyninkuna ruranapaq hatallirqanchik kay yuyay ñiqiq yachayninmi
karqa SPSS chaymantapas Excel 2019 nisqan. Hinallataq chiqanchanapaq kay yanqalla ñiy
yachaywan ruwasqa hatallinapa tupu rikchakupaq karqa Chi cuadrado de Pearson nisqanwan,
chaywan kaqta qawachinapaq kay parischachiyta yupachakuy chaqrusqa yachay maskaypi.
Kay ruway away willanapan chaymantapas huntachinapaq llapan patqaykuna yachaywan
ruwasqa hatallinapaqmi simi kamachinapaq Power Builder nisqan chaymantapas awariy pusay
willaqkunapa taqin SQL Server, chaymantapas ruwakunqa willay awariypa willanan Yachay
Wasi “Señor de Wayllay”, kaywanmi sumaq ruway kanqa ichiyninkuna allin ruway qillqasqapi
ruwakuykuna chaymantapas mirarichisun allin kayta yachapakuqkunapi hinaspa llapan
llamkaqkunapi.
Simi Rimay kichana: Away willana, qillqasqapi allin ruway.

## Página 11

xi

ÍNDICE

DEDICATORIA ....................................................................................................................... iii
AGRADECIMIENTOS ........................................................................................................... vii
RESUMEN .............................................................................................................................. viii
ABSTRACT .............................................................................................................................. ix
CHINTI ...................................................................................................................................... x
ÍNDICE ..................................................................................................................................... xi
ÍNDICE DE TABLAS ............................................................................................................. xv
ÍNDICE DE FIGURA ............................................................................................................ xvii
INTRODUCCIÓN .................................................................................................................. xix
CAPÍTULO I ............................................................................................................................ 21
MARCO TEÓRICO, HIPÓTESIS Y VARIABLES ............................................................... 21
1.1. Marco teórico .................................................................................................................... 21
1.1.1. Antecedentes ....................................................................................................... 21
1.1.1.1. A nivel internacional ...................................................................................... 21
1.1.1.2. A nivel nacional .............................................................................................. 22
1.1.2. Bases teóricas ...................................................................................................... 27
1.1.2.1. Sistema de información .................................................................................. 27
1.1.2.1.1. Definición ................................................................................................ 27
1.1.2.1.2. Sistema ..................................................................................................... 28
1.1.2.1.3. Información .............................................................................................. 28
1.1.2.2. Actividades básicas de S.I .............................................................................. 29
1.1.2.2.1. Entrada de información ............................................................................ 29

## Página 12

xii

1.1.2.2.2. Almacenamiento de información ............................................................. 29
1.1.2.2.3. Procesamiento de información ................................................................. 30
1.1.2.2.4. Salida de información .............................................................................. 30
1.1.2.3. Elementos de sistema de información ............................................................ 31
1.1.2.4. Tipos de sistemas de información .................................................................. 32
1.1.2.5. Clasificación de sistemas de información ...................................................... 33
1.1.2.5.1. Por el grado de formalidad ....................................................................... 34
1.1.2.5.2. Por el nivel de automatización conseguido .............................................. 34
1.1.2.5.3. Por su relación con la toma de decisiones ............................................... 34
1.1.2.5.4. Por la naturaleza de sus entradas y salidas............................................... 34
1.1.2.5.5. Por el origen y el grado de personalización ............................................. 35
1.1.2.5.6. Por el valor que representan para la organización ................................... 35
1.1.2.6. Base de datos .................................................................................................. 35
1.1.2.6.1. Microsoft SQL Server .............................................................................. 36
1.1.2.6.2. Pasos para diseñar una base de datos ....................................................... 37
1.1.2.7. Programación orientada a objetos .................................................................. 38
1.1.2.8. Power builder ................................................................................................. 39
1.1.2.9. Programación orientada a objetos en power builder ...................................... 39
1.1.2.10. Gestión documentaria ................................................................................... 40
1.1.2.10.1. Objetivos de gestión documentaria ........................................................ 41
1.1.2.10.2. Normalización de gestión documentaria ................................................ 42
1.1.2.10.3. Programa de gestión documentaria ........................................................ 45
1.1.2.10.4. Ciclo de vida de documentos ................................................................. 46

## Página 13

xiii

1.1.2.10.5. Fases del sistema de gestión documentaria ............................................ 47
1.2. Hipótesis y variables ......................................................................................................... 51
1.2.1. Hipótesis .............................................................................................................. 51
1.2.1.1. Hipótesis general ............................................................................................ 51
1.2.1.1. Hipótesis especifico ........................................................................................ 51
1.2.2. Identificación y operacionalización de variables ................................................ 51
1.2.2.1. Variable de la investigación ........................................................................... 51
1.2.2.1.1. Variable independiente ............................................................................ 51
1.2.2.1.2. Variable dependiente ............................................................................... 51
1.2.2.2. Operacionalización de variables ..................................................................... 52
CAPÍTULO II .......................................................................................................................... 53
METODOLOGÍA DE LA INVESTIGACIÓN ....................................................................... 53
2.1. Tipo investigación ............................................................................................................. 53
2.2. Nivel de investigación ....................................................................................................... 53
2.3. Diseño de la investigación ................................................................................................ 54
2.4. Población y muestra .......................................................................................................... 54
2.4.1. Población ............................................................................................................. 54
2.4.2. Muestreo y Muestra ............................................................................................. 55
2.4.2.1. Muestreo ......................................................................................................... 55
2.4.2.2. Muestra ........................................................................................................... 55
2.5. Técnicas e instrumentos de recolección de datos .............................................................. 56
2.5.1. Técnicas de recolección de datos ........................................................................ 56
2.5.2. Instrumentos de recolección de datos.................................................................. 56

## Página 14

xiv

2.6. Aplicación de instrumentos o trabajo de campo ............................................................... 57
CAPÍTULO III ......................................................................................................................... 58
RESULTADOS DE LA INVESTIGACIÓN ........................................................................... 58
3.1. Presentación e interpretación de datos .............................................................................. 58
3.1.1. Confiabilidad del instrumento: ............................................................................ 58
3.1.2. Discusiones.......................................................................................................... 80
3.1.3. Proceso de prueba de hipótesis............................................................................ 82
CONCLUSIONES ................................................................................................................... 85
RECOMENDACIONES .......................................................................................................... 86
BIBLIOGRAFÍA ...................................................................................................................... 87
GLOSARIO .............................................................................................................................. 90
ANEXO ................................................................................................................................. 92
ANEXO Nº 1: MATRIZ DE CONSISTENCIA ...................................................................... 93
ANEXO Nº 2: OPERACIONALIZACIÓN DE VARIABLES ............................................... 94
ANEXO Nº 3: CREACIÓN DE PROCESAMIENTO DE DATOS ........................................ 95
ANEXO Nº 4: MANUAL DE USUARIO ............................................................................. 103

## Página 15

xv

ÍNDICE DE TABLAS

Tabla 1. Selección de muestra ..................................................................................................... 55
Tabla 2. Criterios de confiabilidad – Alfa de Cronbach .............................................................. 58
Tabla 3. Resumen de procesamiento de casos .............................................................................. 59
Tabla 4. Estadísticas de fiabilidad ................................................................................................ 59
Tabla 5. Estadísticos descriptivos ................................................................................................. 60
Tabla 6. Estadísticas de elemento de resumen .............................................................................. 61
Tabla 7. ¿La entrada de información se proporciona de forma adecuada con el sistema de
información? ................................................................................................................................. 61
Tabla 8. ¿Las entradas de informaciones se muestra de forma automática con el sistema de
información? ................................................................................................................................. 63
Tabla 9. ¿Con el sistema de información los ingresos de informaciones se registran con precisión?
....................................................................................................................................................... 64
Tabla 10. ¿El sistema de información acopia los datos registrados automáticamente en la unidad
de almacenamiento del PC? ......................................................................................................... 65
Tabla 11. ¿Cree usted que el sistema de información actual almacena los datos con confiabilidad?
....................................................................................................................................................... 66
Tabla 12. ¿Cree usted que el sistema de información Facilita el almacenamiento de datos en otros
dispositivos? .................................................................................................................................. 66
Tabla 13. ¿Cree usted que el sistema de información Facilita el almacenamiento de datos en otros
dispositivos? .................................................................................................................................. 67
Tabla 14. ¿El sistema de información proporciona a los usuarios descargar las informaciones en
Excel? ............................................................................................................................................ 69
Tabla 15. ¿Es trascendental la salida de información con el sistema de información? .............. 70

## Página 16

xvi

Tabla 16. ¿El sistema de información cumple en su totalidad con sus funciones de gestión
documentaria? .............................................................................................................................. 71
Tabla 17. ¿Con el sistema de información implantado los documentos registrados se ordenan en
forma adecuada? .......................................................................................................................... 72
Tabla 18. ¿Cree usted con el sistema de información las informaciones se hallan en uso
permanente? .................................................................................................................................. 73
Tabla 19. ¿Los documentos cumplen su valor administrativo con eficaz con el sistema de
información implantado? .............................................................................................................. 74
Tabla 20. ¿Considera usted que el sistema de información actual puede hacer consultas o
búsquedas fácilmente los documentos en el archivo central? ...................................................... 75
Tabla 21. ¿Cree usted que el sistema de información actual maneja los datos del archivo central
actualizado? .................................................................................................................................. 76
Tabla 22. ¿Cree usted que el sistema de información implantado accede con seguridad a los datos
historiales de gestión documentaria? ........................................................................................... 77
Tabla 23. ¿El sistema de información implementado es confiable en búsqueda de archivos
historiales? .................................................................................................................................... 78
Tabla 24. ¿El sistema de información implantado es importante para manejo de informaciones
historiales? .................................................................................................................................... 79
Tabla 25. Pruebas de chi cuadrado .............................................................................................. 83

## Página 17

xvii

ÍNDICE DE FIGURA

Figura 1. Actividades básicas de un sistema de información ------------------------------------------ 31
Figura 2. Tipos de sistemas de informaciones ----------------------------------------------------------- 33
Figura 3. Base de datos ------------------------------------------------------------------------------------- 36
Figura 4. ¿La entrada de información se proporciona de forma adecuada con el sistema de
información? -------------------------------------------------------------------------------------------------- 62
Figura 5. ¿Las entradas de informaciones se muestra de forma automática con el sistema de
información? -------------------------------------------------------------------------------------------------- 63
Figura 6. ¿Con el sistema de información los ingresos de informaciones se registran con precisión?
------------------------------------------------------------------------------------------------------------------ 64
Figura 7. ¿El sistema de información acopia los datos registrados automáticamente en la unidad
de almacenamiento del PC? --------------------------------------------------------------------------------- 65
Figura 8. ¿Cree usted que el sistema de información actual almacena los datos con confiabilidad?
------------------------------------------------------------------------------------------------------------------ 66
Figura 9. ¿Cree usted que el sistema de información Facilita el almacenamiento de datos en otros
dispositivos?--------------------------------------------------------------------------------------------------- 67
Figura 10. ¿Cree usted que el sistema de información Facilita el almacenamiento de datos en otros
dispositivos?--------------------------------------------------------------------------------------------------- 68
Figura 11. ¿El sistema de información proporciona a los usuarios descargar las informaciones en
Excel? ---------------------------------------------------------------------------------------------------------- 69
Figura 12. ¿Es trascendental la salida de información con el sistema de información? ----------- 70
Figura 13. ¿El sistema de información cumple en su totalidad con sus funciones de gestión
documentaria? ------------------------------------------------------------------------------------------------ 71

## Página 18

xviii

Figura 14. ¿Con el sistema de información implantado los documentos registrados se ordenan en
forma adecuada? ---------------------------------------------------------------------------------------------- 72
Figura 15. ¿Cree usted con el sistema de información las informaciones se hallan en uso
permanente? --------------------------------------------------------------------------------------------------- 73
Figura 16. ¿Los documentos cumplen su valor administrativo con eficaz con el sistema de
información implantado? ------------------------------------------------------------------------------------ 74
Figura 17. ¿Considera usted que el sistema de información actual puede hacer consultas o
búsquedas fácilmente los documentos en el archivo central? ------------------------------------------ 75
Figura 18. ¿Cree usted que el sistema de información actual maneja los datos del archivo central
actualizado? --------------------------------------------------------------------------------------------------- 76
Figura 19. ¿Cree usted que el sistema de información implantado accede con seguridad a los datos
historiales de gestión documentaria? ---------------------------------------------------------------------- 77
Figura 20. ¿El sistema de información implementado es confiable en búsqueda de archivos
historiales? ----------------------------------------------------------------------------------------------------- 78
Figura 21. ¿El sistema de información implantado es importante para manejo de informaciones
historiales? ----------------------------------------------------------------------------------------------------- 79

## Página 19

xix

INTRODUCCIÓN
Sabemos que las tecnologías son una de los métodos que evoluciona vertiginosamente impulsada
por el fenómeno de la globalización. En la actualidad la mayor parte de desarrollo tecnológico en
nuestro planeta, está ligado hacia el perfeccionamiento de software de informaciones lo que ha
generado la visión de nuevas tecnologías internet y/o aplicaciones.
El sistema de información de gestión documentaria es una herramienta que proporciona el control
de las diversas actividades que involucran los procedimientos de la gestión documentaria, asegurar
la correcta utilización del sistema en todas y cada una de las oficinas, programas y proyectos
adscritos para obtener información oportuna y confiable asegurando una buena atención a los
estudiantes y padres de familias.
Para lograr este propósito, se ha elaborado el presente proyecto de investigación que se encuentra
estructurado en los siguientes capítulos:
Capítulo I, se instituye el marco teórico efectuando una recopilación de antecedentes de los
estudios e investigaciones, el desarrollo de la temática correspondiente al tema investigado, de la
misma manera se identifican las variables evidentemente con estos conocemos más el tema para
conseguir los procesos se afinen y obtener los resultados de acuerdo a nuestros indicadores e
hipótesis, esto es fundamental en todo el desarrollo de la investigación.
Capítulo II, se indica la metodología de investigación, tipo, nivel y diseño de investigación,
población de estudio, tamaño y selección de muestra, las técnicas de recolección y procesamiento
de los datos, aplicación de instrumentos o trabajo del campo.
Capítulo III, en este capítulo mostraremos los resultados logrados durante todo el proceso de
investigación, diseño y desarrollo. Finalmente, presentamos las conclusiones, recomendaciones de

## Página 20

xx

la investigación y en los anexos se incluye la matriz de consistencia, instrumentos de recolecciones
de datos, operacionalización de variables independientes y dependiente entre otros.

## Página 21

21

### CAPÍTULO I
MARCO TEÓRICO, HIPÓTESIS Y VARIABLES
1.1. Marco teórico
1.1.1. Antecedentes
Como consecuencia del presente estudio se revisaron investigaciones previas
relacionadas con el tema a través de diferentes autores, por lo que, se han identificado
algunos trabajos que representan un enfoque similar a la presente tesis, estos son:
1.1.1.1. A nivel internacional
- Campillo (2016), en su tesis de doctor titulado “Sistema de Gestión
Integral de documentos de archivo para empresas de la construcción del
Territorio de Camaguey”. La autora sostiene que las gestiones de las
documentaciones son procesos que protege a la organización de cualquier
situación de riesgo pues facilita el desarrollo, la toma de decisiones y la
seguridad económica, una adecuada de gestiones de documentarios
produce beneficios inmediatos a las organizaciones pues permite el
establecimiento del ciclo de vida completo de documento, su tratamiento
ordenado y lógico, desde el instante que se crean o se reciben hasta que
son conservados o eliminados, en dependencia de manejos que posea la
institución. Para llevar adelante y de manera eficaz el proceso de gestión
de documentos en las empresas se precisa de un buen análisis de la
información documental, esta fase comprende principalmente la
identificación y reconocimiento de los distintos tipos de documentos de
las organizaciones, así como un estudio preliminar. Las empresas

## Página 22

22

cubanas necesitan de inmediato el control y administración de
documentos, como un elemento indispensable para lograr los objetivos
de organizaciones, las administraciones de documentos convierten en un
reto competitivo que requiere un cambio en las concepciones de las
gestiones de documentos, para el mejoramiento y la eficiencia en
manejos de las documentaciones, un sistema de gestión de documentos
garantiza las correctas gestiones de sus fondos, los elementos necesarios
para ejecuciones del método archivísticos en las empresas. El diseño e
implantación de SiGeID 1.0, se tuvo en cuenta las herramientas
fundamentales que aporta la norma ISO 15489 2:2006, con un
fundamento teórico dado, acentuado en el documento como testimonio,
prueba o evidencia de los actos o transacciones de la sociedad, lo cual
permitió entre otras cuestiones, diagnóstico del estado actual de la gestión
de documentos en la organización, análisis de las actividades de las
organizaciones con enfoque sistémico, análisis sistemáticos de las
penurias en las organizaciones, determinación de las políticas,
procedimientos y normas, el análisis de otros sistemas de gestión de
documentos ya existentes en la organización.
1.1.1.2. A nivel nacional
- Loayza y Ochoa (2017), en sus tesis titulado “Análisis al Sistema
Trámite Documentario y el Servicio de Atención en las Universidades
Públicas de Lima Metropolitana”, el estudio responde a un diseño no
experimental de corte transversal descriptiva cuantitativa porque tiene

## Página 23

23

como fin investigar la influencia y los valores en que se presenta una o
más variables.
La población del estudio está constituida por 54,352 alumnos de las
Universidades Públicas de Lima Metropolitana, la muestra fue
determinada de manera probabilística obteniendo como resultado 412
alumnos a quienes se les aplicó el cuestionario.
Para recolectar los datos respecto al comportamiento de las variables
independiente y dependiente de la tesis, se eligió como técnica de
recolección el cuestionario constituido por 20 preguntas con escala de
valoración de Likert y 10 preguntas dicotómicas con dos valores posibles,
como sí y no.
Para el estudio, se usó el programa estadístico SPSS, la información
proporcionada por los alumnos fueron tabuladas y sometidas a un
proceso de análisis por cada pregunta del cuestionario, obteniendo
resultados de la investigación. Se ha contrastado las hipótesis propuestas
en la tesis con la técnica estadística del Chi cuadrado y los resultados se
están presentado en tablas y gráficos. Por último, se ha demostrado la
causa efecto de las variables: (VI) Implementación del software de
trámite documentario en línea con la (VD) Satisfacción en los usuarios
de las Universidades Públicas de Lima Metropolitana. Como parte final,
se presenta las conclusiones y recomendaciones como propuestas del
trabajo de investigación.

## Página 24

24

- Vega y Alfonso (2016), en sus tesis titulado “Gestión Documental del
departamento de administración documentaria de la Universidad de
Lima”. Tesis para optar el Título. Universidad Nacional Mayor de San
Marcos. Lima, Perú.
El autor sostiene que el análisis del Departamento de Administración
Documentaria (DAD) de la Universidad de Lima se realizó el uso de
norma NTP ISO/TR 15489 2 que permitió conocer si en realidad cumplía
con los requisitos establecidos para los procesos archivísticos. También
menciona que analizo dos gestores documentales mediante una tabla de
comparación basado en lo propuesto por Raquel Gómez Díaz, para
determinar cuál es el más óptimo para gestionar las imágenes
digitalizadas y facilitar el proceso de descripción. En sus conocimientos
archivísticos en DAD son conformes a las normas empleadas, sin
embargo, no cuenta con directrices que reflejen realizado en la práctica.
El análisis de los gestores documentales sugiere la implementación del
software para agilizar la causa de descripción documental y facilitar las
búsquedas de documentaciones en físico y digital. La comparación con
la norma NTP ISO/TR 15489-2 también evidenció que, si bien los
procesos archivísticos se realizan acorde a los requisitos de la norma, no
se cuenta con directrices que establezcan lo realizado en la práctica, esto
dificulta el diseño de mejora de los procesos archivísticos. Finalizan
mencionando que la comparación de los softwares de gestión documental
determinó como mejor opción el programa Athento, ha sido determinante

## Página 25

25

el aspecto de requisitos archivísticos donde Alfresco obtuvo el 70,96%
de cumplimiento y Athento el 83,87%, los puntos determinantes que
marcan la diferencia con las descripciones y búsquedas de documentos,
ambos puntos cuentan con mayores opciones y potencialidades para el
proceso de registro y acceso de documentos.
- Blancas y Córdova (2019), en sus tesis titulado “ Implementación del
Sistema Información del Sistema de Trámite Documentario para Mejorar
la Comunicación Interna en el Hospital Nacional “Ramiro Prialé”,
Huancayo 2019”, desarrollando e impulsando el progreso de servicios de
dicha entidad; producto de una reforma en su proceso de tramitación. La
implementación del Software facilita los ordenamientos para optimizar
el trámite documental, facilitando el seguimiento y la capacidad
resolutiva en menor tiempo posible, igual que redunda en beneficio del
consolidado permitiendo brindarle la eficacia del servicio que requiere.
En la realidad los seguimientos y controles del documento representa un
reto para las instituciones en donde es gestionado un gran volumen de
informaciones y que en su mayoría realizan manualmente dilatando el
tiempo. Pero gracias a las tecnologías de las informaciones se ha
permitido grandes avances en las gestiones de documentarias
administrativos, mediante los sistemas de gestión documental. Estos
softwares permiten automatizar las gestiones, haciendo los procesos más
rápidos y eficientemente.

## Página 26

26

Como resultado se consiguió efectuar un sistema de información para que
los usuarios directos (personal administrativo) conozcan el programa de
tramite documentario en un 100% con todos sus aplicativos, permitiendo
reducir el tiempo de atención de tramitación de documentarias.
Concluye que la actual tesis admite optimizar la calidad del servicio que
brinda el área de mesa de partes y en las áreas administrativas mediante
un sistema web para el seguimiento y trámite de los documentos.
- La tesis titulada: “Sistema de información web y su mejora en la gestión
académica del colegio privado Hans Ke Lsen del Distrito de Florencia de
Mora Trujillo”. Presentado por Enríquez (2016), en la ciudad de Trujillo
Perú, la institución que lo respaldo fue la Universidad Nacional de
Trujillo, su objetivo fue mejorar la Gestión Académica de la Institución
Educativa Hans Kelsen del Distrito de Florencia de Mora Trujillo, con la
implementación de un Sistema de información. Alcanzando las
siguientes terminaciones:
▪ El nivel de satisfacción del personal con el sistema actual es de 2.58
(51.60%) y con la implementación del sistema es de 4.07 (81.40%),
lográndose un incremento de 1.49 (29.80%).
▪ El tiempo de procesos de las gestiones académicas con el programa
actual es de 6.99 min. (100%) y con la implementación del programa
es de 2.33 min. (33.33%), lográndose una reducción de 4.66 min.
(66.67).

## Página 27

27

1.1.2. Bases teóricas
1.1.2.1. Sistema de información
1.1.2.1.1. Definición
Según Laudon y Laudon (2012), un sistema de información es un
conjunto de componentes interconectados para recoger, manipular
los datos, informaciones y para disponer los componentes de
retroalimentaciones útil para desempeño de los objetivos. Todos
interactuamos en forma permanente con sistemas de información,
tanto personales como profesionales; utilizamos cajeros
automáticos, empleados de las tiendas registran compras
sirviéndose de códigos de barras y escáner, obteniendo
informaciones en módulos equipados con pantallas sensibles al
tacto, muy célebres touch screen. Las principales compañías
invierten en la realidad más de 1,000 millones de dólares al año en
tecnologías de informaciones y ha futuro mayoría de los humanos
dependeremos de los softwares de informaciones.
En una terminología se puede decir que un S.I son grupos de
elementos que interactúa para que las compañías puedan conseguir
sus metas satisfactoriamente. Según COBIT los componentes o
recursos de un S.I son los siguientes:
A. Datos. En términos generales se consideran los datos tanto
estructurados y no estructurados como imágenes, sonidos, etc.

## Página 28

28

B. Aplicaciones. Contienen las aplicaciones manuales y
informáticas.
C. Infraestructura. En infraestructura se incluyen las
tecnologías y las instalaciones (por ejemplo, hardware,
sistemas operativos, sistema de gestión de base de datos,
sistemas de red, multimedias) que permiten que se procesen
las aplicaciones. (Senn, 1992)
D. Personal. Los conocimientos que tiene el personal de los
sistemas de información son para planificar, organizar,
administrar y gestionar.
1.1.2.1.2. Sistema
Según Fernández (2012), expresa que sistema es cualquier
conjunto de dispositivos que colaboran en la ejecución de una tarea;
asimismo se refiere a cualquier recopilación o combinación de
programas, procedimientos, datos y equipamiento utilizado en el
procesamiento de información, software de facturación,
contabilidad y un sistema de gestión de base de datos.
1.1.2.1.3. Información
Las informaciones son conjuntos de datos acerca de algún hecho,
suceso, situación o fenómeno, que organizados en un contexto
señalado tienen su significado, cuya determinación puede ser el de
disminuir la inseguridad o aumentar el conocimiento acerca de
algo. (Castellanos, 2008, p. 10)

## Página 29

29

Los investigadores consideran que las informaciones son
conjuntos de caracteres, que se van aglutinando para crear una
cadena de palabras con la finalidad de manifestar un mensaje
entendible para el ser humano como también es la base para el
análisis de cualquier tema. (Castellanos, 2008, p. 10)
1.1.2.2. Actividades básicas de S.I
1.1.2.2.1. Entrada de información
Es el proceso donde los sistemas de informaciones toman los datos
para procesar las informaciones. Existen dos tipos de entradas, que
son manuales y automáticas. La entrada manual es aquella que se
proporciona de forma directa por el consumidor, y la entrada
automática son fichas o informaciones que es tomado de otro sistema
o módulo, denominado interfaz automático. (Maratalla, 2002, p. 35)
Entre los dispositivos típicas de entrada de datos a los PCs tenemos:
los códigos de barras, la voz, las cintas magnéticas, el teclado, las
terminales, los monitores sensibles, las unidades de diskette, los
escáneres, entre otros.
1.1.2.2.2. Almacenamiento de información
Los almacenamientos son capacidades y actividades más relevantes
e importantes que cumple una computadora, debido que mediante esta
pertenencia el programa puede rememorar las informaciones guardada
en el proceso anterior o selección. Estas informaciones suelen ser
acumulada en estructuras de informaciones denominadas archivos.

## Página 30

30

Entre las unidades típicas de almacenamiento tenemos: los diskettes,
discos flexibles, discos magnéticos, discos duros y los discos compactos
(CD ROM). (Maratalla, 2002, p. 37)
1.1.2.2.3. Procesamiento de información
Son las capacidades de un sistema de información para ejecutar
automatizaciones de acuerdo con una sucesión de operaciones
preestablecida. Dichos cálculos se pueden realizar con datos que están
acumulados en el programa y con datos recientemente ingresados en el
software. Estas características de los softwares permiten la evolución
de datos fuente en informaciones que podría ser manejadas para una
toma de decisiones que hace permisible, que un tomador de decisiones
realiza una proyección financiera a partir de las informaciones que
contiene un estado de respuestas y un balance global. (Maratalla, 2002,
p. 38)
1.1.2.2.4. Salida de información
Las salidas son capacidades de los softwares de informaciones para
obtener las informaciones procesadas al exterior. Las unidades típicas
de salida son los diskettes, graficadores, impresoras, plotters, voz,
terminales, cintas magnéticas. Es trascendental esclarecer las salidas de
los softwares de informaciones puede formar ingresos a un nuevo
sistema de información. Para este caso, asimismo existe una interface
automática de salida. Por ejemplo, software de control de beneficiarios
tiene una interface automática de salida con el software de contabilidad,

## Página 31

31

ya que genera las pólizas contables de los movimientos procesales de
los beneficiarios. (Fernández, 2012)

Fuente: (Elaboración propia, 2020)
1.1.2.3. Elementos de sistema de información
Según Kendall y Kendall (2011), entre los elementos más relevantes del
sistema de información tenemos:
A. Financieros. Es el aspecto económico que admite la obtención,
mantenimiento y contratación de los restante recursos que componen
un sistema de información. (Kendall y Kendall, 2011, p. 10)
B. Administrativos. Es la estructura orgánica de lineamientos,
procedimientos, objetivos, funciones, dirección, departamentalización
y controles de las actividades; que sustenta la creación y utilización de
los softwares. (Kendall y Kendall, 2011, p. 10)
C. Humanos. Está compuesto por dos grupos: Primero son técnicos, que
posee los conocimientos especializados en el desarrollo de softwares,
siendo los analistas, administradores, programadores, líderes de
proyecto, capturistas y operadores. Segundo el beneficiario, constituido
Entrada
Proceso
Salida
Almacenamiento
Figura 1. Actividades básicas de un sistema de información

## Página 32

32

por las personas interesadas en la conducción de las informaciones vía
computo. (Kendall y Kendall, 2011, p. 10)
D. Materiales. Son aquellos elementos físicos que soportan el
funcionamiento de un sistema de información, por ejemplo:
instalaciones eléctricas, medios de comunicaciones, aire
acondicionado, mobiliario, papelería, etc. (Kendall y Kendall, 2011, p.
11)
E. Tecnológicos. Es el conjunto de experiencias, metodología,
conocimientos y técnicas; que ubican el mantenimiento, operación y
creación de un software. (Kendall y Kendall, 2011, p. 12)
1.1.2.4. Tipos de sistemas de información
Laudon y Laudon (2012), en su libro “Sistemas de Información Gerencial”.
Plantea cuatro principales tipos de sistemas de información que dan servicio
a los diferentes niveles de las organizaciones:
• Los sistemas de Nivel Operativo ayudan a los gerentes operativos en el
seguimiento de las actividades y transacciones elementales de
organizaciones como venta, ingreso, depósito en efectivos, nóminas,
decisiones de créditos y flujos de materiales en las fábricas. (Laudon y
Laudon, 2012, p. 10)
• Los sistemas en Nivel del Conocimiento apoyan a los trabajadores del
conocimiento y de datos de una organización. El propósito de estos
softwares es apoyar a las empresas comerciales a integrar el nuevo

## Página 33

33

conocimiento en los negocios y ayudar a la organización a controlar el
flujo del trabajo de oficina. (Laudon y Laudon, 2012, p. 10)
• Los sistemas en Nivel Administrativo sirven a las actividades de
supervisión, control, toma de decisiones y administrativas de los gerentes
de nivel medio.
• Los sistemas en Nivel Estratégico apoyan a los directores a enfrentar y
solucionar aspectos estratégicos y tendencias a largo plazo, tanto en las
empresas como en los entornos. (Laudon y Laudon, 2012, p. 11)

Fuente: (Laudon y Laudon, 2012, p. 11)
1.1.2.5. Clasificación de sistemas de información
Fernández (2006), en su libro “desarrollo de sistemas de información”,
propone diversos criterios para la clasificación de los sistemas de
información:
Figura 2. Tipos de sistemas de informaciones

## Página 34

34

1.1.2.5.1. Por el grado de formalidad
Sistemas de información formales y los informales.
1.1.2.5.2. Por el nivel de automatización conseguido
En las organizaciones, pueden existir sistemas que necesitan una
alta participación de los trabajadores poco automatizadas (Por
ejemplo, los sistemas para responder a preguntas personalizadas a
través de un e_mail), mientras que otros sorteares son capaces de
trabajar sin la intervención humana muy automatizadas (por ejemplo,
las centrales telefónicas totalmente automatizadas). (Fernández, 2006,
p. 8)
1.1.2.5.3. Por su relación con la toma de decisiones
Una de las funciones que deben cumplir los sistemas de información
es colaborar en la toma de decisiones. En función del lugar jerárquico
en donde se tomen las decisiones, los sistemas de información se podrán
clasificar en estratégicos, de control u operativos. (Fernández, 2006, p.
8)
1.1.2.5.4. Por la naturaleza de sus entradas y salidas
Un sistema de información puede recibir informaciones de diversas
fuentes de informaciones (personas, empresas, otros sistemas de
información, etc.) así como en distintos formatos (a través de un
teclado, por la red, de un disquete, memoria USB, CD, DVD etc.) del
mismo modo, el sistema de información puede proporcionar

## Página 35

35

información a través de distintos formatos (impreso, por pantalla, en
internet, etc.). (Fernández, 2006, p. 10)
1.1.2.5.5. Por el origen y el grado de personalización
En las empresas se pueden encontrar sistemas de información que
han sido diseñados e implementados sólo ara ellos, o también sistemas
comprados que son utilizados por otras empresas. (Fernández, 2006,
p. 10)
1.1.2.5.6. Por el valor que representan para la organización
El software que contiene las informaciones de los clientes suele tener
una mayor importancia que el sistema de información de presupuestos
(ya que este es más sencillo y se puede hacer manualmente).
(Fernández, 2006, p. 10)
1.1.2.6. Base de datos
Según Torres (2017), una base de datos es una colección de datos
interrelacionados almacenados en conjunto sin redundancias perjudiciales e
innecesarias; su finalidad es la de servir a una o más aplicaciones de la mejor
manera posible. Los datos se almacenan de modo que resultan independientes
de los programas que usan; se emplean métodos bien determinados para
incluir datos nuevos y para modificar o extraer los datos almacenados.

## Página 36

36

Fuente: (Torres, 2017, p. 26)
1.1.2.6.1. Microsoft SQL Server
Microsoft SQL Server, es un sistema de gestión de una data bases
relacionales, diseñado para procesar grandes volúmenes de
informaciones y con la capacidad de efectuar las obligaciones de
procesos de informaciones para las aplicaciones comerciales y web sites.
Microsoft SQL Server ofrece el soporte de informaciones para las
tradicionales aplicaciones Clientes/Servidores, las cuales están
conformadas por una interfaz, a través del cual los clientes acceden a los
datos por medio de una LAN. La emergente plataforma .NET exigen un
gran porcentaje de distribuciones de recursos, conexión de los servidores
de datos y un entorno de trabajo descentralizado. Para ello, los clientes
deben ser livianos, como los browsers de internet, los cuales accederán a
los datos por medio de una web Server como el Internet Información
Server (IIS). (Torres, 2017, p. 45)
Figura 3. Base de datos

## Página 37

37

Microsoft SQL Server está diseñado para trabajar con dos tipos de datos:
A. OLAP (OnLine Analytic Processing). Son bases de datos que
almacenan grandes cantidades de datos que sirven para la toma de
decisiones. Por ejemplo: Analizar las ventas en un periodo
determinado según la zona de ventas y por cada vendedor.
B. OLTP (OnLine Transaction Proccesing). Son bases de datos
caracterizadas por mantener una gran cantidad de usuarios conectados
concurrentemente, realizando ingreso/modificación de datos.
1.1.2.6.2. Pasos para diseñar una base de datos
A continuación, se detallan los pasos básicos a tomar en cuenta en el
diseño de una base de datos. (Maratalla, 2002)
A. Analizar la situación para reunir información acerca de la base
de datos propuesta
En ocasiones una entrevista es la mejor forma de determinar con
exactitud lo que el cliente desea, en particular sino entiende cual es
la situación actual y cuál es la meta.
B. Decidir el número de columnas, tipos de datos y su longitud
Luego de la entrevista lo mejor es decidir los posibles objetos,
incluyendo sus nombres, tipos y longitudes, una vez conocidos los
objetos, puede agruparlos en tablas relacionadas.
C. Normalizar los datos dentro de las tablas
Es el proceso que clasifica relaciones, objetos, formas de relación y
demás elementos en grupos, en base a las características que cada

## Página 38

38

atributo uno posee, mediante la normalización de los datos, se
pretenden eliminar los datos redundantes.
D. Crear la base de datos y las tablas
Debido a que las tablas son los bloques de construcción de las bases
de datos, resulta claro que las tablas bien diseñadas y las columnas
dentro de ellas son críticas para el éxito de las bases de datos.
1.1.2.7. Programación orientada a objetos
Un enfoque orientado a objetos para el desarrollo de softwares se planteó
primera vez a finales de los años 60. Las tecnologías de los objetos han
necesitado casi 20 años para llegar a ser ampliamente usadas, ante la primera
mitad de los años 90, ingeniería de software orientada a objetos se convirtió en
el paradigma de elección para muchos productores de software y un creciente
número de sistemas de información y profesionales de Ingeniería. (Sabana,
2011, p. 25)
Los beneficios de la tecnología orientada a objetos se fortalecen si se usa
antes y durante el proceso de ingeniería del software. Un simple uso de
programación orientada a objetos POO no brindará los mejores resultados, los
ingenieros del software y sus directores deben considerar ciertos elementos
relacionados con la tecnología orientada a objetos como:
- Análisis de requisitos orientado a objetos AROO.
- Diseño orientado a objetos DOO.
- Análisis del dominio orientado a objetos ADOO.
- Sistemas de gestión de bases de datos orientadas a objetos SGBDOO

## Página 39

39

- Ingeniería del software orientada a objetos.
1.1.2.8. Power builder
PowerBuilder es una herramienta de desarrollo de clase empresarial
desarrollada por la empresa Sybase. PowerBuilder es orientada a objetos y
permite el desarrollo de diferentes tipos de aplicaciones y componentes para
arquitecturas cliente/servidor, distribuidas y Web.
PowerBuilder contiene dentro de su ambiente integrado de desarrollo,
herramientas para crear la interfaz de usuario, generar reportes y tener acceso
al contenido de una base de datos. PowerBuilder también incluye un lenguaje
de programación llamado Powerscript, el cual es usado para especificar el
comportamiento de la aplicación en respuesta a eventos del sistema o del
usuario, tal como cerrar una ventana o presionar un botón. Las aplicaciones
desarrolladas con PowerBuilder se ejecutan exclusivamente en el sistema
operativo Microsoft Windows, aunque cierto tipo de componentes que no
incluyen una interfaz de usuario (llamados componentes no visuales o NVOs)
y que encapsulan sólo lógica de aplicación, se pueden ejecutar en otros sistemas
operativos como Unix, usando la “Máquina Virtual de PowerBuilder” o PBVM
incluida dentro del servidor de aplicaciones EAServer de Sybase. (Torres,
2009)
1.1.2.9. Programación orientada a objetos en PowerBuilder
Sabana (2011), expresa un programa es un conjunto de objetos que se
comunican entre ellos para realizar tareas, el método orientado a objetos hace

## Página 40

40

que los programas y módulos sean más fáciles de escribir, mantener y
reutilizar.
Un objeto en programación es un elemento que posee características, pero
más aún posee métodos que han sido definidas para interactuar en operaciones
comunes con dicho objeto. Ejem. Buscar un ítem en una lista. Una instancia
particular de un objeto se convierte en una variable, para todos los fines de la
programación sus atributos se convierten en campos de esta.
1.1.2.10. Gestión documentaria
Según ISO (Organización Internacional para la Estandarización) define la
gestión documentaria como la disciplina encargada del inspección eficaz y
sistemático de la creación, recepción, mantenimiento, uso y eliminación de
récords, incluyendo el proceso de mantenimiento y captura de las
informaciones y evidencias acerca de actividades de transacciones y negocio
en la forma de récords.
Según País y Ruiz (2010), el consejo internacional de archivos define
gestión documentaria como “área de gestión administrativa general relativa a
obtener eficacia y economía en la realización, mantenimiento, uso y
disposición de los documentos”. En resumen, Gestión documentario significa
planeación, control, dirección, organización, entrenamiento, organización,
promoción y otras actividades de gerencia que involucran la creación
documental, su mantenimiento, uso y distribución en disposición de archivar
adecuada y debidamente la documentación basándose en la reglamentación,
políticas de trabajo de la institución.

## Página 41

41

1.1.2.10.1. Objetivos de gestión documentaria
Según Cruz (2006), los objetivos principales de la gestión de
documentaria son los siguientes:
1. Normalizar el diseño de los documentos.
2. Evitar la elaboración de duplicidad, de documentaciones
innecesarios, y la presencia de versiones caducadas.
3. Simplificar los procedimientos.
4. Controlar la circulación y el uso de las documentaciones.
5. Ordenar, clasificar, describir; es decir organizar las
documentaciones para su adecuada utilización al servicio de
la gestión y para la intervención de la toma de decisiones.
6. El mantenimiento y las instalaciones las documentaciones
a bajo coste en los archivos intermedios.
7. Valorar, elegir y excluir las documentaciones que carezcan
de importancia para la gestión y para el futuro.
8. Ratificar las disponibilidades de las documentaciones
esenciales en contextos de emergencias.
Según Núñez (2007), una entidad que aplique la gestión
documentaria puede lograr entre muchos beneficios, entre los
cuales tenemos:
• Realizar sus actividades de una forma ordenada,
responsable y eficaz.
• Prestar servicios de un forma equitativo y razonable.

## Página 42

42

• Proporcionar continuidad, productividad y coherencia, a
la gestión y administración.
• Garantizar la continuidad en caso de catástrofe.
• Cumplir con los requisitos reglamentarios y legislativos,
incluidas las actividades archivísticas de supervisión y
auditoría.
• Proporcionar amparo y soporte a litigios, incluyendo las
gestiones de riesgo en relación con la presencia o
abandono de evidencia de las actividades realizadas por
las organizaciones.
• Amparar los intereses de la organización y los derechos
del personal, consumidores y las partes interesadas
presentes y futuras.
• Documentar y apoyar las actividades de investigación y
desarrollo presentes y futuras, las realizaciones y las
respuestas, así como la investigación histórica.
• Mantener la memoria persona, corporativa o colectiva.
1.1.2.10.2. Normalización de gestión documentaria
Según Moro (2010), en el año 2001, tal como se ha
mencionado antiguamente, la International Organización for
Standardization (ISO) aprobó la norma ISO 15489 con el objetivo
de alcanzar una superior armonización entre los métodos
archivísticos y los modelos de gestión organizativos y de calidad

## Página 43

43

surgidos ante los nuevos entornos de trabajo (cultura corporativa
orientada hacia el sector tecnológico, calidad e innovación, y de
comunicación, marcos legislativos, mercados competitivo y
reglamentarios complejos), por los cuales parecía no existir una
respuesta de gestión de sus documentos automatizada y adecuada.
Según Moro (2010), recapitula en su curso “Alcances de la
Norma ISO 1589: 2001 en la gestión documental”, los factores
que incentivaron la creación de la Norma ISO 15489 2001, así
como de otras normas que apoyan la gestión de documentos,
agrupándolos en dos categorías:
A. Factores provenientes de los entornos de trabajo:
▪ Surgimiento de nuevos entornos de trabajo en las
organizaciones: Uso de nuevas tecnologías de información
y comunicación en los procesos de negocio y sus
consiguientes consecuencias.
▪ Surgimiento de nuevos requisitos de gestión documental
para contribuir a una toma de decisiones cada vez más
rápida y más compleja
▪ Competitividad en las organizaciones ante mercados
federales, nacionales e internacionales
▪ Expectativas cambiantes sobre la información en las
organizaciones (mayor nivel de rapidez en la
recuperación, mayores exigencias en las propuestas y
ambiente de la recuperación, dificultades en el

## Página 44

44

tratamiento y la conservación, mayor relevancia a la
seguridad de la información y control del acceso, etc.)
▪ Orientación de las organizaciones hacia la consolidación
de niveles de información.
B. Factores derivados del proceder de la comunidad
archivística:
▪ Ausencia de un modelo de gestión universal (diversidad
de escuelas de pensamiento).
▪ Diversidad de prácticas en la comunidad archivística
internacional (heterogeneidad de modelos aplicados de
gestionar los softwares de documentaciones en las
organizaciones.
▪ Divergencia entre las constatadas necesidades
informativas y documentales de los productores de
documentos en el servicio aportado por los gestores de
documentaciones.
▪ Objeto de trabajo del archivero en evolución debido a la
tecnología informática (documento convencional,
electrónico y digital; pervivencia de sistemas híbridos de
gestión documental)
▪ Mayor relevancia y alcance de la finalidad de servicio:
multiplicación de la naturaleza y soporte de los servicios,
además de ampliación del alcance: creadores de
documentaciones (función de servicio extendida hacia

## Página 45

45

los productores de documentaciones y no delimitada en
los investigadores de documentaciones)
▪ Conciencia de la necesidad de buscar soluciones de
modo conjunto; y multidisciplinar (perspectiva de la
ciencia multidisciplinar y conciencia de la grandeza y
complejidad de los problemas existentes en el ejercicio
profesional ante nuevos entornos de trabajo).
▪ Predisposición a la colaboración en proyectos
internacionales (Conciencia de afrontar el logro de
soluciones de modo colaborativo y de disponer de
canales de comunicación global)
1.1.2.10.3. Programa de gestión documentaria
Gestión documentaria se da como resultado del sustrato
conceptual de la disciplina de la documentación que, aunque no
es algo nuevo (por que se ha desarrollado desde hace más de
1000 años de antigüedad) ha venido evolucionando en el último
siglo ante un crecimiento exponencial de la información,
desarrollando nuevas técnicas para permitir el acceso a grandes
masas de información. (Cruz, 2006, p. 45)
Estas técnicas a su vez han desarrollado herramientas y
aplicaciones más estructuradas para manejar estos volúmenes de
información partiendo de una planificación predefinida
orientada a soportar las actividades de creación, control,
accesibilidad y valoración de la documentación institucional.

## Página 46

46

1.1.2.10.4. Ciclo de vida de documentos
El ciclo de vida de documentos establece que las
documentaciones como organismo vivo, se crea o recibe, se
establece su forma física (papel, electrónico, magnético,
fotográfico etc.) y el contenido informativo. Las
documentaciones después se utilizan y mantienen. Se indizan,
revisan, archivan, reorganizan y cumplen con su tiempo de
función su edad aumenta gradualmente con sus valores. (Cruz,
2006, p. 120)
La formación de archivos según el ciclo de vida de los
documentos se desarrolla así:
A. Archivo de gestión
En el archivo de gestión el documento se crea en
cumplimiento de sus funciones, se clasifica, ordena y genera
los expedientes. La información está en uso permanente.
B. Archivo central
En el Archivo central los documentos permanecen después
de haber cumplido su producción y su trámite. El documento
pasa por una valoración, selección y eliminación. Los
documentos deben cumplir con los valores primarios,
administrativo, fiscal, legal, técnico o contable, y aquí es
donde las tablas de retención documental cumplen su función
y el documento debe quedarse en el archivo central para su

## Página 47

47

consulta por el tiempo que las TRD lo indiquen. (Morales,
2010, p. 48)
C. Archivos historiales
Para que el documento pase a los archivos historiales debe
cumplir con los valores secundarios científico, cultural e
histórico, porque debido a su importancia testimonial e
informativa se deben conservar permanentemente. (Morales,
2010, p. 48)
1.1.2.10.5. Fases del sistema de gestión documentaria
A. La encuesta
.
Es una técnica cuantitativa que utiliza procedimientos
estandarizados de pregunta para medir las características de
la realidad documental de las empresas permitiendo la
acumulación de datos que con una adecuada evaluación
darán como resultado un diagnóstico adecuado a su situación
actual. La encuesta es importante porque permite conocer a
fondo la misión, visión, función y estructura de la institución.
(Morales, 2010, p. 78)
Los siguientes son los procedimientos para realizar una
encuesta: diseñar un formulario, presentar la encuesta ante el
personal en función, ejecutar la encuesta y tabular los
resultados

## Página 48

48

B. Elementos de pregunta para realizar una encuesta
Según Acevedo (2004), para conceptualizar un programa de
gestión documentario en una entidad se deben considerar las
siguientes preguntas:
• Producción de documentos
- ¿La dependencia que documentos produce? (tabla de
retención documental y apoyo)
- ¿Para elaborar dichos documentos qué se tiene en
cuenta? (directrices)
- ¿Los documentos como se elaboran? ¿Cuáles son los
pasos? (Copias, formato, firmas, uso papel reciclado).
• Recepción de documentos internos
- ¿Por qué razón los documentos se reciben de otras
dependencias y que tipos existen?
- ¿Estos documentos, como se recibe (procedimiento,
verificación, controles)?
- ¿Cuándo el documento no es de su competencia qué se
hace?
- ¿Qué se hace, si el documento está incompleto?
- ¿Los documentos internos, corresponden a las series
documentaciones?
- ¿Actualmente hay algún control para la entrega de los
documentos internos y seguimiento?

## Página 49

49

• Organización de archivo central
- Las transferencias, ¿Cómo recibe? (caja, carpetas
rotuladas)
- ¿Si las documentaciones no están bien elaborados que
se hace?
- ¿Cómo se hace el cotejo y cómo fue organizada?
- ¿Qué sistema utiliza para ordenar?
- ¿Qué procesos se realizan en el archivo de gestión?
- ¿Recuperar archivos es posible?
- ¿Para la consulta qué instrumentos?
• Consulta de documentos
- ¿El Archivo de gestión quiénes consultan y por qué?
- ¿En el archivo de gestión cómo localiza la
información?
- ¿El préstamo de documentaciones se registra? ¿Cómo
lo hace?
- ¿Qué mecanismo de control es utilizado para la
devolución?

• Conservación de documentos
- ¿Cómo se expresan las necesidades de la dependencia
en materia de unidades de conservación y
almacenamiento?

## Página 50

50

- ¿Ha realizado diagnóstico de las necesidades?
- ¿Existen espacios suficientes para el almacenamiento
de documentaciones?
C. El informe diagnóstico
Después de analizar las encuestas se establece la situación
actual y real de las documentaciones de la institución.
Como siguiente paso se procede a elaborar un informe donde
se identifiquen y señalan los puntos que revelen los aspectos
relacionados con la producción documental, su naturaleza, su
valoración de acuerdo a la legislación, su estructura y
condiciones de conservación y gestión.
D. El proyecto de organización
Partiendo del diagnóstico documental, se procede a proponer
un plan proyecto que refleje las disposiciones generales, los
procesos y actividades para desarrollar las políticas de
conformación de documentos, gestión administrativa,
transferencias, tablas de retención documental, prestación de
servicios y difusión de las documentaciones, la política de
conservación y prevención documental.

## Página 51

51

1.2. Hipótesis y variables
1.2.1. Hipótesis
1.2.1.1. Hipótesis general
El desarrollo de un sistema de información optimiza la gestión
documentaria de la Institución Educativa Mixta “Señor de Huayllay”, 2019
1.2.1.1. Hipótesis especifico
- El desarrollo de un sistema de información optimiza la entrada de
información de gestión documentaria de la Institución Educativa Mixta
“Señor de Huayllay”, 2019
- El desarrollo de un sistema de información optimiza el almacenamiento
de información de gestión documentaria de la Institución Educativa
Mixta “Señor de Huayllay” , 2019
- El desarrollo de un sistema de información optimiza la salida de
información de gestión documentaria de la Institución Educativa Mixta
“Señor de Huayllay” , 2019
1.2.2. Identificación y operacionalización de variables
1.2.2.1. Variable de la investigación
1.2.2.1.1. Variable independiente
X: Sistema de información
1.2.2.1.2. Variable dependiente
Y: Gestión documentaria

## Página 52

52

1.2.2.2. Operacionalización de variables

## Página 53

53

### CAPÍTULO II
METODOLOGÍA DE LA INVESTIGACIÓN
2.1. Tipo investigación
El tipo de investigación es cuantitativa porque se basa en la recopilación de datos cuantificables
se analizará en función a las variables. La metodología cuantitativa según Tomayo (2007), se
basa en contraste de teorías ya existentes a partir de una serie de hipótesis surgidas de la misma,
siendo necesario obtener una muestra, ya sea en forma aleatorias o discriminadas, pero
representativa de una población o fenómeno objeto de estudio.
2.2. Nivel de investigación
Para precisar los alcances de niveles de investigación, es necesario saber primero los
diferentes tipos de niveles de investigación, según Hernández, Fernández y Baptista (2014)
enfoca la investigación hacia 4 tipos que son: Exploratorios, Descriptivos, Correlaciónales y
Explicativos. En esta investigación se desarrollará 2 tipos de nivel de investigación, el
descriptivo y correlacional. A continuación, se facilitará una breve descripción del tipo
seleccionado, con el fin de poder entender mejor la metodología de esta investigación.
• Es descriptivo, por cuanto tiene la capacidad de seleccionar las características
fundamentales del objeto de estudio y su descripción detallada de las partes, categorías o
clases de dicho objeto. (Hernández, Fernández y Baptista, 2014)
• Es correlacional, porque su finalidad fue conocer la relación o grado de asociación que
existe entre las dos variables de estudio, las cuales son: Sistema de información y Gestión
documentaria. (Hernández, Fernández y Baptista, 2014)
La investigación será calificada de nivel descriptivo correlacional, el mismo que se
complementará con el estadístico, análisis, síntesis entre otros y aplicado en razón para su
desarrollo en la parte teórica conceptual, se apoyará en conocimientos sobre el control de

## Página 54

54

gestión documentaria a fin de ser aplicado en la gestión de trámites de la Institución
Educativa Mixta "Señor de Huayllay".
2.3. Diseño de la investigación
El estudio responde a una investigación de diseño no experimental transversal, porque accede
a medir el nivel de dependencia entre las variables: Sistema de información y Gestión
documentaria; además, el recojo de información se realizará en un mismo momento.
Este estudio se realizó sin la manipulación deliberada de las variables y en los que sólo se
observan los fenómenos en su ambiente natural para después analizarlos. (Hernández,
Fernández y Baptista, 2014)
A continuación, se manifestó el siguiente esquema del diseño:

Donde:
M=Muestra
X (V.I) = Sistema de información
Y (V.D) = Gestión documentario
R=Relación entre variables
2.4. Población y muestra
2.4.1. Población
La población es un conjunto de individuos de la misma clase, limitada por el estudio.
Según Hernández, Fernández y Baptista (2014), ¨La población se define como la
totalidad del fenómeno a estudiar donde las unidades de población poseen una
característica común la cual se estudia y da origen a los datos de la investigación.

## Página 55

55

La población del presente estudio es constituida por 240 personas entre ellos
podemos mencionar a personal docente, administrativo, alumnos, padres de familias
de la Institución Educativa Mixta "Señor de Huayllay".
2.4.2. Muestreo y Muestra
2.4.2.1. Muestreo
El tipo de muestreo para el presente estudio será no probabilística
intencional, el cual según la clasificación realizada por Hernández, Fernández
y Baptista (2014) “es la que la elección de los elementos no depende de la
probabilidad, sino de las características de la investigación”. (p. 174).
2.4.2.2. Muestra
Para el presente estudio la determinación de muestra se empleó la fórmula
de poblaciones finitas, obteniendo un total de 148 personas pertenecientes a
la comunidad de la Institución Educativa Mixta "Señor de Huayllay".
Tabla 1.

Selección de muestra

Fuente: (Elaboración propia, 2020)
Formula de población finita es:

Personal Cantidad Instrumento
Docentes 10 Encuesta
Estudiantes 93
Administrativo 05
Padre de familia 40
Total 148

## Página 56

56

Dónde:
N: Población
n: Muestra
Z: 1.96 (95% de confianza) Distribución normal
p: Probabilidad de éxito (0.5)
q: Probabilidad de fracaso (0.5)
E: Error máximo que se tolera en las mediciones (0.05)
2.5. Técnicas e instrumentos de recolección de datos
2.5.1. Técnicas de recolección de datos
Para conseguir la información relacionada a las variables dependientes e independientes
se empleará como método de recolección de datos la técnica de encuestas, que consiste
de 30 preguntas en un cuestionario, con el propósito de saber la opinión de los personales
y obtener datos para el análisis de las variables: Sistema de información y Gestión
documentaria de la Institución Educativa Mixta "Señor de Huayllay".
2.5.2. Instrumentos de recolección de datos
Un instrumento de medición es el recurso que utiliza el investigador para registrar
información o datos sobre las variables que tiene en mente; Hernández, Fernández y
Baptista (2014).
El instrumento que se utilizó fue el cuestionario para las variables de estudio con una
escala de Likert graduado de la siguiente manera: Deficiente (1), Regular (2), Bueno (3),
Muy bueno (4), Excelente (5).

## Página 57

57

2.6. Aplicación de instrumentos o trabajo de campo
Los datos obtenidos mediante la aplicación de la encuesta al personales de la Institución Un
instrumento de medición es el recurso que utiliza el investigador para registrar información o
datos sobre las variables que tiene en mente; Hernández, Fernández y Baptista (2014).
El instrumento que se utilizó fue el cuestionario para las variables de estudio con una escala
de Likert graduado de la siguiente manera: Deficiente (1), Regular (2), Bueno (3), Muy bueno
(4), Excelente (5).
Educativa Mixta "Señor de Huayllay", fueron ordenados y tabulados para iniciar el análisis
respectivo usando el software estadístico SPSS y Excel 2019 por cada pregunta, con la finalidad
de interpretar sus resultados.
Así mismo, para la contratación de las hipótesis, planteamos en la tesis Hipótesis Nulas e
Hipótesis Alternativas, se utilizó la prueba de correlación del Chi cuadrado de Pearson, con ello
se demostró la relación existente entre las variables involucradas en el estudio; los resultados
obtenidos en el SPSS se manifestarán en tablas y gráficos.
Con los resultados obtenidos por cada hipótesis, tenemos los fundamentos necesarios para
elaborar las conclusiones de la investigación planteada en el presente estudio.

## Página 58

58

### CAPÍTULO III
RESULTADOS DE LA INVESTIGACIÓN
3.1. Presentación e interpretación de datos
3.1.1. Confiabilidad del instrumento:
El criterio de confiabilidad del instrumento se determinó en la actual tesis por el
coeficiente de Cronbach, el cual requiere de una sola administración del instrumento y
produce valores que oscilan entre 0 y 1. Es aplicable a escala de varios posibles valores,
por lo que suele ser utilizado para determinar la confiabilidad en escalas cuyos ítems
tienen como respuesta más de dos alternativas. Su fórmula determina el grado de
consistencia y precisión.
Tabla 2.
Criterios de confiabilidad Alfa de Cronbach

Fuente: (Aco, 1992)

Cuanto menor sea la variabilidad de respuesta de los encuestados, es decir haya
homogeneidad en las respuestas dentro de cada ítem, mayor será el alfa de Cronbach,
Contrastando con el resultado del SPSS:

Criterio Rango
No es confiable -1.00 0.00
Baja confiabilidad 0.01 0.49
Moderada Confiabilidad 0.50 0.75
Fuerte confiabilidad 0-76 0.89
Alta confiabilidad 0.90 1.00

## Página 59

59

Tabla 3.

Resumen de procesamiento de casos

Fuente: (Elaboración propia, 2020)
Se puede analizar en el cuadro que, de un total de 148 casos procesados, se han
considerado validos un total de 148 casos y no se han excluido ninguno.
Tabla 4.
Estadísticas de fiabilidad
Alfa de
Cronbach
N de
elementos
0,954 148
Fuente: (Elaboración propia, 2020)
El coeficiente alfa obtenido (0.954) es un valor alto, indicando que los datos tienen
fuerte consistencia interna. Por lo tanto, se concluye que el cuestionario aplicado tiene
alta confiabilidad.
Para evaluar la fiabilidad de este cuestionario, 148 personas (muestra) fueron sometidas
a la prueba. Después de aplicado el test, se construyó un fichero de datos, en el editor
de datos del SPSS. Se incluyeron las respuestas de la muestra de todos los ítems. La
primera consideración es el procedimiento de cuantificación de las respuestas.
- En la siguiente tabla, se muestra los resultados descriptivos:

N %

Casos
Válido 148 100,0
Excluidoa 0 0,0
Total 148 100,0

## Página 60

60

Tabla 5.
Estadísticos descriptivos
N Mínimo Máximo Media Desviación
estándar
Varianz
a
X1 148 1 5 4,15 ,964 ,930
X2 148 2 5 4,32 ,835 ,697
X3 148 2 5 4,32 ,833 ,694
X4 148 3 5 4,79 ,498 ,248
X5 148 1 5 4,22 ,968 ,936
X6 148 1 5 4,12 1,023 1,046
X7 148 1 5 3,97 1,291 1,666
X8 148 1 52 3,84 4,233 17,914
X9 148 1 5 3,99 1,223 1,496
Y10 148 1 6 4,16 1,233 1,520
Y11 148 1 5 3,84 1,289 1,661
Y12 148 1 6 4,05 1,165 1,358
Y13 148 1 5 4,11 1,173 1,376
Y14 148 1 5 3,89 1,407 1,980
Y15 148 1 5 3,86 1,281 1,641
Y16 148 1 5 3,95 1,255 1,575
Y17 148 1 5 4,01 1,283 1,646
Y18 148 1 5 3,99 1,301 1,694
N válido (por
lista)
148
Fuente: (Elaboración propia, 2020)

## Página 61

61

Tabla 6.
Estadísticas de elemento de resumen
Fuente: (Elaboración propia, 2020)

- En las siguientes tablas, se muestra los resultados de frecuencia:
Tabla 7.
¿La entrada de información se proporciona de forma adecuada con el sistema de
información?

Fuente: (Elaboración propia, 2020)

Medi
a
Mínim
o
Máxim
o Rango Máximo / Mínimo Varian za N de elemen tos
Medias de
elemento
4,088 3,838 4,791 ,953 1,248 ,053 18
Varianzas de
elemento
2,227 ,248 17,914 17,666 72,135 15,532 18
Covariables entre
elementos
,032 -,724 ,593 1,317 -,820 ,027 18

Frecuencia Porcentaje
Porcentaje
válido
Porcentaje
acumulado

X1
Deficiente 2 1,4 1,4 1,4
Regular 8 5,4 5,4 6,8
Bueno 23 15,5 15,5 22,3
Muy bueno 48 32,4 32,4 54,7
Excelente 67 45,3 45,3 100,0
Total 148 100,0 100,0

## Página 62

62

Figura 4. ¿La entrada de información se proporciona de forma adecuada con el sistema
de información?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 45,27% de los usuarios califican excelente la entrada de la
información que se proporciona de forma adecuada con el sistema de información, el
32,43% califican muy bueno, el 15,54% califican bueno, 5.41% califican regular y el
1.35% califican deficiente.

## Página 63

63

Tabla 8.
¿Las entradas de informaciones se muestra de forma automática con el sistema de
información?

Fuente: (Elaboración propia, 2020)

Figura 5. ¿Las entradas de informaciones se muestra de forma automática con el sistema
de información?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 52,03% de los usuarios califican excelente las entradas de
informaciones que se muestra de forma automática con el sistema de información, el
32,43% califican muy bueno, el 11,49% califican bueno y 4,05% califican regular
siendo 0% deficiente.
Frecuencia Porcentaje Porcentaje
válido
Porcentaje
acumulado

X2
Regular 6 4,1 4,1 4,1
Bueno 17 11,5 11,5 15,5
Muy bueno 48 32,4 32,4 48,0
Excelente 77 52,0 52,0 100,0
Total 148 100,0 100,0

## Página 64

64

Tabla 9.
¿Con el sistema de información los ingresos de informaciones se registran con
precisión?
Frecuencia Porcentaje Porcentaje
válido
Porcentaje
acumulado

X3
Regular 6 4,1 4,1 4,1
Bueno 17 11,5 11,5 15,5
Muy bueno 49 33,1 33,1 48,6
Excelente 76 51,4 51,4 100,0
Total 148 100,0 100,0
Fuente: (Elaboración propia, 2020)

Figura 6. ¿Con el sistema de información los ingresos de informaciones se registran
con precisión?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 51,35% de los usuarios califican excelente que los ingresos de
informaciones se registran con precisión con el sistema de información, el 33,11%
califican muy bueno, el 11,49% califican bueno y 4,05% califican regular siendo 0%
deficiente.

## Página 65

65

Tabla 10.
¿El sistema de información acopia los datos registrados automáticamente en la unidad
de almacenamiento del PC?
Frecuencia Porcentaje Porcentaj e válido Porcentaje acumulado

X4
Bueno 6 4,1 4,1 4,1
Muy bueno 19 12,8 12,8 16,9
Excelente 123 83,1 83,1 100,0
Total 148 100,0 100,0
Fuente: (Elaboración propia, 2020)

Figura 7. ¿El sistema de información acopia los datos registrados automáticamente en
la unidad de almacenamiento del PC?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 83,11% de los usuarios califican excelente que el sistema de
información acopia los datos registrados automáticamente en la unidad de
almacenamiento del PC, el 12,84% califican muy bueno y el 4,05% califican bueno
siendo 0% deficiente.

## Página 66

66

Tabla 11.
¿Cree usted que el sistema de información actual almacena los datos con confiabilidad?

Frecuencia Porcentaje
Porcent
aje válido
Porcentaje
acumulado

X5
Deficiente 3 2,0 2,0 2,0
Regular 6 4,1 4,1 6,1
Bueno 20 13,5 13,5 19,6
Muy bueno 45 30,4 30,4 50,0
Excelente 74 50,0 50,0 100,0
Total 148 100,0 100,0
Fuente:(Elaboración propia, 2020)

Figura 8. ¿Cree usted que el sistema de información actual almacena los datos con
confiabilidad?
Fuente:(Elaboración propia, 2020)
DISCUSIÓN: El 50% de los usuarios califican excelente que el sistema de información
actual almacena los datos con confiabilidad, el 30,41% califican muy bueno y el 13,51%
califican bueno, el 4,05% califican regular siendo 2,03% deficiente.
Tabla 12.

## Página 67

67

¿Cree usted que el sistema de información facilita el almacenamiento de datos en otros
dispositivos?

Frecuencia Porcentaje
Porcentaje
válido
Porcentaj
e acumulado

X6
Deficiente 3 2,0 2,0 2,0
Regular 9 6,1 6,1 8,1
Bueno 24 16,2 16,2 24,3
Muy bueno 43 29,1 29,1 53,4
Excelente 69 46,6 46,6 100,0
Total 148 100,0 100,0
Fuente: (Elaboración propia, 2020)

Figura 9. ¿Cree usted que el sistema de información facilita el almacenamiento de datos
en otros dispositivos?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 50% de los usuarios califican excelente que el sistema de información
facilita el almacenamiento de datos en otros dispositivos, el 30,41% califican muy bueno
y el 13,51% califican bueno, el 4,05% califican regular y el 2,03% deficiente.
Tabla 13.

## Página 68

68

¿Cree usted que el sistema de información facilita el almacenamiento de datos en otros
dispositivos?

Fuente: (Elaboración propia, 2020)

Figura 10. ¿Cree usted que el sistema de información facilita el almacenamiento de
datos en otros dispositivos?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 50,68% de los usuarios califican excelente que el sistema de
información facilita el almacenamiento de datos en otros dispositivos, el 18,92%
califican muy bueno, el 13,51% califican bueno, el 10,14% califican regular y el 6,76%
califican deficiente.

Frecuencia Porcentaje Porcentaje válido Porcentaje acumulado
X7
Deficiente 10 6,8 6,8 6,8
Regular 15 10,1 10,1 16,9
Bueno 20 13,5 13,5 30,4
Muy bueno 28 18,9 18,9 49,3
Excelente 75 50,7 50,7 100,0
Total 148 100,0 100,0

## Página 69

69

Tabla 14.
¿El sistema de información proporciona a los usuarios descargar las informaciones en
Excel?

Fuente: (Elaboración propia, 2020)

Figura 11. ¿El sistema de información proporciona a los usuarios descargar las
informaciones en Excel?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 35,37% de los usuarios califican excelente que el sistema de
información proporciona a los usuarios descargar las informaciones en Excel, el 21,77%
califican muy bueno, el 14,97% califican bueno, el 14,97% califican regular y el 12,93%
califican deficiente.

Frecuencia Porcentaje Porcentaje
válido
Porcentaje
acumulado

X8
Deficiente 19 12,9 12,9 12,9
Regular 22 14,9 14,9 27,8
Bueno 22 14,9 14,9 42,7
Muy bueno 32 21,8 21,8 64,6
Excelente 52 35,4 35,4 100,00
Total 148 100,0 100,0

## Página 70

70

Tabla 15.
¿Es trascendental la salida de información con el sistema de información?

Frecuencia Porcentaje
Porcentaje
válido
Porcentaje
acumulado

X9
Deficiente 7 4,7 4,7 4,7
Regular 14 9,5 9,5 14,2
Bueno 27 18,2 18,2 32,4
Muy bueno 26 17,6 17,6 50,0
Excelente 74 50,0 50,0 100,0
Total 148 100,0 100,0
Fuente: (Elaboración propia, 2020)

Figura 12. ¿Es trascendental la salida de información con el sistema de información?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 50,00% de los usuarios califican excelente que el sistema de
información es trascendental la salida de información, el 17,57% califican muy bueno,
el 18,24% califican bueno, el 9,46% califican regular y el 4,73% califican deficiente.

## Página 71

71

Tabla 16.
¿El sistema de información cumple en su totalidad con sus funciones de gestión
documentaria?

Frecuencia Porcentaje
Porcentaje
válido
Porcentaje
acumulado

Y10
Deficiente 7 4,7 4,7 4,7
Regular 14 9,5 9,5 14,2
Bueno 16 10,8 10,8 25,0
Muy bueno 25 16,9 16,9 41,9
Excelente 84 56,8 56,8 98,6
Total 148 100,0 100,0
Fuente: (Elaboración propia, 2020)

Figura 13. ¿El sistema de información cumple en su totalidad con sus funciones de
gestión documentaria?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 57,53 de los usuarios califican excelente que el sistema de información
cumple en su totalidad con sus funciones de gestión documentaria, el 17,12% califican
muy bueno, el 10,96% califican bueno, el 9,59% califican regular y el 4,79% califican
deficiente.

## Página 72

72

Tabla 17.
¿Con el sistema de información implantado los documentos registrados se ordenan en
forma adecuada?
Frecuencia Porcentaje Porcentaj e válido Porcentaje acumulado

Y11
Deficiente 7 4,7 4,7 4,7
Regular 24 16,2 16,2 20,9
Bueno 22 14,9 14,9 35,8
Muy bueno 28 18,9 18,9 54,7
Excelente 67 45,3 45,3 100,0
Total 148 100,0 100,0
Fuente: (Elaboración propia, 2020)

Figura 14. ¿Con el sistema de información implantado los documentos registrados se
ordenan en forma adecuada?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 45,27% de los usuarios califican excelente que el sistema de
información implantado, los documentos registrados se ordenan en forma adecuada, el
18.92% califican muy bueno, el 14,86% califican bueno, el 16,22% califican regular y
el 4,73% califican deficiente.

## Página 73

73

Tabla 18.

¿Cree usted con el sistema de información las informaciones se hallan en uso
permanente?

Fuente:(Elaboración propia, 2020)

Figura 15. ¿Cree usted con el sistema de información las informaciones se hallan en
uso permanente?
Fuente:(Elaboración propia, 2020)
DISCUSIÓN: El 51,02% de los usuarios califican excelente que en el sistema de
información las informaciones se hallan en uso permanente, el 17,01% califican muy
bueno, el 19,73% califican bueno, el 9,52% califican regular y el 2,72% califican
deficiente.
Frecuencia Porcentaje Porcentaje
válido
Porcentaje
acumulado

Y12
Deficiente 4 2,7 2,7 2,7
Regular 14 9,5 9,5 12,2
Bueno 29 19,7 19,7 31,9
Muy bueno 25 17,0 17,0 48,9
Excelente 75 51,0 51,0 99,9
Total 148 100,0 100,0

## Página 74

74

Tabla 19.
¿Los documentos cumplen su valor administrativo con eficaz con el sistema de
información implantado?
Frecuencia Porcentaje Porcentaje válido Porcentaje acumulado

Y13
Deficiente 5 3,4 3,4 3,4
Regular 14 9,5 9,5 12,8
Bueno 22 14,9 14,9 27,7
Muy bueno 26 17,6 17,6 45,3
Excelente 81 54,7 54,7 100,0
Total 148 100,0 100,0
Fuente: (Elaboración propia, 2020)

Figura 16. ¿Los documentos cumplen su valor administrativo con eficaz con el sistema
de información implantado?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 54,73% de los usuarios califican excelente que los documentos
cumplen su valor administrativo con eficaz con el sistema de información implantado,
el 17,57% califican muy bueno, el 14,86% califican bueno, el 9,46% califican regular y
el 3,38% califican deficiente.

## Página 75

75

Tabla 20.
¿Considera usted que el sistema de información actual puede hacer consultas o
búsquedas fácilmente los documentos en el archivo central?
Frecuencia Porcentaje Porcentaje válido Porcentaje acumulado

Y14
Deficiente 15 10,1 10,1 10,1
Regular 14 9,5 9,5 19,6
Bueno 23 15,5 15,5 35,1
Muy bueno 17 11,5 11,5 46,6
Excelente 79 53,4 53,4 100,0
Total 148 100,0 100,0
Fuente: (Elaboración propia, 2020)

Figura 17. ¿Considera usted que el sistema de información actual puede hacer consultas
o búsquedas fácilmente los documentos en el archivo central?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 53,38% de los usuarios califican excelente que el sistema de
información actual puede hacer consultas o búsquedas fácilmente de los documentos en
el archivo central, el 11,49% califican muy bueno, el 15,54% califican bueno, el 9,46%
califican regular y el 10,14% califican deficiente.

## Página 76

76

Tabla 21.
¿Cree usted que el sistema de información actual maneja los datos del archivo central
actualizado?

Fuente: (Elaboración propia, 2020)

Figura 18. ¿Cree usted que el sistema de información actual maneja los datos del
archivo central actualizado?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 43,92% de los usuarios califican excelente que el sistema de
información maneja los datos del archivo central actualizado, el 24,32% califican muy
bueno, el 12,16% califican bueno, el 13,51% califican regular y el 6,08% califican
deficiente.
Frecuencia Porcentaje Porcentaje válido Porcentaje acumulado

Y15
Deficiente 9 6,1 6,1 6,1
Regular 20 13,5 13,5 19,6
Bueno 18 12,2 12,2 31,8
Muy bueno 36 24,3 24,3 56,1
Excelente 65 43,9 43,9 100,0
Total 148 100,0 100,0

## Página 77

77

Tabla 22.
¿Cree usted que el sistema de información implantado accede con seguridad a los datos
historiales de gestión documentaria?
Frecuencia Porcentaje Porcentaje válido Porcentaje acumulado

Y16
Deficiente 6 4,1 4,1 4,1
Regular 20 13,5 13,5 17,6
Bueno 24 16,2 16,2 33,8
Muy bueno 24 16,2 16,2 50,0
Excelente 74 50,0 50,0 100,0
Total 148 100,0 100,0
Fuente: (Elaboración propia, 2020)

Figura 19. ¿Cree usted que el sistema de información implantado accede con seguridad
a los datos historiales de gestión documentaria?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 50% de los usuarios califican excelente que el sistema de información
implantado accede con seguridad a los datos historiales de gestión documentaria, el
16,22% califican muy bueno, el 16,22% califican bueno, el 13,51% califican regular y
el 4,05% califican deficiente.

## Página 78

78

Tabla 23.
¿El sistema de información implementado es confiable en búsqueda de archivos
historiales?

Fuente: (Elaboración propia, 2020)

Figura 20. ¿El sistema de información implementado es confiable en búsqueda de
archivos historiales?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 52,70% de los usuarios califican excelente que el sistema de
información implementado es confiable en búsqueda de archivos, el 18,92% califican
muy bueno, el 12,16% califican bueno, el 9,46% califican regular y el 6,76% califican
deficiente.
Frecuen cia Porcentaje Porcentaje válido Porcentaje acumulado
Y17
Deficiente 10 6,8 6,8 6,8
Regular 14 9,5 9,5 16,2
Bueno 18 12,2 12,2 28,4
Muy bueno 28 18,9 18,9 47,3
Excelente 78 52,7 52,7 100,0
Total 148 100,0 100,0

## Página 79

79

Tabla 24.
¿El sistema de información implantado es importante para manejo de informaciones
historiales?
Frecuencia Porcentaj e Porcentaje válido Porcentaje acumulado
Y18
Deficiente 12 8,1 8,1 8,1
Regular 11 7,4 7,4 15,5
Bueno 20 13,5 13,5 29,1
Muy bueno 28 18,9 18,9 48,0
Excelente 77 52,0 52,0 100,0
Total 148 100,0 100,0
Fuente: (Elaboración propia, 2020)

Figura 21. ¿El sistema de información implantado es importante para manejo de
informaciones historiales?
Fuente: (Elaboración propia, 2020)
DISCUSIÓN: El 52,03% de los usuarios califican excelente que el sistema de
información es importante para manejo de informaciones historiales, el 18,92% califican
muy bueno, el 13,51% califican bueno, el 7,43% califican regular y el 8,11% califican
deficiente.

## Página 80

80

3.1.2. Discusiones
Se llego a las siguientes discusiones:
- El 47,27% de los usuarios califican excelente la entrada de la información que se
proporciona de forma adecuada con el sistema de información, el 32,43% califican
muy bueno, el 15,54% califican bueno, 5.41% califican regular y el 1.35% califican
deficiente.
- El 52,03% de los usuarios califican excelente las entradas de informaciones que se
muestra de forma automática con el sistema de información, el 32,43% califican muy
bueno, el 11,49% califican bueno y 4,05% califican regular siendo 0% deficiente.
- El 51,35% de los usuarios califican excelente que los ingresos de informaciones se
registran con precisión con el sistema de información, el 33,11% califican muy
bueno, el 11,49% califican bueno y 4,05% califican regular siendo 0% deficiente.
- El 83,11% de los usuarios califican excelente que sistema de información acopia los
datos registrados automáticamente en la unidad de almacenamiento del PC, el
12,84% califican muy bueno y el 4,05% califican bueno siendo 0% deficiente.
- El 50% de los usuarios califican excelente que el sistema de información actual
almacena los datos con confiabilidad, el 30,41% califican muy bueno y el 13,51%
califican bueno, el 4,05% califican regular siendo 0% deficiente.
- El 50% de los usuarios califican excelente que el sistema de información facilita el
almacenamiento de datos en otros dispositivos, el 30,41% califican muy bueno y el
13,51% califican bueno, el 4,05% califican regular y el 2,03% deficiente.

## Página 81

81

- El 50,68% de los usuarios califican excelente que el sistema de información facilita
el almacenamiento de datos en otros dispositivos, el 18,92% califican muy bueno, el
13,51% califican bueno, el 10,14% califican regular y el 6,76% califican deficiente.
- El 35,37% de los usuarios califican excelente que el sistema de información
proporciona a los usuarios descargar las informaciones en Excel, el 21,77% califican
muy bueno, el 14,97% califican bueno, el 14,97% califican regular y el 12,93%
califican deficiente.
- El 50,00% de los usuarios califican excelente que el sistema de información es
trascendental la salida de información, el 17,57% califican muy bueno, el 18,24%
califican bueno, el 9,46% califican regular y el 4,73% califican deficiente.
- El 57,53 de% los usuarios califican excelente que el sistema de información cumple
en su totalidad con sus funciones de gestión documentaria, el 17,12% califican muy
bueno, el 10,96% califican bueno, el 9,59% califican regular y el 4,79% califican
deficiente.
- El 45,27% de los usuarios califican excelente que el sistema de información
implantado, los documentos registrados se ordenan en forma adecuada, el 18,92%
califican muy bueno, el 14,86% califican bueno, el 16,22% califican regular y el
4,73% califican deficiente.
- El 51,02% de los usuarios califican excelente que en el sistema de información las
informaciones se hallan en uso permanente, el 17,01% califican muy bueno, el
19,73% califican bueno, el 9,52% califican regular y el 2,72% califican deficiente.
- El 54,73% de los usuarios califican excelente que los documentos cumplen su valor
administrativo con eficaz con el sistema de información implantado, el 17,57%

## Página 82

82

califican muy bueno, el 14,86% califican bueno, el 9,46% califican regular y el 3,38%
califican deficiente.
- El 53,38% de los usuarios califican excelente que el sistema de información actual
puede hacer consultas o búsquedas fácilmente los documentos en el archivo central,
el 11,49% califican muy bueno, el 15,54% califican bueno, el 9,46% califican regular
y el 10,14% califican deficiente.
- El 43,92% de los usuarios califican excelente que el sistema de información maneja
los datos del archivo central actualizado, el 24,32% califican muy bueno, el 12,16%
califican bueno, el 13,51% califican regular y el 6,08% califican deficiente.
- El 50% de los usuarios califican excelente que el sistema de información implantado
accede con seguridad a los datos historiales de gestión documentaria, el 16,22%
califican muy bueno, el 16,22% califican bueno, el 13,51% califican regular y el
4,05% califican deficiente.
- El 52,70% de los usuarios califican excelente que el sistema de información
implementado es confiable en búsqueda de archivos, el 18,92% califican muy bueno,
el 12,16% califican bueno, el 9,46% califican regular y el 6,76% califican deficiente.
- El 52,03% de los usuarios califican excelente que el sistema de información es
importante para manejo de informaciones historiales, el 18,92% califican muy bueno,
el 13,51% califican bueno, el 7,43% califican regular y el 8,11% califican deficiente.
3.1.3. Proceso de prueba de hipótesis
Para las Pruebas de Hipótesis Estadísticas para una muestra, se ha utilizado el conocido
procedimiento de los cinco pasos (método detallado en la decimotercera edición del libro

## Página 83

83

Estadística Aplicada a los negocios y la economía por Lind, Marchal y Wathen). Para ello
se utilizó el chi cuadrado.
- Paso 1: Se establece la Hipótesis Nula y Alternativa
- 𝐇𝟎: El desarrollo de un sistema de información no optimiza la gestión
documentaria de la Institución Educativa Mixta “Señor de Huayllay”
- 𝐇𝟏: El desarrollo de un sistema de información optimiza la gestión
documentaria de la Institución Educativa Mixta “Señor de Huayllay”
- Paso 2: Se selecciona un nivel de significancia o nivel de riesgo que se corre al
rechazar la Hipótesis Nula cuando es verdadera. “Se recomienda elegir el nivel de 0.05
para los proyectos de investigación relacionados con los consumidores” (Fuente:
Estadística Aplicada a los Negocios y La Economía Lind 13th). Por lo tanto, el nivel
de significancia a utilizar será del 5%.
- Paso 3: Se selecciona el estadístico de prueba
Existen muchos estadísticos de prueba; sin embargo, como se menciona al inicio de la
sección, se utilizará el estadístico de prueba “CHI CUADRADO”.
Tabla 25.
Pruebas de chi cuadrado

Fuente: (Elaboración propia, 2020)

Valor gl Sig. asintótica (2
caras)
Chi cuadrado de Pearson 14,087a 17 0,005
Razón de verosimilitud
Corrección por continuidad
14,991
7,32
17
17
0,005
0,005
Asociación lineal por lineal ,413 17 0,005
N° de casos válidos 148

## Página 84

84

En este caso la prueba de hipótesis se realiza con los datos de corrección de
continuidad, como la significancia es menor que 0.05 se rechaza Ho, siendo acepaba
la hipótesis H1 podemos afirmar con un 95% de confiabilidad, que el desarrollo de
un sistema de información optimiza la gestión documentaria de la Institución
Educativa Mixta “Señor de Huayllay”

## Página 85

85

CONCLUSIONES
1. Podemos concluir que existe una influencia con un 95% de confiabilidad el desarrollo del
sistema de información optimiza la gestión documentaria de la Institución Educativa Mixta
“Señor de Huayllay”, con una corrección de continuidad de 0,005
2. Está demostrado que los estudiantes y padres de familias de la Institución Educativa Mixta
“Señor de Huayllay”, tienen conocimiento sobre los avances tecnológicos y están de acuerdo
con la implementación de un sistema de información de gestión documentaria, para que puedan
visualizar y verificar la ubicación del expediente que está tramitando.
3. La confiabilidad del sistema de información optimiza satisfactoriamente en el proceso de
gestión de documentaria en cuanto a la satisfacción de los usuarios al tener un sistema de
información sin errores, características que definen a este indicador de calidad.
4. La eficiencia del sistema de información mejora satisfactoriamente en la gestión documentaria
ya que a través de la velocidad y un rápido tiempo de respuesta la información, y sobre todo la
importancia que está siempre disponible para los usuarios de manera fácil, una característica
que describe este indicador de calidad.

## Página 86

86

RECOMENDACIONES
1. El personal encargado de la gestión documentaria deberá capacitarse permanentemente sobre
calidad de atención, manejo de nuevas tecnologías de la información que contribuirá al
desarrollo integral del personal, con la finalidad que brinden un buen servicio a los usuarios
haciendo uso de diferentes medios digitales.
2. Se recomienda gestionar la autorización de la firma digital para certificar la legalidad de los
documentos firmados, así como, la identidad del responsable. Se debe realizar esta coordinación
para manejar las comunicaciones a través de los mensajes y archivos y, así evitar que puedan
negar la emisión de un documento.
3. Se recomienda generar Backup automáticos de manera diaria para no perder informaciones
registradas.
4. Se recomienda realizar una evaluación periódica de la interacción entre el usuario y el sistema
de información, con el objetivo de realizar mejoras en las funcionalidades del sistema.

## Página 87

87

BIBLIOGRAFÍA
Acevedo, F. (2004). Archivo General de la Nación. Recuperado de http://www.agn.gob.mx/.
Aco Cataldo, R. (1992). “Metodología de la Investigación Científica”. Lima: Universo S.A.
Arcaya, E. (2015). Desarrollo de un sistema de información de matricula. Tacna.
Baena P. , G. (2014). Metodologia de la investigación. Mexico: Patria.
Bernal T., C. (2006). Metodología de la Investigación para administración, economía,
humanidades y ciencias sociales. México.
Blancas, G., & Córdova, K. (2019). Tesis la “Implementación del Sistema Información del Sistema
de Trámite Documentario para Mejorar la Comunicación Interna en el Hospital Nacional
“Ramiro Prialé Prialé” – Huancayo 2019”. Huancayo.
Campillo, I. (2016). Tesis titulado “Sistema de Gestión Integral de documentos de archivo para
empresas de la construcción del Territorio de Camaguey”. Cuba.
Castellanos, R. (2008). Enciclopedia de Informática Activa. Perú.
Cruz, J. (2006). La gestión de documentos en las organizaciones. Madrid: Ediciones Pirámide.
Enriquez, E. (2016). tesis titulada: “Sistema de información web y su mejora en la gestión
académica del colegio privado Hans Ke Lsen del distrito de Florencia de mora Trujillo”.
Trujillo.
Fernandez A., V. (2012). Desarrollo de Sistema de Informcion. Lima.
Fernandez, V. (2006). Desarrollo de Sistemas de Información. España.
Hernández Sampieri, R., Fernández Collado , C., & Baptista Lucio, P. (2014). Metodologí de la
investigación. Mexico.
Hernández, R., Fernández, C., & Baptista, M. (2016). Metodología de la investigación. Mexico:
Mc Graw Hill.
Kendall, E., & Kendall, J. (2011). Análisis y diseño de sistemas. Mexico: Pearson Educación.

## Página 88

88

Laudon, K., & Laudon, J. (2012). Sistemas de Información Gerencial. Mexico: Pearson
Educación.
Loayza, M., & Ochoa, C. (2017). Tesis “Análisis al Sistema Trámite Documentario y el Servicio
de Atención en las Universidades Públicas de Lima Metropolitana”. Lima.
Maratalla, J. (2002). Bases de Datos con SQL SERVER 2000. Madrid: ES. Grupo EIDOS.
Martillo, C., & Mora, A. (2015). Análisis, Diseño e implementación de un Sistema para la Gestión
Académica y Administrativa de la Unidad Educativa Salesiana Santa María Mazzarello
de Guayaquil. Ecuador.
Morales, J. (2010). La gestión de documentos. Lima.
Moro, M. (2010). Reflexiones en torno a la normalización archivística. Bogotá: Información
LTDA.
Núñez, E. (2007). Archivos y normas ISO.
Pais, E., & Ruiz , A. (2010). Universidad de Granada. Recuperado de
www.ugr.es/~epeis/docencia/archivistica/ruiz3.doc.
Sabana M., M. (2011). Power Builder 10.5 Programación sin límites. Perú: Editorial Megabyte.
Sabana Mendoza, M. (2006). Modelamiento e Implementación de Base de Datos. Lima.
Sánchez, A. (2014). La gestión de documentos como estrategia de innovación empresarial. Lima.
Senn, J. (1992). Análisis y diseño de sistemas de información:. México: McGraw-Hill.
Tomayo, M. (2007). Tipos de Investigación Cientifica. Lima.
Torres R., M. (2009). Normalización de base de datos. Argentina: El Cid Edito.
Torres Remon, M. (2017). Programacion Transact con SQL Server 2016. Lima: Macro EIRL.
Vega, P., & Alfonso, D. (2016). Tesis “Gestión Documental del departamento de administración
documentaria de la Universidad de Lima”. Lima.

## Página 89

89

Zachmann A., J. (2019). The Complete Business Process Handbook. EE.UU.

## Página 90

90

GLOSARIO
D
▪ Datos: Son colecciones de los resultados de compuestos por caracteres, números y
símbolos, acumulados en un ordenador de forma que puedan ser procesado, 47, 49, 52, 53,
90
▪ Dependencia: Entidad que representa a las dependencias (oficinas) que componen una
unidad orgánica de la institución., 44, 45, 50
▪ Documentos: Entidad que representa a los documentos físicos contenidos en un
expediente., 42, 44, 68
E
▪ Empleado: Entidad que contiene los datos de los trabajadores que desarrollan sus
actividades dentro de la institución., 22
▪ Expediente: Entidad que representa a los expedientes físicos creados al interior de la
institución,o provenientes de instituciones externas a fin de satisfacer un trámite., 48, 81
H
▪ Hardware: Dispositivos físicos que comprende la tecnología informática., 23
I
▪ Información: La información es un conjunto organizado de datos XE "Datos:Son
colecciones de los resultados de compuestos por caracteres, números y símbolos,
acumulados en un ordenador de forma que puedan ser procesado" procesados, que
constituyen un mensaje que cambia el estado de conocimiento del sujeto o sistema que
recibe dicho mensaje., 47

## Página 91

91

▪ Informaciones: Es la sabiduria que estudian los tratamientos automaticos de las
informaciones mediante máquinas llamadas ordenadores., xvi, 36, 59
M
▪ Muestra: Son subgrupos de la poblaciones, digamos que un subgrupos de elementos que
pertenecen a los conjuntos definidos en sus características al que llamamos población, 52,
55; Son subgrupos de la poblaciones, digamos que un subgrupos de elementos que
pertenecen a los conjuntos definidos en sus características al que llamamos población., 51
P
▪ Procedimiento: Entidad que contiene los datos de los procedimientos administrativos
contenidos en el TUPA, 55, 78
R
▪ Registro: Es el conjunto completo de datos relacionados pertenecientes a una entrada., 48
S
▪ Software: Programas y rutinas que indican a la computadora que hacer y cuando hacerlo.
Este término designa los diversos tipos de programas usados en computación, 34, 48

## Página 92

92

ANEXO

## Página 93

ANEXO Nº 1: MATRIZ DE CONSISTENCIA

## Página 94

ANEXO Nº 2: OPERACIONALIZACIÓN DE VARIABLES

## Página 95

ANEXO Nº 3: CREACIÓN DE PROCESAMIENTO DE DATOS
I. Datos tabulados de la encuesta realizada a 148 personas entre ellos docentes,
administrativos y alumnos.
DATOS: DEL INSTRUMENTO DE RECOLECCIÓN DE DATOS
Nº X1 X2 X3 X4 X5 X6 X7 X8 X9 X10 X11 X12 X13 X14 X15 X16 X17 X18
1 4 5 5 5 5 5 5 5 5 4 4 3 5 5 5 5 5 5
2 5 5 5 5 5 5 4 3 4 5 5 5 4 1 2 3 4 5
3 5 5 5 4 4 5 3 2 3 5 5 4 5 3 3 4 5 5
4 5 5 5 5 5 5 5 4 4 5 5 5 4 3 3 4 4 5
5 5 5 4 4 3 3 4 5 5 5 5 5 5 4 5 5 3 4
6 4 5 4 4 5 5 5 4 5 4 3 3 5 5 5 3 3 4
7 5 5 5 5 5 4 5 4 2 5 2 3 5 5 5 5 5 5
8 4 5 5 5 5 4 5 4 2 5 2 5 5 5 5 2 5 5
9 3 4 5 4 4 5 5 5 5 5 3 5 5 5 2 2 5 5
10 3 4 5 4 4 5 3 5 5 4 3 5 5 5 2 3 4 4
11 2 3 5 3 5 5 3 4 3 4 4 5 5 2 4 5 5 3
12 3 3 5 3 5 5 4 4 3 3 5 5 3 2 4 4 5 4
13 4 4 5 4 3 4 5 5 3 3 5 3 3 3 5 5 3 5
14 5 5 5 4 3 4 5 5 5 4 5 3 2 5 5 5 4 5
15 5 5 4 5 4 3 5 5 5 5 5 5 2 5 2 2 5 5
16 4 5 4 5 5 3 5 4 1 5 2 5 4 4 2 2 5 5
17 4 4 5 5 5 2 5 4 2 5 2 5 5 1 4 5 5 1
18 2 4 5 4 2 2 4 3 3 2 3 3 5 1 4 5 4 2
19 1 3 4 5 2 1 4 3 4 2 1 3 5 3 5 1 4 4
20 2 3 5 5 3 5 5 4 5 1 4 4 4 4 5 2 2 4
21 4 4 4 5 4 5 5 5 5 1 4 5 4 5 5 4 4 5
22 5 4 4 4 4 4 5 5 4 2 5 5 3 5 5 5 5 5
23 5 5 3 4 5 4 4 5 4 4 5 5 3 5 1 5 5 5
24 3 5 5 3 5 5 4 4 5 5 5 1 3 5 2 2 5 5
25 3 4 4 3 5 5 3 4 5 5 5 1 4 5 3 4 1 4
26 4 5 3 4 4 5 4 4 5 5 4 3 5 3 3 5 2 5
27 4 4 4 4 4 5 5 5 5 3 4 4 5 3 4 5 5 5
28 5 5 5 5 5 4 5 5 5 3 2 5 5 5 4 5 5 5
29 5 5 5 5 5 4 4 5 3 5 2 5 5 5 5 3 4 3
30 5 5 5 5 5 3 5 5 3 5 5 5 5 5 5 3 4 5
31 4 4 5 4 4 4 5 5 2 5 5 5 5 5 5 4 5 5
32 5 5 4 4 4 5 4 5 2 2 3 3 2 3 5 5 2 5
33 5 3 4 3 5 5 2 4 3 2 1 3 2 3 4 5 1 3
34 4 5 5 3 5 4 3 4 3 5 1 4 3 2 4 1 5 5
35 4 4 5 4 3 3 4 4 5 5 5 5 4 1 2 2 5 5
36 5 5 5 4 3 4 5 5 5 5 5 5 5 1 3 5 5 1
37 5 4 4 5 2 5 5 5 5 5 2 5 5 3 4 4 2 2
38 4 5 5 5 2 5 5 5 2 3 5 5 5 4 4 3 5 2
39 5 5 5 5 4 5 4 5 2 4 4 5 5 5 5 5 5 5
40 4 4 5 4 5 4 5 4 3 5 4 3 4 5 5 5 4 4

## Página 96

41 5 4 4 4 5 4 3 4 4 6 5 2 4 5 5 5 2 3
42 4 4 5 5 5 3 4 4 4 6 5 2 3 3 4 3 2 4
43 5 5 3 5 5 4 5 52 5 2 5 2 5 4 4 3 5 5
44 5 5 4 4 5 5 5 1 5 2 2 3 5 5 5 4 5 5
45 4 5 5 5 5 5 5 1 4 5 2 4 4 5 5 4 5 1
46 5 3 4 5 1 5 5 3 3 5 2 5 4 5 3 5 4 1
47 4 3 3 5 1 5 5 5 3 1 1 5 4 5 3 5 3 2
48 5 2 3 5 3 4 5 3 2 5 1 5 5 5 4 5 5 3
49 5 4 4 5 4 4 5 2 2 1 5 3 5 2 4 2 5 5
50 4 5 5 5 4 3 5 1 1 5 5 3 3 2 5 2 3 5
51 3 5 4 5 4 4 5 3 1 5 4 2 3 3 5 1 2 5
52 4 5 5 5 5 5 5 4 2 5 3 2 5 5 5 3 1 4
53 5 4 5 5 5 3 5 5 5 4 3 4 5 5 3 4 3 4
54 5 4 5 5 5 2 3 5 4 4 3 4 5 1 3 5 5 3
55 4 4 5 5 5 4 4 3 5 4 4 5 2 1 4 5 5 3
56 4 5 4 5 5 5 5 2 5 5 4 5 2 4 4 5 4 4
57 5 4 4 5 5 5 5 2 5 5 5 5 5 4 5 5 2 4
58 5 5 5 5 5 5 5 2 5 5 5 6 5 5 5 4 4 4
59 5 5 5 5 5 5 2 1 4 5 5 3 5 5 5 2 5 4
60 4 5 4 5 5 4 2 1 4 5 3 4 5 5 4 2 5 5
61 5 5 4 5 4 3 3 5 4 5 2 5 4 3 4 3 5 5
62 5 4 5 5 4 3 4 5 4 2 2 5 4 3 5 5 4 5
63 3 4 5 5 4 4 5 5 5 4 4 5 5 5 5 5 4 5
64 3 5 5 5 4 5 5 4 5 4 4 5 5 5 5 5 5 5
65 2 5 4 5 5 5 5 4 5 4 5 2 5 2 5 3 5 5
66 3 5 4 5 5 5 5 4 5 5 5 3 2 2 3 3 3 1
67 4 5 5 5 5 5 5 3 5 5 5 3 4 5 3 2 2 2
68 5 5 5 5 3 5 4 2 4 5 3 4 5 5 3 2 1 3
69 5 5 5 5 3 4 5 2 4 2 2 4 5 5 4 4 4 3
70 5 5 5 5 4 5 4 1 4 2 2 4 5 5 4 4 4 3
71 5 5 2 5 4 5 3 1 5 4 2 4 5 1 5 5 3 5
72 4 5 3 5 5 5 2 4 5 5 4 5 4 1 5 5 2 5
73 4 5 3 5 5 5 4 4 3 5 5 5 4 5 5 5 5 5
74 3 4 5 5 5 5 5 5 3 5 5 5 5 5 2 5 5 5
75 3 4 4 5 5 4 3 5 4 5 5 5 5 5 2 4 5 5
76 4 3 4 5 4 4 2 5 5 1 5 3 5 5 3 4 5 3
77 4 2 3 5 4 3 5 5 3 3 1 3 5 3 1 5 5 5
78 4 3 3 5 3 3 5 4 3 5 1 5 5 3 1 3 4 5
79 5 4 4 5 3 3 5 1 4 5 3 5 3 5 4 5 5 5
80 5 4 5 5 4 2 2 1 5 5 5 5 4 5 5 5 5 5
81 5 5 5 5 4 2 2 2 1 5 5 5 5 5 5 1 3 1
82 4 5 5 5 5 3 3 2 1 3 5 4 5 5 3 3 4 1
83 4 5 4 5 5 5 1 2 5 3 3 5 5 1 5 5 5 2
84 3 4 4 5 5 4 1 1 5 3 5 2 5 1 2 5 5 3
85 4 4 3 5 5 4 4 1 5 3 2 1 4 5 2 5 5 4
86 5 3 2 5 5 5 5 5 4 2 3 3 3 5 5 3 3 5

## Página 97

87 5 4 2 5 3 5 5 5 4 5 4 2 3 5 5 2 1 5
88 5 5 4 5 4 5 5 5 4 5 4 5 4 5 3 5 5 5
89 5 5 4 5 5 4 5 5 5 5 4 5 5 2 1 5 5 5
90 5 5 5 5 5 4 3 5 5 5 5 5 5 2 5 5 5 5
91 5 5 5 5 5 3 1 2 3 3 5 5 1 3 5 5 2 5
92 5 5 5 5 4 3 1 2 3 5 2 3 5 5 2 5 4 3
93 4 5 5 5 4 4 2 1 4 5 2 3 5 5 2 4 5 3
94 4 5 4 5 3 5 3 3 5 5 5 5 5 5 5 5 5 4
95 3 4 4 5 3 5 3 3 5 3 5 5 5 5 5 5 1 5
96 3 4 3 5 5 5 5 5 2 5 5 5 4 1 1 5 1 5
97 3 5 3 5 5 5 4 5 3 5 4 4 4 1 1 3 5 2
98 2 5 4 5 5 4 3 5 4 5 4 2 3 2 4 4 4 1
99 2 4 5 5 5 4 2 5 5 5 2 4 5 3 5 5 3 3
100 3 4 5 5 2 5 1 5 5 1 2 5 2 4 5 5 4 5
101 4 5 5 5 4 5 2 2 5 5 5 5 1 4 5 5 5 5
102 5 5 4 5 4 2 3 2 5 5 5 5 2 4 2 1 5 4
103 5 5 4 5 2 5 4 1 5 4 5 5 3 5 2 2 5 5
104 4 3 5 5 1 5 5 1 3 4 5 5 5 5 5 3 5 5
105 4 3 5 5 4 4 5 3 1 5 3 3 5 5 5 4 4 3
106 5 5 5 5 5 4 4 3 3 5 3 3 4 5 5 5 4 1
107 5 5 4 5 5 5 4 3 5 5 4 2 5 2 1 5 5 1
108 3 4 3 5 5 5 3 3 5 3 5 2 5 2 1 5 5 2
109 3 5 3 5 4 3 4 5 5 4 5 2 2 5 5 5 5 3
110 4 2 4 5 4 3 5 5 5 5 5 3 3 5 5 5 5 4
111 5 3 5 5 4 4 5 5 3 5 2 3 5 5 5 4 5 5
112 5 4 5 5 5 5 5 5 5 5 5 4 5 5 5 4 3 5
113 5 5 5 5 5 2 5 2 5 5 5 4 3 5 4 3 5 5
114 4 4 5 5 5 2 5 2 5 2 5 5 2 1 4 3 5 5
115 4 5 4 5 4 3 5 2 5 2 4 5 1 1 5 5 5 4
116 5 4 5 5 5 3 3 3 2 5 4 5 3 5 5 5 5 5
117 5 5 5 5 5 1 5 3 2 5 3 5 4 5 5 5 4 5
118 5 4 4 5 5 3 5 3 5 5 3 5 4 5 5 1 4 5
119 4 4 4 5 4 4 2 4 5 4 3 5 5 5 4 2 5 3
120 4 4 5 5 4 5 5 4 5 4 4 4 3 5 4 3 5 4
121 5 5 5 5 4 3 1 1 5 5 5 4 5 4 2 5 5 5
122 5 5 5 5 4 5 4 1 5 5 5 3 5 4 2 5 3 5
123 5 5 4 5 5 5 4 3 3 4 5 4 5 3 3 5 2 5
124 3 3 4 5 5 5 5 3 5 4 5 2 5 5 4 5 1 1
125 3 3 3 5 5 4 5 4 5 5 5 5 3 5 4 5 4 2
126 2 2 4 5 5 4 5 5 5 5 3 5 3 5 4 2 5 5
127 4 2 5 5 5 5 1 5 2 5 4 5 5 2 5 3 5 5
128 5 5 5 5 5 5 1 5 3 2 5 5 5 3 4 4 5 5
129 5 5 5 5 5 3 2 5 4 5 5 4 2 3 5 4 2 4
130 5 5 4 5 4 4 2 5 4 5 5 4 2 5 5 5 1 3
131 4 4 4 5 3 5 5 2 5 4 2 5 5 5 5 5 3 5
132 5 5 5 5 3 5 5 5 5 3 2 5 5 4 5 5 3 5

## Página 98

133 5 5 5 5 4 4 5 5 5 5 5 5 1 3 5 2 5 4
134 4 5 5 5 4 5 2 5 3 5 5 5 1 4 2 2 5 4
135 5 5 5 5 3 5 3 3 3 5 5 5 5 5 3 5 5 3
136 5 4 4 5 3 4 3 2 5 4 5 4 5 5 3 5 5 2
137 4 5 4 5 4 5 4 2 5 4 5 4 5 5 4 5 5 4
138 5 4 4 5 5 5 5 1 5 3 5 3 5 4 4 5 3 5
139 4 5 5 5 5 4 5 1 1 3 5 3 3 3 2 5 3 5
140 4 4 3 5 5 1 5 4 3 1 4 4 3 2 2 5 4 5
141 3 3 2 5 4 2 1 4 4 5 4 5 5 5 4 4 5 2
142 3 2 2 5 4 3 1 4 5 5 2 5 5 5 4 3 5 1
143 2 3 4 5 3 4 5 4 5 5 3 5 5 4 5 3 5 4
144 1 4 5 5 3 5 5 3 5 4 3 1 2 5 5 2 5 5
145 3 4 5 5 4 5 4 3 5 5 3 2 4 3 5 3 5 5
146 5 4 5 5 5 5 2 2 5 5 4 5 5 4 1 4 3 5
147 5 4 2 5 5 4 5 2 5 5 4 5 5 5 4 5 1 4
148 4 5 3 5 5 4 5 1 5 5 5 5 5 5 4 5 2 4

## Página 99

II. Entrada de vista de variables en el SPSS Versión 22

## Página 100

III. Entrada de vista de datos en el SPSS Versión 22

## Página 101

III.1. Determinando el análisis de fiabilidad Alfa de Cronbach

## Página 102

III.2. Determinando el Alfa de Cronbach = 0.954

## Página 103

ANEXO Nº 4: MANUAL DE USUARIO
1. INTRODUCCIÓN
El sistema de gestión documentaria ha sido desarrollado de la Institución Educativa
Mixta "Señor de Huayllay" con el propósito de optimizar las operaciones de registro y
emisión documentaria. Su utilización posibilita el manejo y control de la
documentación, lo cual garantiza la agilidad en los procesos de búsqueda y emisión de
documentos, es un soporte dinámico y fácil de interactuar, de interfaz sencilla y
agradable.
2. GUÍA DE USUARIO
Se describe la guía de usuario que nos enseña la manera de gestionar y manipular la
información, con pasos ordenados que sin duda nos favorecerán a sacarle un mayor
provecho a los procesos para los cuales está destinado dicho sistema de información.
3. REPRESENTACIÓN DEL SISTEMA
3.1. ACCESO AL SISTEMA
Para iniciar la ejecución del Sistema de información, deberá realizar doble clic en
el ejecutable del sistema a continuación le mostrara la venta de ingreso al sistema
donde el administrador y/o operador del sistema deberá de ingresar el nombre de
usuario y clave de acceso proporcionada para acceder seguidamente presione
aceptar.

## Página 104

- Botón aceptar. Esta opción nos ordenar para ingresar al menú principal del
sistema.
- Botón cancelar. Nos permite abandonar acceso de identificación.
- En caso que la contraseña no sea correcta se presentará un mensaje de error como
nos muestra la imagen.

- Si se digitó correctamente la contraseña, le aparecerá una pantalla de mensaje dando
de bienvenida de acceso.

## Página 105

- Seguidamente aparecerá el Menú Principal del sistema de información.

3.2. VENTANA DE ADMINISTRACIÓN DE RECEPCIÓN DE DOCUMENTOS
Esta parte del sistema de información nos permite administrar, visualizar los
documentos recibidos

## Página 106

- Registrar nuevos usuarios, para lo cual se debe hacer clic en botón nuevo y nos
muestra una ventana de la siguiente manera:

- Una vez terminado de digitar todas las opciones para registrar los datos se
debe hacer clic en el botón guardar y si los datos fueron ingresados
correctamente nos muestra un mensaje de confirmación.

- Para eliminar los productos registrados hacer clic en el botón eliminar y nos
muestra un mensaje de confirmación de la siguiente manera.

- Botón aceptar nos confirma la eliminación de usuarios.
- Botón cancelar nos permite cancelar el proceso de eliminación.

## Página 107

3.3. VENTANA DE ADMINISTRACIÓN DE EMISIÓN DE DOCUMENTOS
Nos permite administrar todo tipo de documentos emitidos por la institución a
diferentes áreas e instituciones.

- Registrar nuevos documentos, para lo cual se debe hacer clic en botón new y
nos muestra una ventana de la siguiente manera:

## Página 108

3.4. REPORTES
Un reporte es un documento, generado por el sistema, que nos presenta de manera
Estructurada y/o Resumida, datos relevantes guardados o generados por la misma
aplicación y generalmente agrupan los datos de acuerdo a un interés específico.
3.4.1. Reporte de documentos recibidos

3.4.2. Reporte de documentos enviados
