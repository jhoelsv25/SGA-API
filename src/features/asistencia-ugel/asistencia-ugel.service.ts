import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { CalendarioService } from "../calendario/calendario.service";
import { InstitucionRepository } from "../institucion/repositories/institucion.repository";
import { VARIABLE_HORARIO_POR_CLASES } from "../marcaciones/constants";
import type { MarcacionResponseDto } from "../marcaciones/dto";
import { MarcacionesRepository } from "../marcaciones/repositories";
import { claveClases, clasesDeDocentes } from "../marcaciones/repositories/clases-docente.query";
import {
  ahoraEnColegio,
  diaIsoDeFecha,
  esDiaLaborable,
  turnoSegunClases,
} from "../marcaciones/utils";
import { TurnosRepository } from "../turnos/repositories/turnos.repository";
import { VariablesSistemaService } from "../variables-sistema/variables-sistema.service";
import {
  leyendaAnexo03,
  MENSAJES_REPORTE as MSG,
  TIPOS_DE_UN_DIA,
  VARIABLES_REPORTE as VAR,
} from "./constants";
import type { CrearNovedadDto, FilaReporteDto, NovedadDto, ReporteUgelDto } from "./dto";
import {
  AsistenciaUgelRepository,
  type ServidorDelReporte,
} from "./repositories/asistencia-ugel.repository";
import {
  aplicarTerceraTardanza,
  evaluarDia,
  horasYMinutos,
  totalizar,
  type DiaEvaluado,
  type MarcaDelDia,
} from "./utils/reporte-ugel.util";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "setiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const INICIALES = ["L", "M", "M", "J", "V", "S", "D"];
const CONDICIONES = ["nombrado", "destacado", "encargado", "contratado"];

const diasDelMes = (mes: string): string[] => {
  const [anio, numero] = mes.split("-").map(Number);
  const total = new Date(Date.UTC(anio, numero, 0)).getUTCDate();
  return Array.from({ length: total }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`);
};

const diasEntre = (desde: string, hasta: string): string[] => {
  const fechas: string[] = [];
  for (let t = Date.parse(`${desde}T00:00:00Z`); t <= Date.parse(`${hasta}T00:00:00Z`);) {
    fechas.push(new Date(t).toISOString().slice(0, 10));
    t += 86_400_000;
  }
  return fechas;
};

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const numeros = (fechas: string[]) => fechas.map((f) => Number(f.slice(8))).join(", ");

const marcaDe = (m: MarcacionResponseDto | undefined): MarcaDelDia | null =>
  m
    ? {
        hora: m.fechaHora.slice(11, 19),
        resultado: m.resultado,
        minutosTardanza: m.minutosTardanza,
        justificada: m.justificada,
      }
    : null;

@Injectable()
export class AsistenciaUgelService {
  constructor(
    private readonly repository: AsistenciaUgelRepository,
    private readonly marcacionesRepository: MarcacionesRepository,
    private readonly turnosRepository: TurnosRepository,
    private readonly calendarioService: CalendarioService,
    private readonly institucionRepository: InstitucionRepository,
    private readonly variables: VariablesSistemaService,
    private readonly auditService: AuditService,
  ) {}

  /** Datos de los Anexos 03 y 04 del mes. Los días de hoy en adelante quedan en blanco. */
  async reporte(mes: string): Promise<ReporteUgelDto> {
    const { fecha: hoy } = ahoraEnColegio();
    if (mes > hoy.slice(0, 7)) throw new BadRequestException(MSG.MES_FUTURO);
    const fechas = diasDelMes(mes);
    const [desde, hasta] = [fechas[0], fechas[fechas.length - 1]];

    const [turnoDocentes, turnoAdministrativos] = await Promise.all([
      this.turnosRepository.findByAplicaA("docentes"),
      this.turnosRepository.findByAplicaA("administrativos"),
    ]);
    if (!turnoDocentes?.activo) throw new BadRequestException(MSG.SIN_TURNO_DOCENTES);

    const [servidores, novedades, marcas, institucion, porClases, reglas, practicantes] =
      await Promise.all([
        this.repository.servidores(desde, hasta),
        this.repository.novedades(desde, hasta),
        this.marcacionesRepository.marcacionesEntre(desde, hasta),
        this.institucionRepository.get(),
        this.variables.isActiva(VARIABLE_HORARIO_POR_CLASES.codigo, false),
        this.reglas(),
        this.repository.practicantes(desde, hasta),
      ]);
    const docentesIds = servidores
      .filter((s) => s.tipoTurno === "docentes")
      .map((s) => s.personaId);
    const [clases, sinClases, suspendidas] = await Promise.all([
      porClases ? clasesDeDocentes(this.marcacionesRepository.conexion, docentesIds, fechas) : null,
      this.calendarioService.fechasSinClases(fechas),
      this.calendarioService.fechasSinTrabajoPersonal(fechas),
    ]);

    const marcasPorClave = new Map<string, MarcacionResponseDto[]>();
    for (const m of marcas) {
      const clave = claveClases(m.personaId, m.fechaHora.slice(0, 10));
      marcasPorClave.set(clave, [...(marcasPorClave.get(clave) ?? []), m]);
    }

    const laborablesPorFecha = new Map<string, { esperados: number; conMarca: number }>();
    const sinNingunaMarca: string[] = [];
    const conCincoOMas: string[] = [];

    const filas: FilaReporteDto[] = servidores.map((s) => {
      const base = s.tipoTurno === "docentes" ? turnoDocentes : turnoAdministrativos;
      const propias = novedades.filter((n) => n.personaId === s.personaId);
      let evaluados: DiaEvaluado[] = fechas.map((fecha) => {
        const clave = claveClases(s.personaId, fecha);
        // En días sin clases no hay horario por clases: vale el turno general.
        const turno =
          base?.activo && clases && !sinClases.has(fecha)
            ? turnoSegunClases(base, clases.get(clave) ?? [], fecha)
            : base;
        const laborable = Boolean(
          turno?.activo &&
          fecha < hoy &&
          !suspendidas.has(fecha) &&
          esDiaLaborable(fecha, turno.diasLaborables) &&
          (!s.fechaIngreso || fecha >= s.fechaIngreso) &&
          (!s.fechaCese || fecha <= s.fechaCese),
        );
        const delDia = marcasPorClave.get(clave) ?? [];
        if (laborable) {
          const c = laborablesPorFecha.get(fecha) ?? { esperados: 0, conMarca: 0 };
          c.esperados += 1;
          if (delDia.length > 0) c.conMarca += 1;
          laborablesPorFecha.set(fecha, c);
        }
        const novedad = propias.find((n) => n.fechaDesde <= fecha && n.fechaHasta >= fecha);
        return evaluarDia({
          laborable,
          entrada: marcaDe(delDia.find((m) => m.tipo === "entrada")),
          salida: marcaDe(delDia.find((m) => m.tipo === "salida")),
          novedad: novedad
            ? { tipo: novedad.tipo, minutos: novedad.minutos, marcaOmitida: novedad.marcaOmitida }
            : null,
          horario: turno ?? { horaEntrada: "00:00", horaSalida: "00:00", toleranciaMin: 0 },
          incompletaEsInasistencia: reglas.incompletaEsInasistencia,
        });
      });
      evaluados = aplicarTerceraTardanza(evaluados, reglas.tardanzasParaInasistencia);
      const totales = totalizar(evaluados);
      if (
        evaluados.some((d) => d.codigo !== "") &&
        !fechas.some((f) => marcasPorClave.has(claveClases(s.personaId, f)))
      ) {
        sinNingunaMarca.push(s.nombreCompleto);
      }
      if (totales.diasInasistencia + totales.diasHuelga >= 5) conCincoOMas.push(s.nombreCompleto);

      return {
        personaId: s.personaId,
        dni: s.dni,
        nombreCompleto: s.nombreCompleto,
        cargo: s.cargo ?? "",
        condicion: s.condicion && CONDICIONES.includes(s.condicion) ? capital(s.condicion) : "",
        jornada: s.jornada,
        dias: evaluados.map((d) => d.codigo),
        diasInasistencia: totales.diasInasistencia,
        tardanza: horasYMinutos(totales.minutosTardanza),
        permisoSinGoce: horasYMinutos(totales.minutosPermisoSinGoce),
        diasHuelga: totales.diasHuelga,
        observaciones: this.observaciones(fechas, evaluados, propias),
      };
    });

    const [anio, numero] = mes.split("-").map(Number);
    const borrador = hasta >= hoy;
    const encabezado = {
      dreUgel: [institucion?.dre, institucion?.ugel].filter(Boolean).join(" / "),
      institucion: institucion?.nombre ?? "",
      nivelModalidad: reglas.nivelModalidad,
      turno: reglas.turno,
      periodo: `${capital(MESES[numero - 1])} ${anio}`,
      lugar: institucion?.distrito ?? "",
      director: institucion?.director ?? "",
    };

    const avisos: string[] = [];
    if (borrador) avisos.push("El mes no ha terminado: es un borrador y no debe enviarse.");
    const faltantes = (
      [
        ["DRE", institucion?.dre],
        ["UGEL", institucion?.ugel],
        ["director", institucion?.director],
        ["distrito", institucion?.distrito],
      ] as const
    )
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (faltantes.length > 0)
      avisos.push(`Complete en Institución: ${faltantes.join(", ")}. Sale en blanco.`);
    const enBlanco = fechas.filter(
      (f) => f < hoy && suspendidas.has(f) && esDiaLaborable(f, turnoDocentes.diasLaborables),
    );
    if (enBlanco.length > 0)
      avisos.push(
        `En blanco por el Calendario: días ${numeros(enBlanco)}. Si el personal debía trabajar (semanas de gestión), marque en el evento «El personal trabaja».`,
      );
    if (reglas.tardanzasParaInasistencia > 0)
      avisos.push(
        "Está activado el código 3T, que no figura en el Anexo 03 modificado por la RSG 121-2018. Úselo solo si la UGEL lo confirmó.",
      );
    const sinNadie = [...laborablesPorFecha]
      .filter(([, c]) => c.conMarca === 0)
      .map(([f]) => f)
      .sort();
    if (sinNadie.length > 0)
      avisos.push(
        `Nadie marcó los días ${numeros(sinNadie)}. Si fue feriado o no se usó el sistema, regístrelo en el Calendario; si no, todos salen con inasistencia.`,
      );
    if (sinNingunaMarca.length > 0)
      avisos.push(`Sin ninguna marca en el mes: ${sinNingunaMarca.join("; ")}.`);
    const incompletos = filas.filter((f) => f.observaciones.includes("Marca incompleta")).length;
    if (incompletos > 0)
      avisos.push(
        `${incompletos} persona(s) con inasistencia por marca incompleta o salida anticipada. Revise las observaciones antes de enviar.`,
      );
    const sinDatos = filas.filter((f) => !f.cargo || !f.condicion).length;
    if (sinDatos > 0)
      avisos.push(`${sinDatos} persona(s) sin cargo o sin condición: complete sus fichas.`);
    if (practicantes > 0)
      avisos.push(`${practicantes} practicante(s) no se incluyen: la norma no los contempla.`);
    if (porClases)
      avisos.push(
        "El horario del docente se está tomando de sus clases, no del Reglamento Interno (variable asistencia.docente_horario_segun_clases).",
      );
    if (turnoDocentes.toleranciaMin > 0)
      avisos.push(
        `El turno de docentes tiene ${turnoDocentes.toleranciaMin} minutos de tolerancia. La norma (5.3.1) cuenta la tardanza desde el primer minuto.`,
      );
    if (conCincoOMas.length > 0)
      avisos.push(
        `Con 5 o más días de inasistencia o huelga: ${conCincoOMas.join("; ")}. La inclusión de sábado y domingo (6.3.1.2) no se calcula aquí.`,
      );

    return {
      mes,
      borrador,
      encabezado,
      calendario: fechas.map((f) => ({
        numero: Number(f.slice(8)),
        inicial: INICIALES[diaIsoDeFecha(f) - 1],
      })),
      filas,
      leyenda: leyendaAnexo03(reglas.tardanzasParaInasistencia > 0).map(
        ([c, t]) => [c, t] as const,
      ),
      avisos,
    };
  }

  listarNovedades(mes: string): Promise<NovedadDto[]> {
    const fechas = diasDelMes(mes);
    return this.repository.novedades(fechas[0], fechas[fechas.length - 1], {
      incluirAnuladas: true,
    });
  }

  /** Personas a las que se les puede registrar una justificación. */
  async personas(mes: string): Promise<{ personaId: string; nombreCompleto: string }[]> {
    const fechas = diasDelMes(mes);
    const lista = await this.repository.servidores(fechas[0], fechas[fechas.length - 1]);
    return lista.map(({ personaId, nombreCompleto }) => ({ personaId, nombreCompleto }));
  }

  async registrarNovedad(dto: CrearNovedadDto, usuarioId: string, ip?: string) {
    await this.validarNovedad(dto);
    const id = await this.repository.crear(dto, usuarioId);
    await this.auditService.log({
      usuarioId,
      accion: "crear",
      tabla: "asistencia_novedades",
      registroId: id,
      valorNuevo: { ...dto },
      direccionIp: ip,
    });
    return { mensaje: MSG.GUARDADA, id };
  }

  async anularNovedad(id: string, motivo: string, usuarioId: string, ip?: string) {
    const actual = await this.repository.porId(id);
    if (!actual) throw new NotFoundException(MSG.NOVEDAD_NO_ENCONTRADA);
    if (actual.anulada) throw new ConflictException(MSG.YA_ANULADA);
    await this.repository.anular(id, motivo.trim(), usuarioId);
    await this.auditService.log({
      usuarioId,
      accion: "actualizar",
      tabla: "asistencia_novedades",
      registroId: id,
      valorAnterior: { anulada: false },
      valorNuevo: { anulada: true, motivo: motivo.trim() },
      direccionIp: ip,
    });
    return { mensaje: MSG.ANULADA };
  }

  private async validarNovedad(dto: CrearNovedadDto): Promise<void> {
    const mal = (m: string) => {
      throw new BadRequestException(m);
    };
    if (dto.fechaHasta < dto.fechaDesde) mal(MSG.RANGO_INVALIDO);
    if (TIPOS_DE_UN_DIA.includes(dto.tipo) && dto.fechaDesde !== dto.fechaHasta)
      mal(MSG.UN_SOLO_DIA);
    if (dto.tipo === "permiso_sin_goce" && !dto.minutos) mal(MSG.FALTAN_MINUTOS);
    const [persona] = await this.repository.servidores(
      dto.fechaDesde,
      dto.fechaHasta,
      dto.personaId,
    );
    if (!persona) mal(MSG.PERSONA_NO_ES_PERSONAL);
    if (dto.tipo === "trabajo_remoto") await this.validarRemoto(dto, persona);
    const cruce = await this.repository.novedades(dto.fechaDesde, dto.fechaHasta, {
      personaId: dto.personaId,
    });
    if (cruce.length > 0) throw new ConflictException(MSG.CRUCE);
    if (dto.tipo === "omision_justificada") await this.validarOmision(dto, persona);
  }

  /** Cada día de trabajo del rango debe estar sin clases y ser laborable para el personal. */
  private async validarRemoto(dto: CrearNovedadDto, persona: ServidorDelReporte): Promise<void> {
    const turno = await this.turnosRepository.findByAplicaA(persona.tipoTurno);
    const fechas = diasEntre(dto.fechaDesde, dto.fechaHasta);
    const [sinClases, sinTrabajo] = await Promise.all([
      this.calendarioService.fechasSinClases(fechas),
      this.calendarioService.fechasSinTrabajoPersonal(fechas),
    ]);
    const deTrabajo = fechas.filter((f) => turno && esDiaLaborable(f, turno.diasLaborables));
    if (deTrabajo.length === 0 || deTrabajo.some((f) => !sinClases.has(f) || sinTrabajo.has(f)))
      throw new BadRequestException(MSG.REMOTO_CON_CLASES);
  }

  /** RSG 326-2017, 6.1.5: límite mensual y plazo para presentar el sustento. */
  private async validarOmision(dto: CrearNovedadDto, persona: ServidorDelReporte): Promise<void> {
    const [limite, horas] = await Promise.all([
      this.numero(VAR.OMISIONES_POR_MES.codigo, VAR.OMISIONES_POR_MES.porDefecto),
      this.numero(VAR.HORAS_PARA_JUSTIFICAR.codigo, VAR.HORAS_PARA_JUSTIFICAR.porDefecto),
    ]);
    if (!dto.marcaOmitida) throw new BadRequestException(MSG.FALTA_MARCA_OMITIDA);
    if (!dto.presentadoEn) throw new BadRequestException(MSG.FALTA_PRESENTACION);
    const presentado = dto.presentadoEn.replace("T", " ").slice(0, 16);
    const { fecha, hora } = ahoraEnColegio();
    if (presentado > `${fecha} ${hora.slice(0, 5)}` || presentado.slice(0, 10) < dto.fechaDesde)
      throw new BadRequestException(MSG.PRESENTACION_FUTURA);
    // El plazo corre desde la hora programada de la marca que faltó.
    const turno = await this.turnoDelDia(persona, dto.fechaDesde);
    if (!turno) throw new BadRequestException(MSG.OMISION_SIN_HORARIO);
    const omitida = (dto.marcaOmitida === "ingreso" ? turno.horaEntrada : turno.horaSalida).slice(
      0,
      5,
    );
    const limiteFecha = new Date(Date.parse(`${dto.fechaDesde}T${omitida}:00Z`) + horas * 3_600_000)
      .toISOString()
      .slice(0, 16)
      .replace("T", " ");
    if (presentado > limiteFecha)
      throw new BadRequestException(MSG.PRESENTACION_FUERA_DE_PLAZO(horas));
    const fechas = diasDelMes(dto.fechaDesde.slice(0, 7));
    const usadas = await this.repository.novedades(fechas[0], fechas[fechas.length - 1], {
      personaId: dto.personaId,
    });
    if (usadas.filter((n) => n.tipo === "omision_justificada").length >= limite)
      throw new ConflictException(MSG.LIMITE_OMISIONES(limite));
  }

  /** El mismo horario con el que se evalúa ese día en el reporte. */
  private async turnoDelDia(persona: ServidorDelReporte, fecha: string) {
    const base = await this.turnosRepository.findByAplicaA(persona.tipoTurno);
    if (!base?.activo) return null;
    if (
      persona.tipoTurno !== "docentes" ||
      !(await this.variables.isActiva(VARIABLE_HORARIO_POR_CLASES.codigo, false)) ||
      (await this.calendarioService.fechasSinClases([fecha])).has(fecha)
    ) {
      return base;
    }
    const clases = await clasesDeDocentes(
      this.marcacionesRepository.conexion,
      [persona.personaId],
      [fecha],
    );
    return turnoSegunClases(base, clases.get(claveClases(persona.personaId, fecha)) ?? [], fecha);
  }

  private async numero(codigo: string, porDefecto: number): Promise<number> {
    const valor = Number(await this.variables.getValor(codigo, String(porDefecto)));
    return Number.isFinite(valor) ? valor : porDefecto;
  }

  private async reglas() {
    const [tardanzas, incompleta, nivelModalidad, turno] = await Promise.all([
      this.numero(
        VAR.TARDANZAS_PARA_INASISTENCIA.codigo,
        VAR.TARDANZAS_PARA_INASISTENCIA.porDefecto,
      ),
      this.variables.isActiva(
        VAR.INCOMPLETA_ES_INASISTENCIA.codigo,
        VAR.INCOMPLETA_ES_INASISTENCIA.porDefecto,
      ),
      this.variables.getValor(VAR.NIVEL_MODALIDAD.codigo, VAR.NIVEL_MODALIDAD.porDefecto),
      this.variables.getValor(VAR.TURNO.codigo, VAR.TURNO.porDefecto),
    ]);
    return {
      tardanzasParaInasistencia: tardanzas,
      incompletaEsInasistencia: incompleta,
      nivelModalidad,
      turno,
    };
  }

  private observaciones(fechas: string[], dias: DiaEvaluado[], novedades: NovedadDto[]): string {
    const textos: string[] = [];
    const incompletos = fechas.filter((_, i) => dias[i].motivo !== null);
    if (incompletos.length > 0)
      textos.push(`Marca incompleta o salida anticipada: días ${numeros(incompletos)}`);
    for (const n of novedades) {
      const rango =
        n.fechaDesde === n.fechaHasta
          ? n.fechaDesde.slice(8)
          : `${n.fechaDesde.slice(8)}/${n.fechaDesde.slice(5, 7)} al ${n.fechaHasta.slice(8)}/${n.fechaHasta.slice(5, 7)}`;
      textos.push(`${n.documento} (${rango})`);
    }
    return textos.join(". ");
  }
}
