export interface JwtPayload {
  sub: string; // ID de usuario (UUID)
  username: string;
  roleId: string;
  role: string;
  personaId: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  roleId: string;
  role: string;
  personaId: string;
}
