import type { CookieOptions, Response } from "express";

export interface SetAuthCookieParams {
  res: Response;
  token?: string;
  refreshToken?: string;
  rememberMe?: boolean;
  isProduction?: boolean;
}

const UN_DIA_MS = 24 * 60 * 60 * 1000;

function construirOpcionesCookie(maxAge: number, isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge,
    path: "/",
  };
}

export function setAuthCookie({
  res,
  token,
  refreshToken,
  rememberMe = false,
  isProduction = process.env.NODE_ENV === "production",
}: SetAuthCookieParams): void {
  if (!token) return;

  const accessMaxAge = (rememberMe ? 30 : 1) * UN_DIA_MS;
  res.cookie("access_token", token, construirOpcionesCookie(accessMaxAge, isProduction));

  const refreshMaxAge = (rememberMe ? 30 : 7) * UN_DIA_MS;
  res.cookie(
    "refresh_token",
    refreshToken ?? token,
    construirOpcionesCookie(refreshMaxAge, isProduction),
  );
}

/**
 * Limpia las cookies HttpOnly access_token y refresh_token al cerrar sesión.
 */
export function clearAuthCookie(
  res: Response,
  isProduction: boolean = process.env.NODE_ENV === "production",
): void {
  // Debe coincidir con las opciones de setAuthCookie o el navegador no borra las cookies
  const opciones: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
  res.clearCookie("access_token", opciones);
  res.clearCookie("refresh_token", opciones);
}
