import User from "../models/User.js";
import { sendRoleChangedEmail } from "../services/mailer.js";

export const listUsers = async (req, res) => {
  res.json(await User.find().select("-password").sort({ createdAt: -1 }));
};

export const changeRole = async (req, res) => {
  const { role } = req.body;
  if (!["etudiant", "encadrant", "admin"].includes(role))
    return res.status(400).json({ message: "Rôle invalide" });
  if (req.params.id === String(req.user.id))
    return res.status(400).json({ message: "Tu ne peux pas changer ton propre rôle" });

  const before = await User.findById(req.params.id).select("role");
  if (!before) return res.status(404).json({ message: "Utilisateur introuvable" });
  const oldRole = before.role;

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");

  if (oldRole !== role) {
    sendRoleChangedEmail({ user, oldRole, newRole: role }).catch((err) =>
      console.error("Email de changement de rôle non envoyé :", err.message)
    );
  }

  res.json(user);
};