import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { AuditService } from "../../common/services/audit.service";
import { QUEUES } from "../../core/queues/queues.constants";
import { MENSAJES } from "./constants";
import {
  AnioAcademicoResponseDto,
  BimestreFechaDto,
  BimestreResponseDto,
  CreateAnioAcademicoDto,
  ReabrirAnioDto,
  UpdateAnioAcademicoDto,
} from "./dto";
import { AnioPersistido } from "./interfaces";
import { AniosAcademicosRepository } from "./repositories/anios.repository";
import {
  esFechaIso,
  hoyEnColegio,
  mensajeSiRangoInvalido,
  nombreBimestre,
  validarBimestres,
} from "./utils";

const JOB_CERRAR_REAPERTURAS = "cerrar-reaperturas";

@Injectable()
export class AniosAcademicosService implements OnModuleInit {
  private readonly logger = new Logger(AniosAcademicosService.name);

  constructor(
    private readonly aniosRepository: AniosAcademicosRepository,
    private readonly auditService: AuditService,
    @Optional()
    @InjectQueue(QUEUES.ANIO_ESCOLAR)
    private readonly cola?: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.cola) return;
    try {
      await this.cola.upsertJobScheduler(
        "cerrar-reaperturas-anio",
        { pattern: "5 0 * * *", tz: "America/Lima" },
        { name: JOB_CERRAR_REAPERTURAS, data: {} },
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo programar el cierre de reaperturas: ${(error as Error).message}`,
      );
    }
  }

  async findAll(): Promise<AnioAcademicoResponseDto[]> {
    await this.cerrarReaperturasVencidas();
    return this.aniosRepository.findAll();
  }

  async findEnCurso(): Promise<AnioAcademicoResponseDto> {
    await this.cerrarReaperturasVencidas();
    const vigente = await this.anioVigente();
    if (!vigente) {
      throw new NotFoundException("No hay un año escolar en curso.");
    }
    return vigente;
  }

  async findById(id: string): Promise<AnioAcademicoResponseDto> {
    const anio = await this.aniosRepository.findById(id);
    if (!anio) throw new NotFoundException("Año escolar no encontrado.");
    return anio;
  }

  async create(
    dto: CreateAnioAcademicoDto,
    actorId: string,
    ip?: string,
  ): Promise<AnioAcademicoResponseDto> {
    this.assertRangoAnio(dto.fechaInicio, dto.fechaFin);

    const existente = await this.aniosRepository.findByAnio(dto.anio);
    if (existente) {
      throw new ConflictException(MENSAJES.anioRepetido(dto.anio));
    }

    const bimestres = dto.bimestres ?? [];
    if (bimestres.length > 0) {
      this.assertBimestres({ fechaInicio: dto.fechaInicio, fechaFin: dto.fechaFin }, bimestres);
    }

    const creado = await this.aniosRepository.create({
      anio: dto.anio,
      nombre: dto.nombre?.trim() || null,
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      bimestres: bimestres.map((bimestre) => ({
        numero: bimestre.numero,
        nombre: nombreBimestre(bimestre.numero),
        fechaInicio: bimestre.fechaInicio,
        fechaFin: bimestre.fechaFin,
      })),
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "anios_academicos",
      registroId: creado.id,
      valorNuevo: this.resumen(creado),
      direccionIp: ip,
    });

    return creado;
  }

  async update(
    id: string,
    dto: UpdateAnioAcademicoDto,
    actorId: string,
    ip?: string,
  ): Promise<AnioAcademicoResponseDto> {
    const actual = await this.requireAnio(id);
    this.assertPlanificado(actual);

    const fechaInicio = dto.fechaInicio ?? actual.fechaInicio;
    const fechaFin = dto.fechaFin ?? actual.fechaFin;
    this.assertRangoAnio(fechaInicio, fechaFin);

    if (actual.bimestres.length > 0) {
      this.assertBimestres({ fechaInicio, fechaFin }, actual.bimestres);
    }

    const actualizado = await this.aniosRepository.update(id, {
      ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() || null } : {}),
      fechaInicio,
      fechaFin,
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "anios_academicos",
      registroId: id,
      valorAnterior: this.resumen(actual),
      valorNuevo: this.resumen(actualizado),
      direccionIp: ip,
    });

    return actualizado;
  }

  async guardarBimestres(
    id: string,
    bimestres: BimestreFechaDto[],
    actorId: string,
    ip?: string,
  ): Promise<AnioAcademicoResponseDto> {
    const actual = await this.requireAnio(id);
    this.assertPlanificado(actual);
    this.assertBimestres(actual, bimestres);

    const guardado = await this.aniosRepository.guardarBimestres(
      id,
      bimestres.map((bimestre) => ({
        numero: bimestre.numero,
        nombre: nombreBimestre(bimestre.numero),
        fechaInicio: bimestre.fechaInicio,
        fechaFin: bimestre.fechaFin,
      })),
    );

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "periodos_academicos",
      registroId: id,
      valorAnterior: { bimestres: actual.bimestres },
      valorNuevo: { bimestres: guardado.bimestres },
      direccionIp: ip,
    });

    return guardado;
  }

  async iniciar(id: string, actorId: string, ip?: string): Promise<AnioAcademicoResponseDto> {
    const actual = await this.requireAnio(id);
    if (actual.estado !== "planificado") {
      throw new BadRequestException("Solo se puede iniciar un año escolar planificado.");
    }

    if (actual.bimestres.length !== 4) {
      throw new BadRequestException(MENSAJES.bimestresIncompletos);
    }
    this.assertBimestres(actual, actual.bimestres);

    const enCurso = await this.aniosRepository.findEnCurso();
    if (enCurso && enCurso.id !== id) {
      throw new ConflictException(MENSAJES.otroAnioEnCurso);
    }

    const iniciado = await this.aniosRepository.cambiarEstadoAnio(id, "en_curso");
    await this.auditarEstado("anios_academicos", id, actual.estado, iniciado.estado, actorId, ip);
    return iniciado;
  }

  async cerrar(id: string, actorId: string, ip?: string): Promise<AnioAcademicoResponseDto> {
    const actual = await this.requireAnio(id);
    if (actual.estado !== "en_curso" && actual.estado !== "reabierto") {
      throw new BadRequestException("No se puede cerrar un año que no está en curso.");
    }

    const abiertos = actual.bimestres.filter((bimestre) => bimestre.estado !== "cerrado");
    if (actual.bimestres.length !== 4 || abiertos.length > 0) {
      throw new BadRequestException(MENSAJES.anioConBimestresAbiertos);
    }

    const cerrado = await this.aniosRepository.cambiarEstadoAnio(id, "cerrado", {
      motivo: actual.motivoReapertura,
      hasta: null,
    });
    await this.auditarEstado("anios_academicos", id, actual.estado, cerrado.estado, actorId, ip);
    return cerrado;
  }

  async reabrir(
    id: string,
    dto: ReabrirAnioDto,
    actorId: string,
    ip?: string,
  ): Promise<AnioAcademicoResponseDto> {
    const motivo = dto.motivo?.trim() ?? "";
    if (!motivo || !dto.fechaLimite || !esFechaIso(dto.fechaLimite)) {
      throw new BadRequestException(MENSAJES.reaperturaIncompleta);
    }

    const actual = await this.requireAnio(id);
    if (actual.estado !== "cerrado") {
      throw new BadRequestException("Solo se puede reabrir un año escolar cerrado.");
    }

    const reabierto = await this.aniosRepository.cambiarEstadoAnio(id, "reabierto", {
      motivo,
      hasta: `${dto.fechaLimite} 23:59:59`,
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "anios_academicos",
      registroId: id,
      valorAnterior: { estado: actual.estado },
      valorNuevo: {
        estado: reabierto.estado,
        motivoReapertura: motivo,
        reabiertoHasta: reabierto.reabiertoHasta,
      },
      direccionIp: ip,
    });

    return reabierto;
  }

  async iniciarBimestre(
    anioId: string,
    bimestreId: string,
    actorId: string,
    ip?: string,
  ): Promise<BimestreResponseDto> {
    const anio = await this.requireAnio(anioId);
    if (anio.estado !== "en_curso" && anio.estado !== "reabierto") {
      throw new BadRequestException("Inicie el año escolar antes de iniciar un bimestre.");
    }

    const bimestre = anio.bimestres.find((item) => item.id === bimestreId);
    if (!bimestre) throw new NotFoundException("Bimestre no encontrado.");
    if (bimestre.estado !== "planificado") {
      throw new BadRequestException("Solo se puede iniciar un bimestre planificado.");
    }

    const anterior = anio.bimestres.find((item) => item.numero === bimestre.numero - 1);
    if (anterior && anterior.estado !== "cerrado") {
      throw new BadRequestException(MENSAJES.bimestreFueraDeOrden);
    }

    const otroEnCurso = await this.aniosRepository.hayOtroBimestreEnCurso(anioId, bimestreId);
    if (otroEnCurso) {
      throw new BadRequestException(MENSAJES.bimestreFueraDeOrden);
    }

    const iniciado = await this.aniosRepository.cambiarEstadoBimestre(bimestreId, "en_curso");
    await this.auditarEstado(
      "periodos_academicos",
      bimestreId,
      bimestre.estado,
      iniciado.estado,
      actorId,
      ip,
    );
    return iniciado;
  }

  async cerrarBimestre(
    anioId: string,
    bimestreId: string,
    actorId: string,
    ip?: string,
  ): Promise<BimestreResponseDto> {
    const anio = await this.requireAnio(anioId);
    const bimestre = anio.bimestres.find((item) => item.id === bimestreId);
    if (!bimestre) throw new NotFoundException("Bimestre no encontrado.");
    if (bimestre.estado !== "en_curso") {
      throw new BadRequestException("Solo se puede cerrar un bimestre en curso.");
    }

    const cerrado = await this.aniosRepository.cambiarEstadoBimestre(bimestreId, "cerrado");
    await this.auditarEstado(
      "periodos_academicos",
      bimestreId,
      bimestre.estado,
      cerrado.estado,
      actorId,
      ip,
    );
    return cerrado;
  }

  /** Lo consulta RF-011: un bimestre cerrado bloquea sesiones y ausencias de sus fechas. */
  async sesionesBloqueadasEn(fecha: string): Promise<boolean> {
    return this.aniosRepository.bimestreCerradoEn(fecha);
  }

  async cerrarReaperturasVencidas(hoy = hoyEnColegio()): Promise<number> {
    const vencidos = await this.aniosRepository.cerrarReaperturasVencidas(hoy);
    for (const anio of vencidos) {
      await this.auditService.log({
        usuarioId: null,
        accion: "actualizar",
        tabla: "anios_academicos",
        registroId: anio.id,
        valorAnterior: { estado: "reabierto" },
        valorNuevo: { estado: "cerrado", vencidoEl: hoy },
      });
    }
    return vencidos.length;
  }

  async anioVigente(): Promise<AnioPersistido | null> {
    return (
      (await this.aniosRepository.findEnCurso()) ?? (await this.aniosRepository.findReabierto())
    );
  }

  private async requireAnio(id: string): Promise<AnioPersistido> {
    const anio = await this.aniosRepository.findById(id);
    if (!anio) throw new NotFoundException("Año escolar no encontrado.");
    return anio;
  }

  private assertPlanificado(anio: AnioPersistido): void {
    if (anio.estado !== "planificado") {
      throw new BadRequestException("Solo se pueden modificar las fechas de un año planificado.");
    }
  }

  private assertRangoAnio(inicio: string, fin: string): void {
    if (!esFechaIso(inicio) || !esFechaIso(fin)) {
      throw new BadRequestException("Indique una fecha válida (AAAA-MM-DD).");
    }
    const mensaje = mensajeSiRangoInvalido(inicio, fin, false);
    if (mensaje) throw new BadRequestException(mensaje);
  }

  private assertBimestres(
    anio: { fechaInicio: string; fechaFin: string },
    bimestres: { numero: number; fechaInicio: string; fechaFin: string }[],
  ): void {
    for (const bimestre of bimestres) {
      if (!esFechaIso(bimestre.fechaInicio) || !esFechaIso(bimestre.fechaFin)) {
        throw new BadRequestException("Indique una fecha válida (AAAA-MM-DD).");
      }
    }
    const mensaje = validarBimestres(anio, bimestres);
    if (mensaje) throw new BadRequestException(mensaje);
  }

  private resumen(anio: AnioPersistido): Record<string, unknown> {
    return {
      anio: anio.anio,
      nombre: anio.nombre,
      fechaInicio: anio.fechaInicio,
      fechaFin: anio.fechaFin,
      estado: anio.estado,
      bimestres: anio.bimestres.map((bimestre) => ({
        numero: bimestre.numero,
        fechaInicio: bimestre.fechaInicio,
        fechaFin: bimestre.fechaFin,
        estado: bimestre.estado,
      })),
    };
  }

  private async auditarEstado(
    tabla: string,
    registroId: string,
    anterior: string,
    nuevo: string,
    actorId: string,
    ip?: string,
  ): Promise<void> {
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla,
      registroId,
      valorAnterior: { estado: anterior },
      valorNuevo: { estado: nuevo },
      direccionIp: ip,
    });
  }
}
