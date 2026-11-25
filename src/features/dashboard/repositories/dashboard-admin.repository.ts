import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  bitacoraAuditoria,
  equiposAutorizados,
  personas,
  roles,
  usuarios,
} from "../../../core/database/schema";
import type { AdminActividadSemanalDto, AdminDashboardDataDto } from "../dto";
import { DashboardReferenciaRepository } from "./dashboard-referencia.repository";

const COLORES_ROLES = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#64748b"];
const NOMBRES_DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/**
 * Repositorio analítico de usuarios, equipos, auditoría y estado operativo
 * para Administrador y Soporte TI (RF-021).
 */
@Injectable()
export class DashboardAdminRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly referenciaRepo: DashboardReferenciaRepository,
  ) {}

  async obtenerDatosAdmin(): Promise<AdminDashboardDataDto> {
    const [
      usuariosRows,
      rolesRows,
      equiposRows,
      auditoriasRows,
      actividadSemanalRows,
      equiposRecientesRows,
      refPeriodo,
    ] = await Promise.all([
      this.db
        .select({
          total: count(),
          activos: sql<number>`count(*) filter (where ${usuarios.estado} = 'activo')`,
          bloqueados: sql<number>`count(*) filter (where ${usuarios.estado} = 'bloqueado')`,
          inactivos: sql<number>`count(*) filter (where ${usuarios.estado} = 'inactivo')`,
          intentosFallidos: sql<number>`coalesce(sum(${usuarios.intentosFallidos}), 0)`,
          sinAcceso30Dias: sql<number>`count(*) filter (where ${usuarios.ultimoAcceso} is null or ${usuarios.ultimoAcceso} < NOW() - INTERVAL '30 days')`,
        })
        .from(usuarios)
        .where(isNull(usuarios.eliminadoEn)),
      this.db
        .select({ rol: roles.nombre, cantidad: count(usuarios.id) })
        .from(roles)
        .leftJoin(usuarios, and(eq(usuarios.rolId, roles.id), isNull(usuarios.eliminadoEn)))
        .where(eq(roles.activo, true))
        .groupBy(roles.nombre)
        .orderBy(desc(count(usuarios.id))),
      this.db
        .select({
          total: count(),
          activos: sql<number>`count(*) filter (where ${equiposAutorizados.activo} = true)`,
        })
        .from(equiposAutorizados)
        .where(isNull(equiposAutorizados.eliminadoEn)),
      this.db
        .select({
          id: bitacoraAuditoria.id,
          accion: bitacoraAuditoria.accion,
          tabla: bitacoraAuditoria.tabla,
          fecha: bitacoraAuditoria.registradoEn,
          ip: bitacoraAuditoria.direccionIp,
          usuarioNombre: sql<string>`coalesce(${personas.nombres} || ' ' || ${personas.apellidoPaterno}, 'Sistema')`,
        })
        .from(bitacoraAuditoria)
        .leftJoin(usuarios, eq(bitacoraAuditoria.usuarioId, usuarios.id))
        .leftJoin(personas, eq(usuarios.personaId, personas.id))
        .orderBy(desc(bitacoraAuditoria.registradoEn))
        .limit(8),
      this.db
        .select({
          fecha: sql<string>`to_char(${bitacoraAuditoria.registradoEn}, 'YYYY-MM-DD')`,
          totalEventos: count(),
          iniciosSesion: sql<number>`count(*) filter (where ${bitacoraAuditoria.accion} = 'INICIAR_SESION')`,
          cambios: sql<number>`count(*) filter (where ${bitacoraAuditoria.accion} != 'INICIAR_SESION')`,
        })
        .from(bitacoraAuditoria)
        .where(sql`${bitacoraAuditoria.registradoEn} >= CURRENT_DATE - INTERVAL '6 days'`)
        .groupBy(sql`to_char(${bitacoraAuditoria.registradoEn}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${bitacoraAuditoria.registradoEn}, 'YYYY-MM-DD')`),
      this.db
        .select({
          id: equiposAutorizados.id,
          nombre: equiposAutorizados.nombre,
          tipo: equiposAutorizados.tipo,
          ultimoAcceso: equiposAutorizados.ultimoAcceso,
          autorizado: equiposAutorizados.autorizado,
          activo: equiposAutorizados.activo,
        })
        .from(equiposAutorizados)
        .where(isNull(equiposAutorizados.eliminadoEn))
        .orderBy(desc(equiposAutorizados.ultimoAcceso))
        .limit(4),
      this.referenciaRepo.obtenerPeriodoReferencia(),
    ]);

    const u = usuariosRows[0] ?? {
      total: 0,
      activos: 0,
      bloqueados: 0,
      inactivos: 0,
      intentosFallidos: 0,
      sinAcceso30Dias: 0,
    };

    const diasMap = new Map(
      actividadSemanalRows.map((r) => [
        r.fecha,
        {
          totalEventos: Number(r.totalEventos || 0),
          iniciosSesion: Number(r.iniciosSesion || 0),
          cambios: Number(r.cambios || 0),
        },
      ]),
    );

    const actividadSemanal: AdminActividadSemanalDto[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const fechaIso = d.toISOString().split("T")[0];
      const datosDia = diasMap.get(fechaIso) || { totalEventos: 0, iniciosSesion: 0, cambios: 0 };
      actividadSemanal.push({
        dia: NOMBRES_DIAS[d.getDay()],
        fecha: fechaIso,
        totalEventos: datosDia.totalEventos,
        iniciosSesion: datosDia.iniciosSesion,
        cambios: datosDia.cambios,
      });
    }

    const totalEquipos = Number(equiposRows[0]?.total || 0);
    const equiposActivos = Number(equiposRows[0]?.activos || 0);
    const cuentasBloqueadas = Number(u.bloqueados || 0);
    const intentosFallidos = Number(u.intentosFallidos || 0);

    return {
      kpis: {
        totalUsuarios: Number(u.total || 0),
        usuariosActivos: Number(u.activos || 0),
        usuariosBloqueados: cuentasBloqueadas,
        usuariosInactivos: Number(u.inactivos || 0),
        intentosFallidosHoy: intentosFallidos,
        sinAcceso30Dias: Number(u.sinAcceso30Dias || 0),
        totalEquipos,
        equiposActivos,
      },
      distribucionRoles: rolesRows.map((r, i) => ({
        rol: r.rol,
        cantidad: Number(r.cantidad || 0),
        fill: COLORES_ROLES[i % COLORES_ROLES.length],
      })),
      ultimasAuditorias: auditoriasRows.map((a) => ({
        id: Number(a.id),
        accion: a.accion,
        tabla: a.tabla,
        usuarioNombre: a.usuarioNombre,
        fecha: a.fecha,
        ip: a.ip ?? undefined,
      })),
      actividadSemanal,
      equiposRecientes: equiposRecientesRows.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        tipo: e.tipo || "escritorio",
        ultimoAcceso: e.ultimoAcceso ?? undefined,
        autorizado: Boolean(e.autorizado),
        activo: Boolean(e.activo),
      })),
      servicios: [
        {
          nombre: "Año Escolar y Período",
          estado: refPeriodo ? "operacional" : "degradado",
          detalle: refPeriodo
            ? `Año ${refPeriodo.anio}${refPeriodo.periodoNombre ? ` · ${refPeriodo.periodoNombre}` : " activo"}`
            : "Sin año lectivo activo configurado",
        },
        {
          nombre: "Equipos y Kioskos en Red",
          estado:
            totalEquipos === 0 || equiposActivos === totalEquipos ? "operacional" : "degradado",
          detalle:
            totalEquipos === 0
              ? "Sin equipos registrados"
              : `${equiposActivos} de ${totalEquipos} dispositivos autorizados y activos`,
        },
        {
          nombre: "Seguridad y Accesos",
          estado: cuentasBloqueadas > 0 ? "degradado" : "operacional",
          detalle:
            cuentasBloqueadas > 0
              ? `${cuentasBloqueadas} cuenta(s) bloqueada(s) · ${intentosFallidos} fallos hoy`
              : `Sin incidentes · ${Number(u.activos || 0)} usuarios activos`,
        },
        {
          nombre: "Bitácora y Auditoría",
          estado: "operacional",
          detalle:
            auditoriasRows.length > 0
              ? "Trazabilidad activa e inmutable"
              : "Esperando registros de actividad",
        },
      ],
    };
  }
}
