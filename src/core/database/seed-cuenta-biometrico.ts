import type { Pool } from "pg";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

/** Usuario del SGA a nombre del cual el programa del reloj pide la aprobación de su equipo (RF-022). */
export const CUENTA_SERVICIO_BIOMETRICO = "biometrico";
const ROL_SERVICIO_BIOMETRICO = "Servicio Biométrico";
const DOCUMENTO_SERVICIO_BIOMETRICO = "SERV-BIOMETRICO";

/**
 * Deja lista la cuenta de servicio del programa del reloj. Es idempotente: se puede ejecutar en cada seed.
 *
 * - Rol propio y sin menús: aunque alguien lograra entrar, no vería ni podría hacer nada.
 * - Contraseña aleatoria que nadie conoce y que no se guarda: la cuenta no sirve para iniciar sesión; solo existe
 *   para que `equipos_acceso.usuario_id` tenga a quién apuntar y el administrador apruebe el equipo.
 * - Si la cuenta ya existe no se toca su contraseña.
 */
export async function asegurarCuentaServicioBiometrico(pool: Pool): Promise<void> {
  await pool.query(
    `INSERT INTO roles (nombre, descripcion, es_sistema, activo)
     VALUES ($1, 'Cuenta de servicio del programa del reloj biométrico. Sin acceso a pantallas.', true, true)
     ON CONFLICT (nombre) DO UPDATE SET activo = true;`,
    [ROL_SERVICIO_BIOMETRICO],
  );
  const rol = await pool.query<{ id: string }>(`SELECT id FROM roles WHERE nombre = $1`, [
    ROL_SERVICIO_BIOMETRICO,
  ]);
  const rolId = rol.rows[0].id;

  const existente = await pool.query<{ id: string }>(
    `SELECT id FROM usuarios WHERE nombre_usuario = $1 AND eliminado_en IS NULL`,
    [CUENTA_SERVICIO_BIOMETRICO],
  );
  if (existente.rows.length > 0) {
    await pool.query(`UPDATE usuarios SET estado = 'activo', rol_id = $2 WHERE id = $1`, [
      existente.rows[0].id,
      rolId,
    ]);
    console.log("✔ Cuenta de servicio 'biometrico' ya existía: verificada.");
    return;
  }

  let persona = await pool.query<{ id: string }>(
    `SELECT id FROM personas
     WHERE tipo_documento = 'pasaporte' AND numero_documento = $1 AND eliminado_en IS NULL`,
    [DOCUMENTO_SERVICIO_BIOMETRICO],
  );
  if (persona.rows.length === 0) {
    persona = await pool.query<{ id: string }>(
      `INSERT INTO personas (tipo_documento, numero_documento, nombres, apellido_paterno, sexo)
       VALUES ('pasaporte', $1, 'Servicio', 'Biométrico', 'M') RETURNING id;`,
      [DOCUMENTO_SERVICIO_BIOMETRICO],
    );
  }

  const claveDescartada = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  await pool.query(
    `INSERT INTO usuarios (persona_id, rol_id, nombre_usuario, contrasena_hash, debe_cambiar_contrasena, estado, intentos_fallidos)
     VALUES ($1, $2, $3, $4, false, 'activo', 0)`,
    [persona.rows[0].id, rolId, CUENTA_SERVICIO_BIOMETRICO, claveDescartada],
  );
  console.log(
    "✔ Cuenta de servicio 'biometrico' creada (sin contraseña conocida, sin acceso a pantallas).",
  );
}
