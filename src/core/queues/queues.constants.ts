export const QUEUES = {
  AUDIT: "audit-queue",
  REPORTS: "reports-queue",
  EMAILS: "emails-queue",
  NOTIFICATIONS: "notifications-queue",
  ANIO_ESCOLAR: "anio-escolar-queue",
  IMPORTACION: "importacion-queue",
  SESIONES_CLASE: "sesiones-clase-queue",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
