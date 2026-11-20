import User from "../models/User.js";

export const listUsers = async (req, res) => {
  res.json(await User.find().select("-password").sort({ createdAt: -1 }));
};

export const changeRole = async (req, res) => {
  const { role } = req.body;
  if (!["etudiant", "encadrant", "admin"].includes(role))
    return res.status(400).json({ message: "Rôle invalide" });
  if (req.params.id === String(req.user.id))
    return res.status(400).json({ message: "Tu ne peux pas changer ton propre rôle" });

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
  if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
  res.json(user);
};