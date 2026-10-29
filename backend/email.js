import nodemailer from 'nodemailer';

export async function sendAccountEmail({ to, subject, text, html }) {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  // Google shows App Passwords in groups separated by spaces; SMTP expects the contiguous 16 characters.
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, '');
  if (!host || !user || !pass) {
    const error = new Error('Email verification is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in backend/.env.');
    error.status = 503;
    throw error;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user, pass },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM?.trim() || user,
    to,
    subject,
    text,
    html,
  });
}
