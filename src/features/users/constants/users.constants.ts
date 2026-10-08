export const USER_STATUSES = ["activo", "bloqueado", "inactivo"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const TEMP_PASSWORD_LENGTH = 10;

export const BCRYPT_SALT_ROUNDS = 10;

export const DEFAULT_USER_PAGE_LIMIT = 10;
