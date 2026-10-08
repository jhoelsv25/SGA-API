export function encodeCursor<T>(payload: T | null | undefined): string | null {
  if (!payload) return null;
  try {
    const json = JSON.stringify(payload);
    return Buffer.from(json, "utf-8").toString("base64url");
  } catch {
    return null;
  }
}

export function decodeCursor<T>(cursor?: string | null): T | null {
  if (!cursor || typeof cursor !== "string" || !cursor.trim()) {
    return null;
  }
  try {
    const json = Buffer.from(cursor.trim(), "base64url").toString("utf-8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
