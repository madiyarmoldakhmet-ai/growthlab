export type AuthRole = 'admin';

export interface JwtPayload {
  sub: string;
  email: string;
  role: AuthRole;
  jti: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AuthRole;
  jti: string;
}

