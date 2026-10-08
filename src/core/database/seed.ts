/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString:
    "postgresql://postgres.pnevrdipvbewpswgxvyz:PrmYs7UfvYDsVEwV@aws-0-us-east-2.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  console.log("Iniciando seed de datos institucionales...");

  // 1. Institución
  await pool.query(`
    INSERT INTO institucion (
      nombre, codigo_modular, tipo_gestion, ugel, dre, director, direccion, distrito, provincia, departamento, correo
    ) VALUES (
      'I.E. Carmelinas de Lircay',
      '0543210',
      'publica',
      'UGEL Angaraes',
      'DRE Huancavelica',
      'Mg. Carmen Rosa Huamán',
      'Jr. Bolognesi s/n',
      'Lircay',
      'Angaraes',
      'Huancavelica',
      'admin@carmelinas.edu.pe'
    ) ON CONFLICT (fila_unica) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      correo = EXCLUDED.correo;
  `);

  // 2. Persona Administrador
  const personaRes = await pool.query(`
    SELECT id FROM personas WHERE numero_documento = '70123456'
  `);
  let personaId: string;
  if (personaRes.rows.length === 0) {
    const newPersona = await pool.query(`
      INSERT INTO personas (
        tipo_documento, numero_documento, nombres, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, direccion, distrito, correo
      ) VALUES (
        'dni', '70123456', 'Roberto Carlos', 'Alarcón', 'Mendoza', '1988-05-15', 'M', 'Jr. Bolognesi 123', 'Lircay', 'admin@carmelinas.edu.pe'
      ) RETURNING id;
    `);
    personaId = newPersona.rows[0].id;
  } else {
    personaId = personaRes.rows[0].id;
  }
  console.log("Persona configurada:", personaId);

  // 3. Rol Administrador
  const roleRes = await pool.query(`SELECT id FROM roles WHERE nombre = 'Administrador' LIMIT 1`);
  const rolId = roleRes.rows[0].id;
  console.log("Rol Administrador:", rolId);

  // 4. Usuario Admin
  const hash = await bcrypt.hash("Admin123*", 10);
  const existingUser = await pool.query(`SELECT id FROM usuarios WHERE nombre_usuario = 'admin'`);

  if (existingUser.rows.length > 0) {
    await pool.query(
      `UPDATE usuarios 
       SET contrasena_hash = $1, estado = 'activo', debe_cambiar_contrasena = false, intentos_fallidos = 0
       WHERE id = $2`,
      [hash, existingUser.rows[0].id],
    );
    console.log("Usuario admin actualizado exitosamente con contraseña Admin123*");
  } else {
    const res = await pool.query(
      `INSERT INTO usuarios (persona_id, rol_id, nombre_usuario, contrasena_hash, debe_cambiar_contrasena, estado, intentos_fallidos)
       VALUES ($1, $2, 'admin', $3, false, 'activo', 0)
       RETURNING id, nombre_usuario`,
      [personaId, rolId, hash],
    );
    console.log("Usuario admin creado exitosamente:", res.rows[0]);
  }

  await pool.end();
  console.log("Seed completado.");
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
