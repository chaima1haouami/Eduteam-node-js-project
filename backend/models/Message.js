import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },       // nom d'origine du fichier
    storedName: { type: String, required: true }, // nom sur le disque
    size: Number,
    mimeType: String,
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, trim: true, maxlength: 2000, default: "" },
    attachment: { type: attachmentSchema, default: undefined },
  },
  { timestamps: true }
);

// Un message doit avoir du texte et/ou un fichier
messageSchema.pre("validate", function (next) {
  if (!this.content && !this.attachment) {
    this.invalidate("content", "Message vide");
  }
  next();
});

messageSchema.index({ project: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);