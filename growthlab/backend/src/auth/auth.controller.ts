import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { AdminGuard } from './guards/admin.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('authorization') authorization?: string,
  ) {
    return this.authService.logout(user, authorization);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin')
  admin(@CurrentUser() user: AuthenticatedUser) {
    return {
      ok: true,
      user,
    };
  }
}

