import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminGuard } from './guards/admin.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'change-me',
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AdminGuard],
  exports: [AuthService, JwtModule, JwtStrategy, AdminGuard],
})
export class AuthModule {}

