import type { AuthServiceDeps } from "./deps";

export async function despacharAlertaNuevoDispositivo(
  deps: AuthServiceDeps,
  userId: string,
  ipAddress: string,
): Promise<void> {
  if (!deps.variablesService || !deps.notificacionesService) return;

  try {
    const activo = await deps.variablesService.isActiva(
      "notificacion.alerta_nuevo_dispositivo",
      true,
    );
    if (!activo) return;

    await deps.notificacionesService.enviar({
      usuarioId: userId,
      titulo: "Alerta de nuevo dispositivo",
      mensaje: `Se ha detectado un inicio de sesión en tu cuenta desde una nueva dirección IP (${ipAddress}).`,
      tipo: "alerta",
    });
  } catch {
    // Silenciar para no bloquear la respuesta de inicio de sesión
  }
}
