import File from "../models/ProjectFile.js";
import cloudinary from "../config/cloudinary.js";
import { notifyProjectMembers } from "../services/notifyService.js";

const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: "auto" }, (err, result) =>
        err ? reject(err) : resolve(result)
      )
      .end(buffer);
  });

// US19
export const uploadFile = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!req.file) return res.status(400).json({ message: "Aucun fichier" });

    const result = await uploadToCloudinary(req.file.buffer, `eduteam/${projectId}`);

    const file = await File.create({
      project: projectId,
      uploadedBy: req.user._id,
      name: req.file.originalname,
      url: result.secure_url,
      publicId: result.public_id,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });

    await notifyProjectMembers(projectId, {
      subject: "Nouveau fichier déposé",
      message: `Le fichier <strong>${file.name}</strong> vient d'être ajouté.`,
      excludeUserId: req.user._id,
    });

    res.status(201).json({ file });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Liste
export const getFiles = async (req, res) => {
  const files = await File.find({ project: req.params.projectId })
    .populate("uploadedBy", "name")
    .sort({ createdAt: -1 });
  res.json({ files });
};

// US20 : renvoie l'URL de téléchargement
export const downloadFile = async (req, res) => {
  const file = await File.findOne({ _id: req.params.fileId, project: req.params.projectId });
  if (!file) return res.status(404).json({ message: "Fichier introuvable" });
  res.json({ url: file.url, name: file.name });
};
