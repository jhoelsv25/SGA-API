export const GESTION_TYPES = ["publica", "privada", "convenio"] as const;
export type GestionType = (typeof GESTION_TYPES)[number];

export const MAX_LOGO_SIZE_BYTES = 1024 * 1024; // 1 MB
export const ALLOWED_LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg"] as const;
