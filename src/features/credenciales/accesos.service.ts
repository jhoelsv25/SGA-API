import { Injectable, NotFoundException } from "@nestjs/common";
import { CREDENCIAL_MESSAGES } from "./constants";
import { AccesosRepository, type PersonaAcceso } from "./repositories";

/** RF-007 V7: en un solo lugar, qué accesos tiene una persona de cualquier grupo. */
@Injectable()
export class AccesosService {
  constructor(private readonly repository: AccesosRepository) {}

  async buscar(q: string) {
    const palabras = q
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .split(/[\s,]+/)
      .filter(Boolean);
    if (palabras.length === 0) return [];
    const encontradas = await this.repository.buscar(palabras);
    const { fichas, cuentas } = await this.gruposDe(encontradas);
    return encontradas.map((p) => ({
      personaId: p.personaId,
      documento: p.documento,
      nombreCompleto: p.nombreCompleto,
      grupos: this.grupos(p.personaId, fichas, cuentas),
    }));
  }

  async detalle(personaId: string) {
    const persona = await this.repository.persona(personaId);
    if (!persona) throw new NotFoundException(CREDENCIAL_MESSAGES.PERSONA_NOT_FOUND);
    const [{ fichas, cuentas }, credencial] = await Promise.all([
      this.gruposDe([persona]),
      this.repository.credencialActiva(personaId),
    ]);
    const cuenta = cuentas[0];
    return {
      ...persona,
      grupos: this.grupos(personaId, fichas, cuentas),
      credencial,
      cuenta: cuenta
        ? {
            id: cuenta.id,
            nombreUsuario: cuenta.nombreUsuario,
            estado: cuenta.estado,
            esAdministrador: cuenta.roles.includes("Administrador"),
          }
        : null,
    };
  }

  private async gruposDe(lista: PersonaAcceso[]) {
    const ids = lista.map((p) => p.personaId);
    const [fichas, cuentas] = await Promise.all([
      this.repository.fichas(ids),
      this.repository.cuentas(ids),
    ]);
    return { fichas, cuentas };
  }

  private grupos(
    personaId: string,
    fichas: { personaId: string; grupo: string }[],
    cuentas: { personaId: string; roles: string[] }[],
  ): string[] {
    return [
      ...new Set([
        ...fichas.filter((f) => f.personaId === personaId).map((f) => f.grupo),
        ...cuentas.filter((c) => c.personaId === personaId).flatMap((c) => c.roles),
      ]),
    ];
  }
}
