import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { protect } from "../middleware/auth.js";
import ProjectFile from "../models/ProjectFile.js";
import Membership from "../models/Membership.js"; // ADAPTE au nom réel de ton modèle de membres

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "projects");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) =>
      cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router({ mergeParams: true });
router.use(protect);

// Seuls les membres du projet passent
router.use(async (req, res, next) => {
  try {
    const membership = await Membership.findOne({
      project: req.params.projectId, // ADAPTE si le champ s'appelle autrement
      user: req.user.id,             // ADAPTE si le champ s'appelle autrement
    });
    if (!membership) return res.status(403).json({ message: "Accès refusé à ce projet" });
    req.membership = membership;
    next();
  } catch {
    res.status(400).json({ message: "Projet invalide" });
  }
});

router.get("/", async (req, res) => {
  const files = await ProjectFile.find({ project: req.params.projectId })
    .populate("uploadedBy", "nom")
    .sort({ createdAt: -1 });
  res.json({ files });
});

router.post(
  "/",
  (req, res, next) =>
    upload.single("file")(req, res, (err) => {
      if (err?.code === "LIMIT_FILE_SIZE")
        return res.status(400).json({ message: "Fichier trop gros (10 Mo maximum)" });
      if (err) return res.status(400).json({ message: "Envoi impossible" });
      next();
    }),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Aucun fichier reçu" });
    const doc = await ProjectFile.create({
      project: req.params.projectId,
      name: req.file.originalname,
      storedName: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user.id,
    });
    res.status(201).json(doc);
  }
);

router.get("/:fileId/download", async (req, res) => {
  const f = await ProjectFile.findOne({ _id: req.params.fileId, project: req.params.projectId });
  if (!f) return res.status(404).json({ message: "Fichier introuvable" });
  res.download(path.join(UPLOAD_DIR, f.storedName), f.name);
});

router.delete("/:fileId", async (req, res) => {
  const f = await ProjectFile.findOne({ _id: req.params.fileId, project: req.params.projectId });
  if (!f) return res.status(404).json({ message: "Fichier introuvable" });
  const isAuthor = String(f.uploadedBy) === String(req.user.id);
  if (!isAuthor && req.membership.role !== "chef")
    return res.status(403).json({ message: "Seul l'auteur ou le chef peut supprimer" });
  fs.unlink(path.join(UPLOAD_DIR, f.storedName), () => {});
  await f.deleteOne();
  res.json({ message: "Fichier supprimé" });
});

export default router;