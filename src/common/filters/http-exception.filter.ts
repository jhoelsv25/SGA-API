import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { getNowUtc } from "../utils";

interface ErrorResponsePayload {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  [key: string]: unknown;
}

/**
 * Filtro global de excepciones que captura cualquier error HTTP o no controlado (500)
 * y emite una respuesta JSON consistente, tipada y con formato legible para el frontend.
 */
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isProduction = process.env.NODE_ENV === "production";
    const timestamp = getNowUtc().toISOString();

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorName = "Internal Server Error";
    let message = "Ocurrió un error inesperado en el servidor.";
    let validationErrors: string[] | undefined = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
        errorName = exception.name;
      } else if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const payload = exceptionResponse as ErrorResponsePayload;
        errorName = payload.error || exception.name;

        if (Array.isArray(payload.message)) {
          // Errores de validación de DTOs (ValidationPipe / class-validator)
          validationErrors = payload.message;
          message = `Error de validación: ${payload.message.join(", ")}`;
        } else if (typeof payload.message === "string") {
          message = payload.message;
        }
      }
    } else if (exception instanceof Error) {
      // Excepciones no controladas de JavaScript / base de datos / runtime
      errorName = exception.name;
      message = isProduction
        ? "Error interno del servidor. Si el problema persiste, contacte a soporte."
        : exception.message;

      this.logger.error(
        `Error no controlado [${request.method} ${request.url}]: ${exception.message}`,
        exception.stack,
      );
    }

    // Registra errores de validación en logs para diagnóstico rápido
    if (statusCode === 400 && validationErrors && validationErrors.length > 0) {
      this.logger.warn(
        `[400] ${request.method} ${request.url} - Validación: ${validationErrors.join("; ")}`,
      );
    } else if (statusCode >= 500) {
      this.logger.error(`[${statusCode}] ${request.method} ${request.url} - ${message}`);
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      error: errorName,
      message,
      ...(validationErrors ? { errors: validationErrors } : {}),
      path: request.originalUrl || request.url,
      method: request.method,
      timestamp,
    });
  }
}
