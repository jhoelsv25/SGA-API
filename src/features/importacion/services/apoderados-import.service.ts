import { Injectable } from "@nestjs/common";
import { ApoderadosService } from "../../apoderados/apoderados.service";
import { EstudiantesRepository } from "../../estudiantes/repositories/estudiantes.repository";
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
  getBool,
  getStr,
  parsearParentescoApoderado,
  validarCamposApoderadoFila,
} from "../utils";

@Injectable()
export class ApoderadosImportService implements IEntidadImportHandler {
  constructor(
    private readonly estudiantesRepository: EstudiantesRepository,
    private readonly apoderadosService: ApoderadosService,
  ) {}

  async analizar(ctx: AnalizarFilaContext): Promise<FilaPrevisualizadaDto> {
    const { numeroFila, datos, personaExistente, principalesPorEstudiante } = ctx;
    const codigoSiagieEstudiante = getStr(
      datos,
      "codigoSiagieEstudiante",
      "codigo_siagie_estudiante",
    );

    if (!codigoSiagieEstudiante) {
      return {
        numeroFila,
        datos,
        estado: "error",
        accion: "omitir",
        mensaje: "El código SIAGIE del estudiante es obligatorio.",
      };
    }

    const estudiante = await this.estudiantesRepository.findByCodigo(codigoSiagieEstudiante);
    if (!estudiante) {
      return {
        numeroFila,
        datos,
        estado: "error",
        accion: "omitir",
        mensaje: IMPORTACION_MESSAGES.ESTUDIANTE_NO_EXISTE,
      };
    }

    const validacion = validarCamposApoderadoFila(datos);
    if (!validacion.esValida) {
      return { numeroFila, datos, estado: "error", accion: "omitir", mensaje: validacion.mensaje };
    }

    const esPrincipal = getBool(datos, "esPrincipal", "es_principal");

    if (esPrincipal) {
      if (principalesPorEstudiante.has(codigoSiagieEstudiante)) {
        return {
          numeroFila,
          datos,
          estado: "error",
          accion: "omitir",
          mensaje: IMPORTACION_MESSAGES.DOS_PRINCIPALES_MISMO_ESTUDIANTE,
        };
      }
      principalesPorEstudiante.add(codigoSiagieEstudiante);
    }

    return {
      numeroFila,
      datos,
      estado: "valida",
      accion: personaExistente ? "reutilizar" : "crear",
      mensaje: personaExistente
        ? "Esta persona ya está registrada. Se vinculará como apoderado."
        : undefined,
    };
  }

  async procesar(ctx: ProcesarFilaContext): Promise<ProcesarFilaResult | null> {
    const { datos, basePersona, personaExistente, actorId, ip } = ctx;
    const codigoSiagieEstudiante = getStr(
      datos,
      "codigoSiagieEstudiante",
      "codigo_siagie_estudiante",
    );
    const estudiante = await this.estudiantesRepository.findByCodigo(codigoSiagieEstudiante);
    if (!estudiante) return null;

    const parentesco = parsearParentescoApoderado(datos);
    const esPrincipal = getBool(datos, "esPrincipal", "es_principal");

    const created = await this.apoderadosService.create(
      {
        personaId: personaExistente?.id,
        nuevaPersona: personaExistente ? undefined : basePersona,
        estudianteId: estudiante.id,
        parentesco,
        esPrincipal,
        viveConEstudiante: true,
        autorizadoRecoger: true,
        contactoEmergencia: true,
      },
      actorId,
      ip,
    );

    return {
      credencial: construirCredencialEmitida({
        nombreCompleto: created.apoderado.persona.nombreCompleto,
        numeroDocumento: basePersona.numeroDocumento,
        tipoRol: "Apoderado",
        nombreUsuario: created.apoderado.usuario?.nombreUsuario || basePersona.numeroDocumento,
        tempPassword: created.tempPassword || undefined,
      }),
    };
  }
}
