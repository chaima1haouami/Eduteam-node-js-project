import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import Project from "../models/Project.js";
import ProjectMember from "../models/ProjectMember.js";
import User from "../models/User.js";
import { getUserId, displayName } from "../middleware/taskAccess.js";
import { createTaskSchema, updateTaskSchema } from "../validators/taskValidator.js";
import {
  sendTaskCreatedEmail,
  sendTaskAssignedEmail,
} from "../services/mailer.js";

// champs possibles du nom, selon votre modèle User
const USER_FIELDS = "name nom prenom username email";

// Tâche -> objet JSON avec assignee { _id, name, nom, email }
function serialize(task) {
  const obj = task.toObject();
  if (obj.assignee) {
    const name = displayName(obj.assignee);
    obj.assignee = {
      _id: obj.assignee._id,
      name,
      nom: name,
      email: obj.assignee.email,
    };
  }
  return obj;
}

async function assigneeIsMember(projectId, assigneeId) {
  if (!assigneeId) return true;
  return !!(await ProjectMember.exists({ project: projectId, user: assigneeId }));
}

// Email à la création : l'assigné, ou à défaut tous les membres, sauf le créateur
async function notifyNewTask(task, creatorId, projectId) {
  const [project, creator] = await Promise.all([
    Project.findById(projectId).select("titre"),
    User.findById(creatorId).select("nom"),
  ]);
  if (!project) return;

  let recipients;
  if (task.assignee) {
    const assigneeId = task.assignee._id || task.assignee;
    recipients = [await User.findById(assigneeId).select("nom email")];
  } else {
    const members = await ProjectMember.find({ project: projectId }).populate(
      "user",
      "nom email"
    );
    recipients = members.map((m) => m.user);
  }

  recipients
    .filter((u) => u && String(u._id) !== String(creatorId))
    .forEach((u) =>
      sendTaskCreatedEmail({ user: u, project, task, creator }).catch((err) =>
        console.error("Email de tâche non envoyé :", err.message)
      )
    );
}

// Email quand une tâche existante est attribuée à quelqu'un
async function notifyAssigned(task, assigneeId, actorId, projectId) {
  if (!assigneeId || String(assigneeId) === String(actorId)) return;
  const [project, actor, user] = await Promise.all([
    Project.findById(projectId).select("titre"),
    User.findById(actorId).select("nom"),
    User.findById(assigneeId).select("nom email"),
  ]);
  if (!project || !user) return;
  await sendTaskAssignedEmail({ user, project, task, assigner: actor });
}

// Infos pour l'interface : rôle de l'utilisateur + membres assignables
export async function getMeta(req, res) {
  const members = await ProjectMember.find({ project: req.params.projectId }).populate(
    "user",
    USER_FIELDS
  );
  res.json({
    isManager: req.isManager,
    role: req.membership.role,
    members: members
      .filter((m) => m.user)
      .map((m) => ({
        _id: m.user._id,
        name: displayName(m.user),
        email: m.user.email,
        role: m.role,
      })),
  });
}

// US09, US10, US12
export async function createTask(req, res) {
  const { error, value } = createTaskSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  if (value.assignee && !req.isManager) {
    return res
      .status(403)
      .json({ message: "Seuls les responsables peuvent attribuer une tâche" });
  }
  if (!(await assigneeIsMember(req.params.projectId, value.assignee))) {
    return res.status(400).json({ message: "La personne assignée n'est pas membre du projet" });
  }

  const task = await Task.create({
    ...value,
    project: req.params.projectId,
    createdBy: getUserId(req),
  });

  // Sans await : un échec d'envoi n'empêche pas la création
  notifyNewTask(task, getUserId(req), req.params.projectId).catch((err) =>
    console.error("Notification de tâche échouée :", err.message)
  );

  await task.populate("assignee", USER_FIELDS);
  res.status(201).json(serialize(task));
}

// US13 : liste pour le Kanban (filtres optionnels ?status= & ?assignee=)
export async function listTasks(req, res) {
  const filter = { project: req.params.projectId };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignee) filter.assignee = req.query.assignee;

  const tasks = await Task.find(filter)
    .populate("assignee", USER_FIELDS)
    .sort({ createdAt: -1 });
  res.json(tasks.map(serialize));
}

// US10, US11, US12
export async function updateTask(req, res) {
  const { projectId, taskId } = req.params;
  if (!mongoose.isValidObjectId(taskId)) {
    return res.status(400).json({ message: "Identifiant de tâche invalide" });
  }

  const { error, value } = updateTaskSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) return res.status(404).json({ message: "Tâche introuvable" });

  // US28 : un non-chef ne change que le statut de ses propres tâches
  if (!req.isManager) {
    const me = getUserId(req);
    const isMine = String(task.assignee) === me || String(task.createdBy) === me;
    const onlyStatus = Object.keys(value).every((k) => k === "status");
    if (!isMine || !onlyStatus) {
      return res.status(403).json({
        message: "Vous pouvez seulement changer le statut de vos propres tâches",
      });
    }
  }

  if (value.assignee !== undefined && !(await assigneeIsMember(projectId, value.assignee))) {
    return res.status(400).json({ message: "La personne assignée n'est pas membre du projet" });
  }

  const previousAssignee = task.assignee ? String(task.assignee) : null;

  Object.assign(task, value);
  await task.save();

  // Email seulement si l'assigné a réellement changé
  const newAssignee = task.assignee ? String(task.assignee) : null;
  if (newAssignee && newAssignee !== previousAssignee) {
    notifyAssigned(task, newAssignee, getUserId(req), projectId).catch((err) =>
      console.error("Email d'attribution non envoyé :", err.message)
    );
  }

  await task.populate("assignee", USER_FIELDS);
  res.json(serialize(task));
}

export async function deleteTask(req, res) {
  const { projectId, taskId } = req.params;
  if (!mongoose.isValidObjectId(taskId)) {
    return res.status(400).json({ message: "Identifiant de tâche invalide" });
  }
  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) return res.status(404).json({ message: "Tâche introuvable" });

  if (!req.isManager && String(task.createdBy) !== getUserId(req)) {
    return res.status(403).json({ message: "Suppression non autorisée" });
  }
  await task.deleteOne();
  res.json({ message: "Tâche supprimée" });
}