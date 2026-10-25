import Mailgen from "mailgen";
import nodemailer from "nodemailer";

type MailContent = { body: Record<string, unknown> };
type SendEmailOptions = { email: string; subject: string; mailgenContent: MailContent };

const emailConfigured = () => Boolean(
  process.env.MAILTRAP_SMTP_HOST &&
  process.env.MAILTRAP_SMTP_PORT &&
  process.env.MAILTRAP_SMTP_USER &&
  process.env.MAILTRAP_SMTP_PASS,
);

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const generator = new Mailgen({
    theme: "default",
    product: { name: "ProjectFlow", link: process.env.FRONTEND_URL || "http://localhost:3000" },
  });
  const text = generator.generatePlaintext(options.mailgenContent as any);
  const html = generator.generate(options.mailgenContent as any);

  if (!emailConfigured()) {
    const message = "SMTP is not configured. Configure MAILTRAP_SMTP_HOST/PORT/USER/PASS to deliver account emails.";
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.warn(`⚠️ ${message}\nDevelopment email preview for ${options.email}:\n${text}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: Number(process.env.MAILTRAP_SMTP_PORT || 587),
    secure: Number(process.env.MAILTRAP_SMTP_PORT || 587) === 465,
    auth: { user: process.env.MAILTRAP_SMTP_USER, pass: process.env.MAILTRAP_SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || "ProjectFlow <no-reply@example.com>",
    to: options.email,
    subject: options.subject,
    text,
    html,
  });
};

export const emailVerificationMailgenContent = (username: string, verificationUrl: string): MailContent => ({
  body: {
    name: username,
    intro: "Welcome to ProjectFlow. Verify your email to finish setting up your account.",
    action: { instructions: "Click below to verify your email address.", button: { color: "#5142D8", text: "Verify email", link: verificationUrl } },
    outro: "If you did not create this account, you can ignore this email.",
  },
});

export const forgotPasswordMailgenContent = (username: string, passwordResetUrl: string): MailContent => ({
  body: {
    name: username,
    intro: "We received a request to reset your ProjectFlow password.",
    action: { instructions: "Use the secure link below to choose a new password.", button: { color: "#5142D8", text: "Reset password", link: passwordResetUrl } },
    outro: "If you did not request a reset, you can ignore this email.",
  },
});
