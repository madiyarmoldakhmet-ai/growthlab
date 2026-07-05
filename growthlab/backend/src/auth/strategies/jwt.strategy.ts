import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfiguration } from '../../config/configuration';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    config: ConfigService<AppConfiguration, true>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.secret', { infer: true }),
    });
  }

  validate(payload: JwtPayload) {
    if (!payload?.jti || this.authService.isTokenRevoked(payload.jti)) {
      throw new UnauthorizedException('Token is revoked');
    }

    return this.authService.toAuthenticatedUser(payload);
  }
}
