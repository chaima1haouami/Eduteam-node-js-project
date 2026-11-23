import { Router } from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/auth.js";
import { projectRole } from "../middleware/projectRole.js";
import Comment from "../models/Comment.js";

const router = Router({ mergeParams: true });
router.use(protect, projectRole()); // tout membre du projet peut lire

// Seuls l'encadrant du projet (ou un admin) peuvent commenter
export const canComment = (req) =>
  req.membership.role === "encadrant" || req.user.role === "admin";

router.get("/", async (req, res) => {
  const comments = await Comment.find({ project: req.params.projectId })
    .sort({ createdAt: -1 })
    .populate("author", "nom");
  res.json({ comments });
});

router.post("/", async (req, res) => {
  if (!canComment(req))
    return res.status(403).json({ message: "Seul l'encadrant du projet peut commenter" });

  const content = String(req.body.content || "").trim();
  if (!content) return res.status(400).json({ message: "Le commentaire est vide" });
  if (content.length > 2000)
    return res.status(400).json({ message: "Commentaire trop long (2000 caractères max)" });

  const comment = await Comment.create({
    project: req.params.projectId,
    author: req.user.id,
    content,
  });
  await comment.populate("author", "nom");
  res.status(201).json({ comment });
});

router.delete("/:commentId", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.commentId))
    return res.status(400).json({ message: "Commentaire invalide" });

  const comment = await Comment.findOne({
    _id: req.params.commentId,
    project: req.params.projectId,
  });
  if (!comment) return res.status(404).json({ message: "Commentaire introuvable" });

  const isAuthor = String(comment.author) === String(req.user.id);
  if (!isAuthor && req.user.role !== "admin")
    return res.status(403).json({ message: "Seul l'auteur peut supprimer son commentaire" });

  await comment.deleteOne();
  res.json({ message: "Commentaire supprimé" });
});

export default router;