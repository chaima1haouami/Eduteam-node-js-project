import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { protect } from "../middleware/auth.js";
import { projectRole } from "../middleware/projectRole.js";
import Message from "../models/Message.js";
import { notifyMessageByEmail } from "../services/messageNotify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHAT_DIR = path.join(__dirname, "..", "uploads", "chat");
fs.mkdirSync(CHAT_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: CHAT_DIR,
    filename: (req, file, cb) =>
      cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
});

const router = Router({ mergeParams: true });
router.use(protect, projectRole());

// Historique : 50 derniers messages (ou plus anciens que ?before=<ISO date>)
router.get("/", async (req, res) => {
  const filter = { project: req.params.projectId };
  if (req.query.before) filter.createdAt = { $lt: new Date(req.query.before) };

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("sender", "nom email");

  res.json(messages.reverse());
});

// Envoi d'un fichier dans la conversation (+ texte optionnel dans le champ "content")
router.post(
  "/attachments",
  (req, res, next) =>
    upload.single("file")(req, res, (err) => {
      if (err?.code === "LIMIT_FILE_SIZE")
        return res.status(400).json({ message: "Fichier trop gros (10 Mo maximum)" });
      if (err) return res.status(400).json({ message: "Envoi impossible" });
      next();
    }),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Aucun fichier reçu" });
    try {
      const { projectId } = req.params;
      const content = String(req.body.content || "").trim().slice(0, 2000);

      // multer lit les noms en latin1 : on rétablit les accents
      const name = Buffer.from(req.file.originalname, "latin1").toString("utf8");

      const msg = await Message.create({
        project: projectId,
        sender: req.user.id,
        content,
        attachment: {
          name,
          storedName: req.file.filename,
          size: req.file.size,
          mimeType: req.file.mimetype,
        },
      });
      await msg.populate("sender", "nom email");

      // temps réel : même événement que pour un message texte
      req.app.get("io")?.to(`project:${projectId}`).emit("message:new", msg.toObject());

      notifyMessageByEmail(projectId, msg).catch((err) =>
        console.error("[MAIL] Erreur :", err.message)
      );

      res.status(201).json(msg);
    } catch (err) {
      fs.unlink(req.file.path, () => {});
      res.status(500).json({ message: err.message });
    }
  }
);

// Téléchargement d'un fichier de la conversation (membres du projet uniquement)
router.get("/:messageId/download", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.messageId))
    return res.status(400).json({ message: "Message invalide" });

  const msg = await Message.findOne({ _id: req.params.messageId, project: req.params.projectId });
  if (!msg?.attachment) return res.status(404).json({ message: "Fichier introuvable" });

  res.download(path.join(CHAT_DIR, msg.attachment.storedName), msg.attachment.name);
});

export default router;