import type { CookieOptions, Response } from "express";

export interface SetAuthCookieParams {
  res: Response;
  token?: string;
  rememberMe?: boolean;
  isProduction?: boolean;
}

export function setAuthCookie({
  res,
  token,
  rememberMe = false,
  isProduction = process.env.NODE_ENV === "production",
}: SetAuthCookieParams): void {
  if (!token) return;

  const maxAge = (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000;
  const options: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge,
    path: "/",
  };

  res.cookie("access_token", token, options);
}

/**
 * Limpia la cookie access_token al cerrar sesión.
 */
export function clearAuthCookie(
  res: Response,
  isProduction: boolean = process.env.NODE_ENV === "production",
): void {
  // Debe coincidir con las opciones de setAuthCookie o el navegador no borra la cookie
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });
}
