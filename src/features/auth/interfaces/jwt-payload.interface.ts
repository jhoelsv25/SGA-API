export interface ImpersonatorInfo {
  userId: string;
  username: string;
  roleId: string;
  role: string;
}

export interface JwtPayload {
  sub: string; // ID de usuario (UUID)
  username: string;
  roleId: string;
  role: string;
  personaId: string;
  /** RF-001 V3: token del paso 1 del login; aún falta elegir el rol (solo entonces se puede). */
  rolPendiente?: boolean;
  /** Recordar la sesión, para conservarlo al emitir el token del rol elegido. */
  recordar?: boolean;
  /** Información del Administrador o Soporte TI cuando está en modo vista simulada. */
  impersonatedBy?: ImpersonatorInfo;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  roleId: string;
  role: string;
  personaId: string;
  rolPendiente?: boolean;
  recordar?: boolean;
  impersonatedBy?: ImpersonatorInfo;
}
