import { ForbiddenException } from "@nestjs/common";

export const CODIGO_SIN_FICHA_DOCENTE = "SIN_FICHA_DOCENTE";
export const MENSAJE_SIN_FICHA_DOCENTE =
  "Esta opción es para docentes: su cuenta no tiene una ficha de docente.";

/** Respuesta única cuando una opción personal del docente la abre alguien sin ficha. */
export function sinFichaDocente(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    code: CODIGO_SIN_FICHA_DOCENTE,
    message: MENSAJE_SIN_FICHA_DOCENTE,
  });
}
