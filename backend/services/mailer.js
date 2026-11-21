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
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const FROM = () => process.env.MAIL_FROM || '"Eduteam" <no-reply@eduteam.local>';

const box = (content) => `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border-radius:16px;background:#F7F6FF;color:#1B1464">
    ${content}
  </div>`;

async function deliver(message) {
  const { transporter, test } = await getTransporter();
  const info = await transporter.sendMail({ from: FROM(), ...message });
  if (test) {
    console.log("Email de démo, aperçu :", nodemailer.getTestMessageUrl(info));
  }
}

export async function sendLoginEmail(user) {
  const date = new Date().toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  });
  await deliver({
    to: user.email,
    subject: "Nouvelle connexion à votre compte Eduteam",
    text: `Bonjour ${user.nom},\n\nVous vous êtes connecté(e) à Eduteam le ${date}.\n\nSi ce n'était pas vous, changez votre mot de passe dès maintenant.`,
    html: box(`
      <h2 style="margin:0 0 12px">Bonjour ${escapeHtml(user.nom)},</h2>
      <p>Vous vous êtes connecté(e) à <strong>Eduteam</strong> le ${date}.</p>
      <p style="color:#475569">Si ce n'était pas vous, changez votre mot de passe dès maintenant.</p>`),
  });
}

const ROLE_LABELS = {
  etudiant: "Étudiant",
  encadrant: "Encadrant",
  admin: "Administrateur",
};

export async function sendRoleChangedEmail({ user, oldRole, newRole }) {
  const ancien = ROLE_LABELS[oldRole] || oldRole;
  const nouveau = ROLE_LABELS[newRole] || newRole;
  await deliver({
    to: user.email,
    subject: "Votre rôle sur Eduteam a changé",
    text: `Bonjour ${user.nom},\n\nVotre rôle est passé de « ${ancien} » à « ${nouveau} ».\n\nDéconnectez-vous puis reconnectez-vous pour voir le changement.\n\nCe message est automatique, merci de ne pas y répondre.\n\nL'équipe Eduteam`,
    html: box(`
      <h2 style="margin:0 0 12px">Bonjour ${escapeHtml(user.nom)},</h2>
      <p>Votre rôle sur <strong>Eduteam</strong> est passé de
        <strong>${ancien}</strong> à <strong>${nouveau}</strong>.</p>
      <p style="color:#475569">Déconnectez-vous puis reconnectez-vous pour voir le changement.</p>
      <p style="color:#94a3b8;font-size:12px">Ce message est automatique, merci de ne pas y répondre.</p>`),
  });
}

const PROJECT_ROLE_LABELS = {
  chef: "Chef de projet",
  membre: "Membre",
  encadrant: "Encadrant",
};

export async function sendProjectInviteEmail({ user, project, inviter, role }) {
  const roleLabel = PROJECT_ROLE_LABELS[role] || role || "Membre";
  const link = `${process.env.CLIENT_URL || "http://localhost:5173"}/projects/${project._id}`;
  const par = inviter?.nom ? ` par ${inviter.nom}` : "";

  await deliver({
    to: user.email,
    subject: `Vous avez été ajouté(e) au projet « ${project.titre} »`,
    text: `Bonjour ${user.nom},\n\nVous avez été ajouté(e)${par} au projet « ${project.titre} » avec le rôle « ${roleLabel} ».\n\nOuvrir le projet : ${link}\n\nCe message est automatique, merci de ne pas y répondre.\n\nL'équipe Eduteam`,
    html: box(`
      <h2 style="margin:0 0 12px">Bonjour ${escapeHtml(user.nom)},</h2>
      <p>Vous avez été ajouté(e)${escapeHtml(par)} au projet
        <strong>${escapeHtml(project.titre)}</strong> avec le rôle
        <strong>${roleLabel}</strong>.</p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#1B1464;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:bold">Ouvrir le projet</a>
      </p>
      <p style="color:#94a3b8;font-size:12px">Ce message est automatique, merci de ne pas y répondre.</p>`),
  });
}

const PRIORITY_LABELS = { low: "Basse", medium: "Moyenne", high: "Haute" };

export async function sendTaskCreatedEmail({ user, project, task, creator }) {
  const link = `${process.env.CLIENT_URL || "http://localhost:5173"}/projects/${project._id}`;
  const par = creator?.nom ? ` par ${creator.nom}` : "";
  const priorite = PRIORITY_LABELS[task.priority] || task.priority;
  const echeance = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("fr-FR")
    : "Aucune";

  await deliver({
    to: user.email,
    subject: `Nouvelle tâche dans « ${project.titre} » : ${task.title}`,
    text: `Bonjour ${user.nom},\n\nUne nouvelle tâche a été ajoutée${par} au projet « ${project.titre} ».\n\nTitre : ${task.title}\nPriorité : ${priorite}\nÉchéance : ${echeance}\n\nOuvrir le projet : ${link}\n\nCe message est automatique, merci de ne pas y répondre.\n\nL'équipe Eduteam`,
    html: box(`
      <h2 style="margin:0 0 12px">Bonjour ${escapeHtml(user.nom)},</h2>
      <p>Une nouvelle tâche a été ajoutée${escapeHtml(par)} au projet
        <strong>${escapeHtml(project.titre)}</strong>.</p>
      <div style="background:#fff;border-radius:12px;padding:12px 16px;margin:16px 0">
        <p style="margin:0 0 6px"><strong>${escapeHtml(task.title)}</strong></p>
        <p style="margin:0;color:#475569;font-size:14px">Priorité : ${escapeHtml(priorite)}<br>Échéance : ${escapeHtml(echeance)}</p>
      </div>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#1B1464;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:bold">Ouvrir le projet</a>
      </p>
      <p style="color:#94a3b8;font-size:12px">Ce message est automatique, merci de ne pas y répondre.</p>`),
  });
}