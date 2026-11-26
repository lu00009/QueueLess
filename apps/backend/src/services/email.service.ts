import nodemailer, { Transporter } from 'nodemailer';
import { prisma } from '../config/database';
import { NotificationType } from '@prisma/client';

export class EmailService {
  private static transporter: Transporter | null = null;

  private static async getTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

    if (user && pass) {
      if (host === 'smtp.gmail.com' || user.endsWith('@gmail.com')) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass },
        });
        console.log(`📧 Gmail SMTP transporter initialized for: ${user}`);
      } else if (host) {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        console.log(`📧 Custom SMTP transporter initialized for: ${user}@${host}`);
      }
    } else {
      // In development / test environment, create a test transporter or console fallback
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        console.log(`📧 Ethereal test mail transporter initialized for: ${testAccount.user}`);
      } catch (err) {
        // Fallback to JSON transport
        this.transporter = nodemailer.createTransport({
          jsonTransport: true,
        });
      }
    }

    return this.transporter!;
  }

  /**
   * Send a branded staff invitation email
   */
  static async sendStaffInvitation(params: {
    recipientEmail: string;
    recipientName: string;
    organizationName: string;
    role: string;
    temporaryPassword?: string;
    inviterName?: string;
    userId?: string;
  }) {
    const fromName = process.env.SMTP_FROM_NAME || 'QueueLess';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@queueless.com';
    const fromAddress = `"${fromName}" <${fromEmail}>`;
    const loginUrl = process.env.WEB_PORTAL_URL || 'http://localhost:5173/login';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAFAF7; color: #14201A; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 32px; }
    .header { border-bottom: 1px solid #E5E7EB; padding-bottom: 16px; margin-bottom: 24px; }
    .badge { display: inline-block; background-color: #E8F3EC; color: #1F5C3A; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }
    h1 { font-size: 20px; font-weight: 600; color: #14201A; margin: 0 0 8px 0; }
    p { font-size: 14px; line-height: 1.6; color: #6B7A72; margin: 0 0 16px 0; }
    .card { background-color: #FAFAF7; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; margin: 20px 0; }
    .btn { display: inline-block; background-color: #1F5C3A; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; text-align: center; margin-top: 8px; }
    .footer { margin-top: 32px; border-top: 1px solid #E5E7EB; padding-top: 16px; font-size: 12px; color: #6B7A72; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">Team Invitation</span>
      <h1 style="margin-top: 12px;">Join ${params.organizationName} on QueueLess</h1>
      <p style="margin: 0;">Smart digital queue and service operations</p>
    </div>

    <p>Hello <strong>${params.recipientName}</strong>,</p>
    <p>You have been invited by <strong>${params.inviterName || 'an administrator'}</strong> to join the team at <strong>${params.organizationName}</strong> as <strong>${params.role}</strong>.</p>

    <div class="card">
      <div style="font-size: 12px; font-weight: 600; color: #14201A; margin-bottom: 8px;">Your Login Credentials</div>
      <div style="font-size: 13px; color: #14201A; margin-bottom: 4px;"><strong>Email:</strong> ${params.recipientEmail}</div>
      ${params.temporaryPassword ? `<div style="font-size: 13px; color: #14201A; margin-bottom: 4px;"><strong>Temporary Password:</strong> <code style="background: #E8F3EC; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${params.temporaryPassword}</code></div>` : ''}
      <div style="font-size: 13px; color: #14201A;"><strong>Assigned Role:</strong> ${params.role}</div>
    </div>

    <p>Click below to sign in to your operator console and begin managing branch queues:</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${loginUrl}" class="btn">Sign In to QueueLess Console</a>
    </div>

    <div class="footer">
      <p>If you were not expecting this invitation, you can safely ignore this email.</p>
      <p>&copy; ${new Date().getFullYear()} QueueLess Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

    try {
      const transporter = await this.getTransporter();
      const mailOptions = {
        from: fromAddress,
        to: params.recipientEmail,
        subject: `Team Invitation: Join ${params.organizationName} on QueueLess`,
        text: `Hello ${params.recipientName},\n\nYou have been invited to join ${params.organizationName} as ${params.role}.\n\nSign in at: ${loginUrl}\nEmail: ${params.recipientEmail}\nTemporary Password: ${params.temporaryPassword || 'Use your existing password'}\n`,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✉️ [EMAIL SENT] Staff invitation delivered to ${params.recipientEmail}:`);
      console.log(`   Message ID: ${info.messageId}`);
      if (nodemailer.getTestMessageUrl(info)) {
        console.log(`   Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }

      // Record in-app notification if user exists
      if (params.userId) {
        await prisma.notification.create({
          data: {
            userId: params.userId,
            type: NotificationType.SYSTEM,
            title: `Welcome to ${params.organizationName}`,
            message: `You were invited to join ${params.organizationName} as ${params.role}.`,
          },
        }).catch(() => {});
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info) || undefined,
      };
    } catch (err: any) {
      console.error(`⚠️ [EMAIL FAILED] Could not send email to ${params.recipientEmail}:`, err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}
