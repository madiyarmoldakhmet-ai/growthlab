import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID, timingSafeEqual } from 'crypto';
import { AppConfiguration } from '../config/configuration';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser, AuthRole, JwtPayload } from './auth.types';

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24;
const ENV_MANAGED_PASSWORD = 'env-managed';

@Injectable()
export class AuthService {
  // TODO: move token revocation to Redis in the queue phase (survives restarts).
  private readonly revokedTokenIds = new Map<string, number>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfiguration, true>,
    private readonly prisma: PrismaService,
  ) {}

  async login(loginDto: LoginDto) {
    const adminEmail = this.config.get('admin.email', { infer: true });
    const adminPassword = this.config.get('admin.password', { infer: true });

    if (
      !this.safeEquals(loginDto?.email, adminEmail) ||
      !this.safeEquals(loginDto?.password, adminPassword)
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.ensureAdminUser(adminEmail);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as AuthRole,
      organizationId: user.organizationId,
      jti: randomUUID(),
    };

    const expiresIn =
      this.config.get('jwt.expiresInSeconds', { infer: true }) ??
      DEFAULT_TOKEN_TTL_SECONDS;
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        organizationId: payload.organizationId,
      },
    };
  }

  logout(user: AuthenticatedUser, authorization?: string) {
    this.cleanupRevokedTokens();

    const payload = authorization
      ? this.jwtService.decode(this.extractBearerToken(authorization))
      : undefined;
    const expiresAt =
      this.getPayloadExpiry(payload) ??
      Date.now() + DEFAULT_TOKEN_TTL_SECONDS * 1000;

    this.revokedTokenIds.set(user.jti, expiresAt);

    return { success: true };
  }

  isTokenRevoked(jti: string) {
    this.cleanupRevokedTokens();

    const expiresAt = this.revokedTokenIds.get(jti);
    if (!expiresAt) {
      return false;
    }

    if (expiresAt <= Date.now()) {
      this.revokedTokenIds.delete(jti);
      return false;
    }

    return true;
  }

  toAuthenticatedUser(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
      jti: payload.jti,
    };
  }

  /**
   * Ensures the configured admin exists as a real DB user inside an organization.
   * Password is still verified against env (ADMIN_PASSWORD); the DB row only
   * provides a stable user/organization identity for data scoping.
   */
  private async ensureAdminUser(email: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return existing;
    }

    const organization = await this.ensureDefaultOrganization();

    return this.prisma.user.create({
      data: {
        email,
        passwordHash: ENV_MANAGED_PASSWORD,
        role: 'admin',
        organization: { connect: { id: organization.id } },
      },
    });
  }

  private async ensureDefaultOrganization() {
    const existing = await this.prisma.organization.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.organization.create({
      data: { name: 'Default Organization' },
    });
  }

  private safeEquals(value: string | undefined, expected: string) {
    if (!value) {
      return false;
    }

    const valueBuffer = Buffer.from(value);
    const expectedBuffer = Buffer.from(expected);

    if (valueBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(valueBuffer, expectedBuffer);
  }

  private extractBearerToken(authorization: string) {
    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) {
      return '';
    }

    return token;
  }

  private getPayloadExpiry(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      return undefined;
    }

    const expiresAt = (payload as { exp?: unknown }).exp;
    if (typeof expiresAt !== 'number') {
      return undefined;
    }

    return expiresAt * 1000;
  }

  private cleanupRevokedTokens() {
    const now = Date.now();
    for (const [jti, expiresAt] of this.revokedTokenIds.entries()) {
      if (expiresAt <= now) {
        this.revokedTokenIds.delete(jti);
      }
    }
  }
}
