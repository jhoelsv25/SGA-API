import { Injectable } from "@nestjs/common";
import { DocentesRepository } from "../../docentes/repositories/docentes.repository";
import { DocentesService } from "../../docentes/docentes.service";
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
  parsearFechaIngreso,
  parsearJornadaHorasDocente,
  parsearTipoContratoDocente,
  validarCamposDocenteFila,
} from "../utils";

@Injectable()
export class DocentesImportService implements IEntidadImportHandler {
  constructor(
    private readonly docentesRepository: DocentesRepository,
    private readonly docentesService: DocentesService,
  ) {}

  async analizar(ctx: AnalizarFilaContext): Promise<FilaPrevisualizadaDto> {
    const { numeroFila, datos, personaExistente, codigosEnLote } = ctx;
    const codigoDocente = getStr(
      datos,
      "codigoDocente",
      "codigo_docente",
      "codigo",
      "codDocente",
      "cod_docente",
      "cod",
    );

    if (!codigoDocente) {
      return {
        numeroFila,
        datos,
        estado: "error",
        accion: "omitir",
        mensaje: "El código de docente es obligatorio.",
      };
    }

    if (codigosEnLote.has(codigoDocente)) {
      return {
        numeroFila,
        datos,
        estado: "error",
        accion: "omitir",
        mensaje: "Código de docente duplicado en el mismo archivo.",
      };
    }
    codigosEnLote.add(codigoDocente);

    const docenteExistente = await this.docentesRepository.findByCodigo(codigoDocente);
    if (docenteExistente) {
      return {
        numeroFila,
        datos,
        estado: "ya_registrada",
        accion: "omitir",
        mensaje: IMPORTACION_MESSAGES.YA_REGISTRADO("docente"),
      };
    }

    const validacion = validarCamposDocenteFila(datos);
    if (!validacion.esValida) {
      return { numeroFila, datos, estado: "error", accion: "omitir", mensaje: validacion.mensaje };
    }

    if (personaExistente) {
      const docentePorPersona = await this.docentesRepository.findByPersonaId(personaExistente.id);
      if (docentePorPersona) {
        return {
          numeroFila,
          datos,
          estado: "ya_registrada",
          accion: "omitir",
          mensaje: IMPORTACION_MESSAGES.YA_REGISTRADO("docente"),
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
    const codigoDocente = getStr(
      datos,
      "codigoDocente",
      "codigo_docente",
      "codigo",
      "codDocente",
      "cod_docente",
      "cod",
    );
    const especialidad = getOptStr(datos, "especialidad") || "Educación Secundaria";
    const tituloProfesional = getOptStr(datos, "tituloProfesional", "titulo_profesional");
    const tipoContrato = parsearTipoContratoDocente(datos);
    const jornadaHoras = parsearJornadaHorasDocente(datos);
    const fechaIngreso = parsearFechaIngreso(datos);

    const created = await this.docentesService.create(
      {
        personaId: personaExistente?.id,
        nuevaPersona: personaExistente ? undefined : basePersona,
        codigo: codigoDocente,
        especialidad,
        tituloProfesional,
        tipoContrato,
        jornadaHoras,
        fechaIngreso,
      },
      actorId,
      ip,
    );

    return {
      credencial: construirCredencialEmitida({
        nombreCompleto: created.docente.persona.nombreCompleto,
        numeroDocumento: basePersona.numeroDocumento,
        tipoRol: "Docente",
        nombreUsuario: created.docente.usuario?.nombreUsuario || codigoDocente,
        tempPassword: created.tempPassword || undefined,
        codigoCredencial: created.credencial.codigo,
        pin: created.credencial.pin,
      }),
    };
  }
}
