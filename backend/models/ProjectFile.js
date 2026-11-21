import mongoose from "mongoose";

const projectFileSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true },
    storedName: { type: String, required: true },
    size: Number,
    mimeType: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("ProjectFile", projectFileSchema);