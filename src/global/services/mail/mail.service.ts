import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { MailConfig } from 'src/services/app-config/configTypes';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import Mail from 'nodemailer/lib/mailer';

type MailOptions = Mail.Options;

@Injectable()
export class MailService {
  private readonly fromValue: string;
  private readonly transport: Transporter<SMTPTransport.SentMessageInfo>;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    const mailConfig = this.configService.get<MailConfig>('mail');
    if (!mailConfig) {
      throw new Error('Mail configuration not found');
    }

    this.fromValue = mailConfig.from;
    this.transport = this.createTransport(mailConfig);
  }

  private createTransport(
    mailConfig: MailConfig,
  ): Transporter<SMTPTransport.SentMessageInfo> {
    return createTransport({
      host: mailConfig.transportOptions.host,
      port: mailConfig.transportOptions.port,
      auth: {
        user: mailConfig.transportOptions.auth.user,
        pass: mailConfig.transportOptions.auth.pass,
      },
    });
  }

  public async send(options: MailOptions): Promise<string> {
    const finalOptions = {
      from: this.fromValue,
      ...options,
    };

    try {
      const result = await this.transport.sendMail(finalOptions);
      this.logger.log(`Email sent to ${options.to}`);
      return result.response;
    } catch (error) {
      this.logger.error(
        `Error sending email to ${options.to}: ${error.message}`,
      );
      throw error;
    }
  }

  public from(): string {
    return this.fromValue;
  }
}
