import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../config/app.config';
import { render, RenderOptions } from '@citydenapartments/email';

type SendResult = { success: true } | { success: false; error: string };

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly zeptomailUrl = 'https://api.zeptomail.com/v1.1/email';
  private readonly resendUrl = 'https://api.resend.com/emails';

  private get fromName(): string {
    return AppConfig.EMAIL_FROM_NAME || 'City Den Apartments';
  }

  private get fromEmail(): string {
    return AppConfig.EMAIL_FROM_EMAIL || 'noreply@citydenapartments.com';
  }

  async sendEmail(
    to: string,
    subject: string,
    template: React.ReactElement,
    options?: RenderOptions,
  ): Promise<SendResult> {
    const html = await render(template, options);
    return this.sendWithRetry(to, subject, html, 0);
  }

  private async sendWithRetry(
    to: string,
    subject: string,
    html: string,
    attempt: number,
  ): Promise<SendResult> {
    const maxAttempts = 5;
    const result = await this.trySend(to, subject, html);

    if (result.success) return result;

    if (attempt < maxAttempts - 1) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 15000);
      this.logger.warn(`Email send failed (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delay}ms: ${result.error}`);
      await new Promise((r) => setTimeout(r, delay));
      return this.sendWithRetry(to, subject, html, attempt + 1);
    }

    this.logger.error(`Email send failed after ${maxAttempts} attempts: ${result.error}`);
    return result;
  }

  private async trySend(
    to: string,
    subject: string,
    html: string,
  ): Promise<SendResult> {
    const zeptoResult = await this.sendZeptomail(to, subject, html);
    if (zeptoResult.success) return zeptoResult;

    this.logger.warn(`Zeptomail failed, falling back to Resend: ${zeptoResult.error}`);
    return this.sendResend(to, subject, html);
  }

  private async sendZeptomail(
    to: string,
    subject: string,
    html: string,
  ): Promise<SendResult> {
    const token = AppConfig.ZEPTOMAIL_API_TOKEN;
    if (!token) return { success: false, error: 'ZEPTOMAIL_API_TOKEN not configured' };

    try {
      const res = await fetch(this.zeptomailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token.startsWith('Zoho-enczapikey ') ? token : `Zoho-enczapikey ${token}`,
        },
        body: JSON.stringify({
          from: { address: this.fromEmail, name: this.fromName },
          to: [{ email_address: { address: to } }],
          subject,
          htmlbody: html,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(`Zeptomail responded ${res.status}: ${body.slice(0, 500)}`);
        return { success: false, error: `Zeptomail ${res.status}: ${res.statusText}` };
      }

      this.logger.log(`Email sent via Zeptomail to ${to}: "${subject}"`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: `Zeptomail fetch error: ${err.message}` };
    }
  }

  private async sendResend(
    to: string,
    subject: string,
    html: string,
  ): Promise<SendResult> {
    const apiKey = AppConfig.RESEND_API_KEY;
    if (!apiKey) return { success: false, error: 'RESEND_API_KEY not configured' };

    try {
      const res = await fetch(this.resendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: [to],
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(`Resend responded ${res.status}: ${body.slice(0, 500)}`);
        return { success: false, error: `Resend ${res.status}: ${res.statusText}` };
      }

      this.logger.log(`Email sent via Resend to ${to}: "${subject}"`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: `Resend fetch error: ${err.message}` };
    }
  }
}
