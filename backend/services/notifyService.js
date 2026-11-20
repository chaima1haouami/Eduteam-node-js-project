import nodemailer from "nodemailer";
import Project from "../models/Project.js";
import ProjectMember from "../models/ProjectMember.js";

let transporter;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false, // port 587
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

export const notifyProjectMembers = async (
  projectId,
  { subject, message, excludeUserId }
) => {
  try {
    const project = await Project.findById(projectId);
    const members = await ProjectMember.find({ project: projectId }).populate(
      "user",
      "email name"
    );

    const recipients = members
      .map((m) => m.user)
      .filter((u) => u?.email && String(u._id) !== String(excludeUserId));

    if (recipients.length === 0) return;

    const projectName = project?.title || project?.name || "votre projet";

    await Promise.all(
      recipients.map((u) =>
        getTransporter().sendMail({
          from: process.env.MAIL_FROM,
          to: u.email,
          subject: `[Eduteam] ${subject}`,
          html: `
            <p>Bonjour ${u.name || ""},</p>
            <p>${message}</p>
            <p><strong>Projet :</strong> ${projectName}</p>
            <p>L'équipe Eduteam</p>
          `,
        })
      )
    );
  } catch (err) {
    console.error("Erreur notification email :", err.message);
  }
};