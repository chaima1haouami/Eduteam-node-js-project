import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// Crée une connexion authentifiée avec le token JWT
export const createSocket = () =>
  io(SOCKET_URL, { auth: { token: localStorage.getItem("token") } });
