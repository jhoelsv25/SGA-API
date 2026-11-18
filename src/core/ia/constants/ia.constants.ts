export const PROVEEDOR_IA = Symbol("PROVEEDOR_IA");

export const IA_DEFAULTS = {
  NOMBRE_PROVEEDOR: "gateway",
  MODELO_GATEWAY: "mistral/mistral-small-latest",
  TIMEOUT_MS: 30_000,
  TEMPERATURA_TEXTO: 0.4,
  TEMPERATURA_ESTRUCTURADA: 0.1,
} as const;
