import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { SendAdminTestDto } from './dto/send-admin-test.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  overview() {
    return this.adminService.getOverview();
  }

  @Post('test-delivery')
  sendTestDelivery(@Body() dto: SendAdminTestDto) {
    return this.adminService.sendTestDelivery(dto);
  }

  @Post('send-to-contacts')
  sendToContacts(@Body() dto: SendAdminTestDto) {
    return this.adminService.sendToContacts(dto);
  }

  @Post('generate-message')
  generateMessage(
    @Body()
    dto: {
      product?: string;
      audience?: string;
      goal?: string;
      tone?: string;
      channel?: 'whatsapp' | 'email';
    },
  ) {
    return this.adminService.generateMessage(dto);
  }

  @Get('inbox')
  inbox() {
    return this.adminService.getInbox();
  }

  @Post('sync-gmail-replies')
  syncGmailReplies() {
    return this.adminService.syncGmailReplies();
  }
}
