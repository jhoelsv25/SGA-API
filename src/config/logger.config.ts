import { WinstonModuleOptions, utilities as nestWinstonUtilities } from "nest-winston";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

/**
 * Configuración de logs con Winston y rotación automática de archivos (DailyRotateFile).
 * - Guarda logs generales por 5 días.
 * - Guarda logs de errores críticos por 7 días.
 * - Comprime logs antiguos en .gz para ahorrar almacenamiento.
 */
export const getWinstonLoggerConfig = (): WinstonModuleOptions => {
  const isProduction = process.env.NODE_ENV === "production";

  const fileLogFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  );

  return {
    transports: [
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
        maxSize: "10m",
        maxFiles: "5d", // Retención de solo 5 días para no saturar disco en VPS
        level: "info",
        format: fileLogFormat,
      }),

      // 3. Archivo rotativo exclusivo para errores y excepciones críticas
      new DailyRotateFile({
        dirname: "logs",
        filename: "error-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        zippedArchive: true,
        maxSize: "10m",
        maxFiles: "7d", // Retención de errores por 7 días para depuración
        level: "error",
        format: fileLogFormat,
      }),
    ],
  };
};
