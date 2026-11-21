import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Joi from "joi";
import Project from "../models/Project.js";
import ProjectMember from "../models/ProjectMember.js";
import ProjectFile from "../models/ProjectFile.js";
import User from "../models/User.js";
import { Task } from "../models/Task.js";
import { sendProjectInviteEmail } from "../services/mailer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "projects");

const projectSchema = Joi.object({
  titre: Joi.string().min(3).required(),
  description: Joi.string().allow(""),
  dateDebut: Joi.date(),
  dateFin: Joi.date(),
});

// US05 : créer un projet (le créateur devient chef de projet)
export const createProject = async (req, res) => {
  const { error, value } = projectSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const project = await Project.create({ ...value, createdBy: req.user.id });
  await ProjectMember.create({
    project: project._id,
    user: req.user.id,
    role: "chef",
  });

  res.status(201).json({ project });
};

// US19 : voir la liste de mes projets
export const getMyProjects = async (req, res) => {
  const memberships = await ProjectMember.find({ user: req.user.id }).populate(
    "project"
  );
  const projects = memberships
    .filter((m) => m.project)
    .map((m) => ({ ...m.project.toObject(), monRole: m.role }));
  res.json({ projects });
};

// US08 : consulter un projet avec ses membres
export const getProject = async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: "Projet introuvable" });

  const members = await ProjectMember.find({ project: project._id }).populate(
    "user",
    "nom email filiere photo role"
  );

  res.json({ project, monRole: req.membership.role, members });
};

// US20 : modifier / archiver un projet (chef)
export const updateProject = async (req, res) => {
  const schema = Joi.object({
    titre: Joi.string().min(3),
    description: Joi.string().allow(""),
    dateDebut: Joi.date(),
    dateFin: Joi.date(),
    statut: Joi.string().valid("actif", "archive"),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const project = await Project.findByIdAndUpdate(req.params.projectId, value, {
    new: true,
  });
  if (!project) return res.status(404).json({ message: "Projet introuvable" });
  res.json({ project });
};

// US20 : supprimer un projet et ses données associées
export const deleteProject = async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: "Projet introuvable" });
  }

  // Supprimer les fichiers stockés sur le disque
  const files = await ProjectFile.find({ project: projectId });
  files.forEach((f) => {
    fs.unlink(path.join(UPLOAD_DIR, f.storedName), () => {});
  });

  await Promise.all([
    Task.deleteMany({ project: projectId }),
    ProjectMember.deleteMany({ project: projectId }),
    ProjectFile.deleteMany({ project: projectId }),
  ]);

  await project.deleteOne();

  res.json({ message: "Projet supprimé avec succès" });
};

// US07 : inviter un membre par email (chef)
export const addMember = async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    role: Joi.string().valid("membre", "encadrant"),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const user = await User.findOne({ email: value.email });
  if (!user) {
    return res.status(404).json({ message: "Aucun compte avec cet email" });
  }

  const already = await ProjectMember.findOne({
    project: req.params.projectId,
    user: user._id,
  });
  if (already) {
    return res.status(409).json({ message: "Déjà membre de ce projet" });
  }

  const role = value.role || (user.role === "encadrant" ? "encadrant" : "membre");

  const member = await ProjectMember.create({
    project: req.params.projectId,
    user: user._id,
    role,
  });

  // Email au nouveau membre : en arrière-plan, un échec n'annule pas l'ajout
  try {
    const [project, inviter] = await Promise.all([
      Project.findById(req.params.projectId).select("titre"),
      User.findById(req.user.id).select("nom"),
    ]);
    if (project) {
      sendProjectInviteEmail({ user, project, inviter, role }).catch((err) =>
        console.error("Email d'invitation non envoyé :", err.message)
      );
    }
  } catch (err) {
    console.error("Email d'invitation non envoyé :", err.message);
  }

  res.status(201).json({ member });
};

// US18 : changer le rôle d'un membre (chef)
export const updateMemberRole = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) {
    return res.status(400).json({ message: "Identifiant invalide" });
  }

  const schema = Joi.object({
    role: Joi.string().valid("chef", "membre", "encadrant").required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const member = await ProjectMember.findOneAndUpdate(
    { project: req.params.projectId, user: req.params.userId },
    { role: value.role },
    { new: true }
  );
  if (!member) return res.status(404).json({ message: "Membre introuvable" });
  res.json({ member });
};

// Retirer un membre (chef)
export const removeMember = async (req, res) => {
  const { projectId, userId } = req.params;
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: "Identifiant invalide" });
  }

  const member = await ProjectMember.findOne({ project: projectId, user: userId });
  if (!member) return res.status(404).json({ message: "Membre introuvable" });

  if (member.role === "chef") {
    const chefs = await ProjectMember.countDocuments({
      project: projectId,
      role: "chef",
    });
    if (chefs <= 1) {
      return res
        .status(400)
        .json({ message: "Impossible de retirer le dernier chef de projet" });
    }
  }

  await member.deleteOne();
  res.json({ message: "Membre retiré" });
};