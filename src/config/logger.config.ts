import { WinstonModuleOptions, utilities as nestWinstonUtilities } from "nest-winston";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

/**
 * Configuración de logs con Winston y rotación automática de archivos (DailyRotateFile).
 * - Guarda logs generales por 14 días.
 * - Guarda logs de errores críticos por 30 días.
 * - Comprime logs antiguos en .gz para ahorrar almacenamiento.
 */
export const getWinstonLoggerConfig = (): WinstonModuleOptions => {
  const isProduction = process.env.NODE_ENV === "production";

  // Formato común para archivos (JSON estructurado con timestamp)
  const fileLogFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  );

  return {
    transports: [
      // 1. Salida en consola (colorizada y formateada al estilo NestJS)
      new winston.transports.Console({
        level: isProduction ? "info" : "debug",
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonUtilities.format.nestLike("SGA-API", {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),

      // 2. Archivo rotativo de logs generales (info, warn, error)
      new DailyRotateFile({
        dirname: "logs",
        filename: "application-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        zippedArchive: true,
        maxSize: "20m",
        maxFiles: "14d", // Retención por 14 días
        level: "info",
        format: fileLogFormat,
      }),

      // 3. Archivo rotativo exclusivo para errores y excepciones críticas
      new DailyRotateFile({
        dirname: "logs",
        filename: "error-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        zippedArchive: true,
        maxSize: "20m",
        maxFiles: "30d", // Retención de errores por 30 días para auditoría
        level: "error",
        format: fileLogFormat,
      }),
    ],
  };
};
