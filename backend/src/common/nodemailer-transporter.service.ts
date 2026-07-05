import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer';
import { AppConfiguration } from '../config/configuration';

@Injectable()
export class NodemailerTransporterService implements OnModuleInit {
  private transporter?: Transporter;

  constructor(
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  async onModuleInit() {
    // Инициализируем transporter при старте приложения
    this.createTransporter();
  }

  private createTransporter(): void {
    const smtp = this.config.get('smtp', { infer: true });
    if (!smtp.configured) {
      console.warn('SMTP is not configured. Email sending will not work.');
      return;
    }

    this.transporter = require('nodemailer').createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    console.log('✅ Nodemailer transporter initialized');
  }

  public getTransporter(): Transporter | undefined {
    return this.transporter;
  }
}