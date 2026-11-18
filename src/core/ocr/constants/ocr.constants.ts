export const ESTRATEGIAS_OCR = Symbol("ESTRATEGIAS_OCR");

export const TIPOS_ESTRATEGIA_OCR = {
  MISTRAL: "mistral",
  GLM: "glm",
} as const;

export type TipoEstrategiaOcr = (typeof TIPOS_ESTRATEGIA_OCR)[keyof typeof TIPOS_ESTRATEGIA_OCR];

export const MIME_TYPES_OCR_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type MimeTypeOcr = (typeof MIME_TYPES_OCR_PERMITIDOS)[number];

export const OCR_DEFAULTS = {
  ESTRATEGIA_PRINCIPAL: TIPOS_ESTRATEGIA_OCR.MISTRAL,
  MODELO_MISTRAL_OCR: "mistral-ocr-latest",
  URL_BASE_MISTRAL: "https://api.mistral.ai/v1",
  MODELO_GLM_OCR: "glm-4v-plus",
  URL_BASE_GLM: "https://open.bigmodel.cn/api/paas/v4",
  TIMEOUT_MS: 30_000,
  MAX_BYTES: 10 * 1024 * 1024, // 10 MB
} as const;
