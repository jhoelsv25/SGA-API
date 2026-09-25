export const QUEUES = {
  REPORTS: "reports-queue",
  EMAILS: "emails-queue",
  NOTIFICATIONS: "notifications-queue",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
