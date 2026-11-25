import Project from "../models/Project.js";
import ProjectMember from "../models/ProjectMember.js";
import { sendNewMessageEmail } from "./mailer.js";

// Envoie "Vous avez un nouveau message" à tous les autres membres du projet
export async function notifyMessageByEmail(projectId, msg) {
  const [project, members] = await Promise.all([
    Project.findById(projectId).select("titre"),
    ProjectMember.find({ project: projectId }).populate("user", "nom email"),
  ]);
  if (!project) return console.log("[MAIL] Projet introuvable");

  const senderId = String(msg.sender._id);
  const recipients = members
    .map((m) => m.user)
    .filter((u) => u?.email && String(u._id) !== senderId);

  console.log(
    `[MAIL] Membres du projet : ${members.length} | destinataires : ${
      recipients.map((u) => u.email).join(", ") || "AUCUN (personne d'autre dans le projet)"
    }`
  );

  for (const u of recipients) {
    try {
      await sendNewMessageEmail({ user: u, project, sender: msg.sender });
      console.log(`[MAIL] Envoyé à ${u.email}`);
    } catch (err) {
      console.error(`[MAIL] ECHEC pour ${u.email} :`, err.message);
    }
  }
}