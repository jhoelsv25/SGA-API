export const USER_STATUSES = ["activo", "bloqueado", "inactivo"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const TEMP_PASSWORD_LENGTH = 10;

export const BCRYPT_SALT_ROUNDS = 10;

export const DEFAULT_USER_PAGE_LIMIT = 10;

/** RF-002 V2 (HU1): mensajes de la gestión de varios roles por cuenta. */
export const USER_ROLE_MESSAGES = {
  ROLE_NOT_FOUND: "El rol seleccionado no existe o no está activo.",
  ALREADY_ASSIGNED: "La cuenta ya tiene ese rol.",
  NOT_ASSIGNED: "La cuenta no tiene ese rol.",
  LAST_ROLE: "La cuenta debe tener al menos un rol.",
  RETIRE_PRINCIPAL: "No puede retirar el rol principal. Marque otro rol como principal primero.",
  SELF_ADMIN: "No puede retirarse el rol Administrador a sí mismo.",
  CARGO_NOT_FOUND: "El cargo seleccionado no existe o no está vigente.",
  // RF-002 V3: registro único
  PERSONA_REQUIRED: "Seleccione una persona del padrón o registre una nueva.",
  CORREO_REPETIDO: "El correo ya está registrado para otra persona.",
  CARGO_SIN_ROLES: "El cargo no tiene roles sugeridos. Indique al menos un rol.",
} as const;
