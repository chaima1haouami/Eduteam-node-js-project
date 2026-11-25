import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { projectRole } from "../middleware/projectRole.js";
import { askAssistant, suggestComment } from "../services/aiService.js";

const router = Router({ mergeParams: true });
router.use(protect, projectRole());

const fail = (res, err) =>
  res.status(err.status || 500).json({ message: err.message || "Erreur de l'assistant IA" });

// US31 : un membre pose une question sur son projet
router.post("/ask", async (req, res) => {
  const question = String(req.body.question || "").trim();
  if (!question) return res.status(400).json({ message: "Question vide" });
  if (question.length > 500)
    return res.status(400).json({ message: "Question trop longue (500 caractères max)" });

  try {
    const answer = await askAssistant(req.params.projectId, question, req.body.history);
    res.json({ answer });
  } catch (err) {
    fail(res, err);
  }
});

// US24 + IA : brouillon de commentaire pour l'encadrant
router.post("/suggest-comment", async (req, res) => {
  if (req.membership.role !== "encadrant" && req.user.role !== "admin")
    return res.status(403).json({ message: "Réservé à l'encadrant du projet" });

  try {
    const suggestion = await suggestComment(req.params.projectId);
    res.json({ suggestion });
  } catch (err) {
    fail(res, err);
  }
});

export default router;