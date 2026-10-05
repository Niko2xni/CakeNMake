const nodemailer = require('nodemailer');

function createAuthEmailDelivery({ env = process.env, fetchImpl = globalThis.fetch, createTransport = nodemailer.createTransport } = {}) {
  // Preserve existing SMTP installations unless Brevo is explicitly selected.
  const provider = (env.AUTH_EMAIL_PROVIDER || 'smtp').trim().toLowerCase();
  const from = (env.AUTH_EMAIL_FROM || '').trim();
  const senderName = (env.AUTH_EMAIL_FROM_NAME || 'CakeNMake').trim();
  const apiKey = (env.BREVO_API_KEY || '').trim();
  const configured = provider === 'brevo'
    ? Boolean(apiKey && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from))
    : provider === 'smtp' && Boolean(from && env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASSWORD);
  const transport = configured && provider === 'smtp' ? createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: env.SMTP_SECURE === 'true',
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  }) : null;

  return {
    configured,
    async send({ to, subject, text, html }) {
      if (!configured) throw new Error('Authentication email delivery is not configured.');
      if (transport) return transport.sendMail({ from, to, subject, text, html });
      const response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': apiKey },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          sender: { name: senderName, email: from },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      // Never expose provider response bodies, which can contain recipient details.
      if (!response.ok) throw new Error(`Brevo email delivery failed (HTTP ${response.status}).`);
      const result = await response.json();
      if (!result?.messageId) throw new Error('Brevo did not confirm email acceptance.');
      return { messageId: result.messageId };
    },
  };
}

module.exports = { createAuthEmailDelivery };
