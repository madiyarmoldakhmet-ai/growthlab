import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID, timingSafeEqual } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser, JwtPayload } from './auth.types';

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24;

@Injectable()
export class AuthService {
  private readonly revokedTokenIds = new Map<string, number>();

  constructor(private readonly jwtService: JwtService) {}

  async login(loginDto: LoginDto) {
    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@growthlab.local';
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin';

    if (
      !this.safeEquals(loginDto?.email, adminEmail) ||
      !this.safeEquals(loginDto?.password, adminPassword)
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: 'admin',
      email: adminEmail,
      role: 'admin',
      jti: randomUUID(),
    };

    const expiresIn = Number(process.env.JWT_EXPIRES_IN_SECONDS) || DEFAULT_TOKEN_TTL_SECONDS;
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      },
    };
  }

  logout(user: AuthenticatedUser, authorization?: string) {
    this.cleanupRevokedTokens();

    const payload = authorization
      ? this.jwtService.decode(this.extractBearerToken(authorization))
      : undefined;
    const expiresAt = this.getPayloadExpiry(payload) ?? Date.now() + DEFAULT_TOKEN_TTL_SECONDS * 1000;

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
      jti: payload.jti,
    };
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
