/**
 * El colegio puede salir a internet por una sola IP: el límite de acceso se cuenta por IP y usuario, para que los
 * intentos de una persona no bloqueen a las demás. Se ejecuta antes de validar el cuerpo, por eso no confía en él.
 */
export function rastreadorDeAcceso(req: Record<string, unknown>): string {
  const ip = typeof req.ip === "string" && req.ip ? req.ip : "unknown-ip";
  const cuerpo = req.body as { username?: unknown } | undefined;
  const usuario =
    typeof cuerpo?.username === "string" ? cuerpo.username.trim().toLowerCase().slice(0, 50) : "";
  return `${ip}|${usuario}`;
}

export const LIMITE_ACCESO = {
  long: { limit: 5, ttl: 60000, getTracker: rastreadorDeAcceso },
};
