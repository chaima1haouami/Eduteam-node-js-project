import nodemailer from "nodemailer";

let transporterPromise;

// Si SMTP_HOST / SMTP_USER / SMTP_PASS sont dans le .env, on envoie de vrais emails.
// Sinon, mode démo : compte de test Ethereal, aucun email n'est réellement livré
// et l'adresse d'aperçu s'affiche dans le terminal du backend.
function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

      if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
        return {
          test: false,
          transporter: nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT) || 587,
            secure: SMTP_PORT === "465",
            auth: { user: SMTP_USER, pass: SMTP_PASS },
          }),
        };
      }

      const account = await nodemailer.createTestAccount();
      return {
        test: true,
        transporter: nodemailer.createTransport({
          host: account.smtp.host,
          port: account.smtp.port,
          secure: account.smtp.secure,
          auth: { user: account.user, pass: account.pass },
        }),
      };
    })();
  }
  return transporterPromise;
}

const escapeHtml = (s = "") =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function sendLoginEmail(user) {
  const { transporter, test } = await getTransporter();
  const date = new Date().toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  });
  const nom = escapeHtml(user.nom);

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || '"Eduteam" <no-reply@eduteam.local>',
    to: user.email,
    subject: "Nouvelle connexion à votre compte Eduteam",
    text: `Bonjour ${user.nom},\n\nVous vous êtes connecté(e) à Eduteam le ${date}.\n\nSi ce n'était pas vous, changez votre mot de passe dès maintenant.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border-radius:16px;background:#F7F6FF;color:#1B1464">
        <h2 style="margin:0 0 12px">Bonjour ${nom},</h2>
        <p>Vous vous êtes connecté(e) à <strong>Eduteam</strong> le ${date}.</p>
        <p style="color:#475569">Si ce n'était pas vous, changez votre mot de passe dès maintenant.</p>
      </div>`,
  });

  if (test) {
    console.log("Email de démo, aperçu :", nodemailer.getTestMessageUrl(info));
  }
}