
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    titre: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    statut: {
      type: String,
      enum: ["à faire", "en cours", "terminée"],
      default: "à faire",
    },
  },
  { timestamps: true }
);

export const Task = mongoose.model("Task", taskSchema);
