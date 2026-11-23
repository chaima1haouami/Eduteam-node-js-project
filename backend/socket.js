import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Message from "./models/Message.js";
import ProjectMember from "./models/ProjectMember.js";
import { notifyMessageByEmail } from "./services/messageNotify.js";

export const room = (projectId) => `project:${projectId}`;

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, methods: ["GET", "POST"] },
  });

  // Authentification par JWT (même token que l'API REST)
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Non authentifié"));
      socket.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role }
      next();
    } catch {
      next(new Error("Token invalide ou expiré"));
    }
  });

  io.on("connection", (socket) => {
    // Rejoindre la salle d'un projet (réservé aux membres)
    socket.on("project:join", async (projectId, ack) => {
      try {
        if (!mongoose.isValidObjectId(projectId)) throw new Error("Projet invalide");
        const member = await ProjectMember.exists({ project: projectId, user: socket.user.id });
        if (!member) throw new Error("Vous n'êtes pas membre de ce projet");
        socket.join(room(projectId));
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, message: err.message });
      }
    });

    socket.on("project:leave", (projectId) => socket.leave(room(projectId)));

    // Envoi d'un message texte
    socket.on("message:send", async ({ projectId, content } = {}, ack) => {
      try {
        const text = String(content || "").trim();
        if (!text) throw new Error("Message vide");
        if (text.length > 2000) throw new Error("Message trop long (2000 caractères max)");
        if (!mongoose.isValidObjectId(projectId)) throw new Error("Projet invalide");

        const member = await ProjectMember.exists({ project: projectId, user: socket.user.id });
        if (!member) throw new Error("Vous n'êtes pas membre de ce projet");

        const msg = await Message.create({
          project: projectId,
          sender: socket.user.id,
          content: text,
        });
        await msg.populate("sender", "nom email");

        // temps réel : tous les membres connectés à la salle (l'expéditeur inclus)
        io.to(room(projectId)).emit("message:new", msg.toObject());
        ack?.({ ok: true });

        // notification par email aux autres membres (sans bloquer la réponse)
        notifyMessageByEmail(projectId, msg).catch((err) =>
          console.error("[MAIL] Erreur :", err.message)
        );
      } catch (err) {
        ack?.({ ok: false, message: err.message });
      }
    });
  });

  return io;
}