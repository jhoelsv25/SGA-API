import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  MENU_AUSENCIAS_DOCENTES,
  MENU_CONSOLIDADOS_DOCENTES,
  MENU_JUSTIFICACIONES_SESION,
} from "../../common/constants";
import { InstitucionService } from "../institucion/institucion.service";
import { ahoraEnColegio } from "../marcaciones/utils";
import {
  ETIQUETAS_PENDIENTE,
  MENSAJES_CONSOLIDADO,
  TIPOS_PENDIENTE,
  VARIABLES_CONSOLIDADO,
  type TipoPendiente,
} from "./constants";
import type { PendientesQueryDto } from "./dto";
import type {
  ActorConsolidado,
  PendienteCrudo,
  PendienteItem,
  PendientesResponse,
} from "./interfaces";
import { ConsolidadoDocenteRepository, SeguimientoReportesRepository } from "./repositories";
import {
  calcularHorasPedagogicas,
  diasEntre,
  generarExcelInformeMensual,
  generarExcelPendientes,
} from "./utils";

const TOLERANCIA_DEFECTO = 15;
const PLAZO_DESCARGO_DEFECTO = 7;
const DIAS_DECIDIR_DEFECTO = 0;

function entero(valor: string | null, defecto: number): number {
  const n = Number.parseInt(valor ?? "", 10);
  return Number.isNaN(n) ? defecto : n;
}

/** Informe mensual de horas efectivas y pendientes de seguimiento (RF-013 V2, HU6 y HU7). */
@Injectable()
export class SeguimientoReportesService {
  constructor(
    private readonly repository: SeguimientoReportesRepository,
    private readonly consolidados: ConsolidadoDocenteRepository,
    private readonly institucionService: InstitucionService,
  ) {}

  private exigirDirectivo(actor: ActorConsolidado) {
    if (!["Director", "Subdirector", "Administrador"].includes(actor.role)) {
      throw new ForbiddenException(MENSAJES_CONSOLIDADO.NO_TIENE_PERMISO);
    }
  }

  private async nombreInstitucion(): Promise<string> {
    const institucion = await this.institucionService.get().catch(() => null);
    return institucion?.nombre ?? "SGA Colegio";
  }

  private enlaceDe(c: PendienteCrudo): string {
    const periodo = c.periodoId ? `periodoId=${c.periodoId}` : "";
    switch (c.tipo) {
      case "justificacion_sin_resolver":
        return `${MENU_JUSTIFICACIONES_SESION}?sesionId=${c.referenciaId}`;
      case "descargo_vencido":
        return `${MENU_AUSENCIAS_DOCENTES}?ausenciaId=${c.referenciaId}`;
      case "consolidado_sin_generar":
        return `${MENU_CONSOLIDADOS_DOCENTES}?${periodo}&docenteId=${c.docenteId}`;
      case "consolidado_sin_decision":
        return `${MENU_CONSOLIDADOS_DOCENTES}?${periodo}&consolidadoId=${c.referenciaId}`;
      case "solicitud_revision_abierta":
        return `${MENU_CONSOLIDADOS_DOCENTES}?${periodo}&solicitudId=${c.referenciaId}`;
      case "compromiso_vencido":
        return `${MENU_CONSOLIDADOS_DOCENTES}?${periodo}&compromisoId=${c.referenciaId}`;
    }
  }

  async pendientes(
    filtros: PendientesQueryDto,
    actor: ActorConsolidado,
  ): Promise<PendientesResponse> {
    this.exigirDirectivo(actor);
    const hoy = ahoraEnColegio().fecha;
    const [plazo, diasDecidir] = await Promise.all([
      this.consolidados.valorVariable(VARIABLES_CONSOLIDADO.PLAZO_DESCARGO_DIAS),
      this.consolidados.valorVariable(VARIABLES_CONSOLIDADO.DIAS_PARA_DECIDIR),
    ]);
    const crudos = await this.repository.pendientes(
      filtros,
      hoy,
      entero(plazo, PLAZO_DESCARGO_DEFECTO),
      entero(diasDecidir, DIAS_DECIDIR_DEFECTO),
    );

    const items: PendienteItem[] = crudos
      .map((c) => ({
        tipo: c.tipo,
        tipoEtiqueta: ETIQUETAS_PENDIENTE[c.tipo],
        docenteId: c.docenteId,
        docenteNombre: c.docenteNombre,
        periodoId: c.periodoId,
        periodoNombre: c.periodoNombre,
        fechaOrigen: c.origen,
        diasAtraso: diasEntre(c.vence, hoy),
        referenciaId: c.referenciaId,
        enlace: this.enlaceDe(c),
      }))
      .sort(
        (a, b) => b.diasAtraso - a.diasAtraso || a.docenteNombre.localeCompare(b.docenteNombre),
      );

    const conteos = Object.fromEntries(TIPOS_PENDIENTE.map((t) => [t, 0])) as Record<
      TipoPendiente,
      number
    >;
    for (const i of items) conteos[i.tipo] += 1;

    return {
      fecha: hoy,
      conteos,
      total: items.length,
      items,
      mensaje: items.length === 0 ? MENSAJES_CONSOLIDADO.SIN_PENDIENTES : null,
    };
  }

  async exportarPendientes(
    filtros: PendientesQueryDto,
    actor: ActorConsolidado,
    generadoPor: string,
  ) {
    const { items } = await this.pendientes(filtros, actor);
    return await generarExcelPendientes(items, {
      institucion: await this.nombreInstitucion(),
      generadoPor,
      filtros: {
        Bimestre: items.find((i) => i.periodoNombre)?.periodoNombre ?? undefined,
        Docente: filtros.docenteId ? items[0]?.docenteNombre : undefined,
      },
    });
  }

  /** Informe por mes calendario; no requiere consolidado ni bimestre cerrado. */
  async informeMensualExcel(mes: string, actor: ActorConsolidado, generadoPor: string) {
    this.exigirDirectivo(actor);
    const [anio, numero] = mes.split("-").map(Number);
    if (!anio || !numero) throw new BadRequestException("El mes debe tener el formato AAAA-MM.");
    const desde = `${mes}-01`;
    const ultimo = new Date(Date.UTC(anio, numero, 0)).getUTCDate();
    const hasta = `${mes}-${String(ultimo).padStart(2, "0")}`;

    const [tolerancia, horaPedagogica] = await Promise.all([
      this.consolidados.valorVariable("sesion.tolerancia_ingreso_min"),
      this.consolidados.valorVariable(VARIABLES_CONSOLIDADO.MINUTOS_HORA_PEDAGOGICA),
    ]);
    const minutosHora = entero(horaPedagogica, 0);
    if (minutosHora < 1) {
      throw new BadRequestException(
        MENSAJES_CONSOLIDADO.VARIABLE_FALTANTE(VARIABLES_CONSOLIDADO.MINUTOS_HORA_PEDAGOGICA),
      );
    }
    const filas = await this.repository.informeMensual(
      desde,
      hasta,
      entero(tolerancia, TOLERANCIA_DEFECTO),
    );
    if (filas.length === 0) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.INFORME_MES_SIN_SESIONES);
    }

    return await generarExcelInformeMensual(
      filas.map((f) => {
        const horas = calcularHorasPedagogicas(
          f.minutosProgramados,
          f.minutosDictados,
          minutosHora,
        );
        return {
          docenteNombre: f.docenteNombre,
          docenteDni: f.docenteDni,
          // El modelo de datos aún no relaciona al docente con un nivel educativo (P-76).
          nivel: "Sin definir",
          jornadaHoras: f.jornadaHoras,
          horasProgramadas: horas.horasProgramadas,
          horasDictadas: horas.horasDictadas,
          justificadas: f.justificadas,
          injustificadas: f.injustificadas,
          tardanzas: f.tardanzas,
          minutosPerdidosFirma: f.minutosPerdidosFirma,
          minutosFueraAula: f.minutosFueraAula,
        };
      }),
      {
        mes: `${String(numero).padStart(2, "0")}/${anio}`,
        institucion: await this.nombreInstitucion(),
        generadoPor,
      },
    );
  }
}
