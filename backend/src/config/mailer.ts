import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure nodemailer transporter (standard SMTP)
const transportConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_PORT === '465', // true for 465, false for 587 or other
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

const transporter = nodemailer.createTransport(transportConfig);

/**
 * Sends a premium-styled HTML OTP email to the user.
 */
export const sendOtpEmail = async (to: string, username: string, otp: string): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"TechQuiz AI" <noreply@techquiz.com>',
    to,
    subject: 'Verify Your TechQuiz AI Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your TechQuiz AI Account</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #0b0f19;
            color: #f3f4f6;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #111827;
            border: 1px solid #1f2937;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
          }
          .header {
            text-align: center;
            border-bottom: 1px solid #1f2937;
            padding-bottom: 24px;
            margin-bottom: 24px;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            background: linear-gradient(to right, #a78bfa, #6366f1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #f3f4f6;
          }
          .body-text {
            font-size: 15px;
            line-height: 1.6;
            color: #9ca3af;
            margin-bottom: 24px;
          }
          .otp-container {
            text-align: center;
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid rgba(99, 102, 241, 0.3);
            padding: 18px;
            border-radius: 8px;
            margin-bottom: 24px;
          }
          .otp-code {
            font-size: 32px;
            font-weight: 800;
            letter-spacing: 6px;
            color: #a78bfa;
            font-family: monospace;
          }
          .footer {
            border-top: 1px solid #1f2937;
            padding-top: 24px;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #7c3aed, #4f46e5);
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo">TechQuiz AI</span>
          </div>
          <div>
            <p class="greeting">Hello ${username},</p>
            <p class="body-text">
              Thank you for registering with TechQuiz AI. To secure your account and verify your email address, please use the 6-digit verification code below. This code is valid for 10 minutes.
            </p>
            <div class="otp-container">
              <span class="otp-code">${otp}</span>
            </div>
            <p class="body-text" style="text-align: center; font-size: 13px; color: #6b7280;">
              If you did not request this code, please ignore this email or contact security support.
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} TechQuiz AI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  // If email configuration is missing or incomplete, log OTP to console for easy developer testing
  const hasMailSettings = process.env.EMAIL_USER && process.env.EMAIL_PASS;
  if (!hasMailSettings) {
    console.log('\n==================================================');
    console.log(`DEVELOPMENT MAIL LOG: OTP for ${username} (${to}) is: ${otp}`);
    console.log('==================================================\n');
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Mail delivery failed, logging OTP to console instead:', err);
    console.log('\n==================================================');
    console.log(`FALLBACK MAIL LOG: OTP for ${username} (${to}) is: ${otp}`);
    console.log('==================================================\n');
  }
};

/**
 * Sends a password reset link email.
 */
export const sendPasswordResetEmail = async (to: string, username: string, resetUrl: string): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"TechQuiz AI" <noreply@techquiz.com>',
    to,
    subject: 'Reset Your TechQuiz AI Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your TechQuiz AI Password</title>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px; }
          .header { text-align: center; border-bottom: 1px solid #1f2937; padding-bottom: 24px; margin-bottom: 24px; }
          .logo { font-size: 24px; font-weight: 800; background: linear-gradient(to right, #a78bfa, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-transform: uppercase; letter-spacing: 1px; }
          .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #f3f4f6; }
          .body-text { font-size: 15px; line-height: 1.6; color: #9ca3af; margin-bottom: 24px; }
          .button-wrap { text-align: center; margin: 28px 0; }
          .button { display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; }
          .notice { font-size: 12px; color: #6b7280; text-align: center; margin-top: 8px; }
          .footer { border-top: 1px solid #1f2937; padding-top: 24px; font-size: 12px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><span class="logo">TechQuiz AI</span></div>
          <div>
            <p class="greeting">Hello ${username},</p>
            <p class="body-text">
              We received a request to reset your password. Click the button below to set a new password.
              This link is valid for <strong style="color:#a78bfa">1 hour</strong>.
            </p>
            <div class="button-wrap">
              <a href="${resetUrl}" class="button">Reset My Password</a>
            </div>
            <p class="notice">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
          </div>
          <div class="footer"><p>&copy; ${new Date().getFullYear()} TechQuiz AI. All rights reserved.</p></div>
        </div>
      </body>
      </html>
    `,
  };

  const hasMailSettings = process.env.EMAIL_USER && process.env.EMAIL_PASS;
  if (!hasMailSettings) {
    console.log('\n==================================================');
    console.log(`DEVELOPMENT MAIL LOG: Password reset URL for ${username} (${to}):`);
    console.log(resetUrl);
    console.log('==================================================\n');
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Password reset email failed, logging URL to console:', err);
    console.log('\n==================================================');
    console.log(`FALLBACK MAIL LOG: Password reset URL for ${username} (${to}):`);
    console.log(resetUrl);
    console.log('==================================================\n');
  }
};

