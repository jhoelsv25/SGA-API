/** Transacción de Drizzle simulada: las consultas devuelven la cola en orden y se anotan las escrituras. */
export function crearTransaccionFalsa(cola: unknown[][]) {
  const escrituras: Record<string, unknown>[] = [];
  const cadena = (esConsulta: boolean) => {
    const eslabon: Record<string, unknown> = {};
    for (const metodo of ["from", "innerJoin", "where", "limit"]) {
      eslabon[metodo] = () => eslabon;
    }
    const anotar = (valores: Record<string, unknown>) => {
      escrituras.push(valores);
      return eslabon;
    };
    eslabon.set = anotar;
    eslabon.values = anotar;
    let devuelveFilas = esConsulta;
    eslabon.returning = () => {
      devuelveFilas = true;
      return eslabon;
    };
    eslabon.then = (resolver: (filas: unknown[]) => unknown) =>
      resolver(devuelveFilas ? (cola.shift() ?? []) : []);
    return eslabon;
  };
  const tx = {
    select: () => cadena(true),
    update: () => cadena(false),
    insert: () => cadena(false),
  };
  const db = { transaction: (trabajo: (t: typeof tx) => Promise<unknown>) => trabajo(tx) };
  return { tx, db, escrituras };
}
