export type AuthRole = 'admin' | 'member';

export interface JwtPayload {
  sub: string;
  email: string;
  role: AuthRole;
  organizationId: string;
  jti: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AuthRole;
  organizationId: string;
  jti: string;
}
