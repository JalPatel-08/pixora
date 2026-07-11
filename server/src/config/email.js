import * as Brevo from '@getbrevo/brevo';

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const sendEmail = async ({ to, subject, html }) => {
  const email = new Brevo.SendSmtpEmail();
  email.sender = { name: 'Pixora', email: process.env.SMTP_USER };
  email.to = [{ email: to }];
  email.subject = subject;
  email.htmlContent = html;
  await apiInstance.sendTransacEmail(email);
};

export const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #833AB4, #FD1D1D, #F77737); padding: 40px 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Pixora ✨</h1>
      </div>
      <div style="padding: 30px;">
        <p style="color: #262626; font-size: 16px; line-height: 1.6;">Thanks for signing up! Please verify your email address to get started.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background: linear-gradient(135deg, #833AB4, #FD1D1D); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Verify Email</a>
        </div>
        <p style="color: #8e8e8e; font-size: 13px;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
      </div>
    </div>
  `;
  await sendEmail({ to: email, subject: 'Verify your Pixora account', html });
};

export const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #833AB4, #FD1D1D, #F77737); padding: 40px 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password</h1>
      </div>
      <div style="padding: 30px;">
        <p style="color: #262626; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click the button below to choose a new one.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #833AB4, #FD1D1D); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #8e8e8e; font-size: 13px;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    </div>
  `;
  await sendEmail({ to: email, subject: 'Reset your Pixora password', html });
};
