import { Injectable } from "@nestjs/common";
import { EstudiantesRepository } from "../../estudiantes/repositories/estudiantes.repository";
import { EstudiantesService } from "../../estudiantes/estudiantes.service";
import { IMPORTACION_MESSAGES } from "../constants";
import type { FilaPrevisualizadaDto } from "../dto";
import type {
  AnalizarFilaContext,
  IEntidadImportHandler,
  ProcesarFilaContext,
  ProcesarFilaResult,
} from "../interfaces";
import {
  construirCredencialEmitida,
  getOptStr,
  getStr,
  normalizarSiNo,
  parsearFechaIngreso,
  validarCamposEstudianteFila,
} from "../utils";

@Injectable()
export class EstudiantesImportService implements IEntidadImportHandler {
  constructor(
    private readonly estudiantesRepository: EstudiantesRepository,
    private readonly estudiantesService: EstudiantesService,
  ) {}

  async analizar(ctx: AnalizarFilaContext): Promise<FilaPrevisualizadaDto> {
    const { numeroFila, datos, personaExistente, codigosEnLote } = ctx;
    const codigoSiagie = getStr(datos, "codigoSiagie", "codigo_siagie", "codigo");

    if (!codigoSiagie) {
      return {
        numeroFila,
        datos,
        estado: "error",
        accion: "omitir",
        mensaje: "El código SIAGIE es obligatorio.",
      };
    }

    if (codigosEnLote.has(codigoSiagie)) {
      return {
        numeroFila,
        datos,
        estado: "error",
        accion: "omitir",
        mensaje: "Código SIAGIE duplicado en el mismo archivo.",
      };
    }
    codigosEnLote.add(codigoSiagie);

    const estudianteExistente = await this.estudiantesRepository.findByCodigo(codigoSiagie);
    if (estudianteExistente) {
      return {
        numeroFila,
        datos,
        estado: "ya_registrada",
        accion: "omitir",
        mensaje: IMPORTACION_MESSAGES.YA_REGISTRADO("estudiante"),
      };
    }

    const validacion = validarCamposEstudianteFila(datos);
    if (!validacion.esValida) {
      return { numeroFila, datos, estado: "error", accion: "omitir", mensaje: validacion.mensaje };
    }

    if (personaExistente) {
      const estudiantePorPersona = await this.estudiantesRepository.findByPersonaId(
        personaExistente.id,
      );
      if (estudiantePorPersona) {
        return {
          numeroFila,
          datos,
          estado: "ya_registrada",
          accion: "omitir",
          mensaje: IMPORTACION_MESSAGES.YA_REGISTRADO("estudiante"),
        };
      }
      return {
        numeroFila,
        datos,
        estado: "valida",
        accion: "reutilizar",
        mensaje: "Esta persona ya está registrada. Se usarán sus datos.",
      };
    }

    return {
      numeroFila,
      datos,
      estado: "valida",
      accion: "crear",
    };
  }

  async procesar(ctx: ProcesarFilaContext): Promise<ProcesarFilaResult | null> {
    const { datos, basePersona, personaExistente, actorId, ip } = ctx;
    const codigoSiagie = getStr(datos, "codigoSiagie", "codigo_siagie", "codigo");
    const fechaIngreso = parsearFechaIngreso(datos);
    const tieneDiscapacidad = normalizarSiNo(getStr(datos, "tieneDiscapacidad")) ?? false;

    const created = await this.estudiantesService.create(
      {
        personaId: personaExistente?.id,
        nuevaPersona: personaExistente ? undefined : basePersona,
        codigo: codigoSiagie,
        fechaIngreso,
        lenguaMaterna: getOptStr(datos, "lenguaMaterna", "lengua_materna"),
        religion: getOptStr(datos, "religion"),
        tieneDiscapacidad,
        detalleDiscapacidad: tieneDiscapacidad
          ? getOptStr(datos, "detalleDiscapacidad", "detalle_discapacidad")
          : undefined,
      },
      actorId,
      ip,
    );

    return {
      credencial: construirCredencialEmitida({
        nombreCompleto: created.estudiante.persona.nombreCompleto,
        numeroDocumento: basePersona.numeroDocumento,
        tipoRol: "Estudiante",
        nombreUsuario: created.estudiante.usuario?.nombreUsuario || codigoSiagie,
        tempPassword: created.tempPassword || undefined,
        codigoCredencial: created.credencial.codigo,
        pin: created.credencial.pin,
      }),
    };
  }
}
