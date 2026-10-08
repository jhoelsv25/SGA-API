/**
 * Formatea una fecha de registro (Date o string) al formato estándar 'YYYY-MM-DD HH:mm:ss'.
 */
export function formatRecordTimestamp(val: string | Date | null | undefined): string {
  if (!val) return "";
  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, "0");
    const day = String(val.getDate()).padStart(2, "0");
    const hours = String(val.getHours()).padStart(2, "0");
    const minutes = String(val.getMinutes()).padStart(2, "0");
    const seconds = String(val.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  return val;
}
