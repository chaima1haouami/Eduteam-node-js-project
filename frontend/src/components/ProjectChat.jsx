import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import { createSocket } from "../services/socket";

const formatTime = (d) =>
  new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const formatSize = (bytes = 0) =>
  bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} Mo`
    : `${Math.max(1, Math.round(bytes / 1024))} Ko`;

export default function ProjectChat({ projectId }) {
  const me = useSelector((state) => state.auth.user);
  const myId = me?._id || me?.id;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  // historique + connexion temps réel
  useEffect(() => {
    let active = true;
    api
      .get(`/projects/${projectId}/messages`)
      .then(({ data }) => active && setMessages(data))
      .catch(() => active && setError("Impossible de charger les messages"));

    const socket = createSocket();
    socketRef.current = socket;

    const join = () =>
      socket.emit("project:join", projectId, (res) => {
        if (res?.ok) { setConnected(true); setError(null); }
        else setError(res?.message || "Connexion au chat impossible");
      });

    socket.on("connect", join);
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (err) => setError(err.message));
    socket.on("message:new", (msg) => {
      if (msg.project !== projectId) return;
      setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
    });

    return () => {
      active = false;
      socket.emit("project:leave", projectId);
      socket.disconnect();
    };
  }, [projectId]);

  // défilement automatique vers le dernier message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    socketRef.current?.emit("message:send", { projectId, content }, (res) => {
      if (!res?.ok) setError(res?.message || "Envoi impossible");
    });
    setText("");
  };

  // Envoi d'un fichier : le texte saisi sert de légende
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Fichier trop gros (10 Mo maximum)");
      e.target.value = "";
      return;
    }
    const formData = new FormData();
    formData.append("content", text.trim());
    formData.append("file", file);

    setUploading(true);
    setError(null);
    try {
      await api.post(`/projects/${projectId}/messages/attachments`, formData);
      setText(""); // le message arrive ensuite via Socket.io
    } catch (err) {
      setError(err.response?.data?.message || "Échec de l'envoi du fichier");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const download = async (msg) => {
    try {
      const res = await api.get(`/projects/${projectId}/messages/${msg._id}/download`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = msg.attachment.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Échec du téléchargement");
    }
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="pd-title text-xl font-extrabold text-[#1B1464]">Discussion</h2>
        <span className={`flex items-center gap-2 text-xs font-medium ${connected ? "text-green-700" : "text-slate-500"}`}>
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-slate-400"}`} />
          {connected ? "En ligne" : "Connexion..."}
        </span>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mb-4 h-80 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="pt-24 text-center text-sm text-slate-500">Aucun message. Lancez la discussion !</p>
        )}
        {messages.map((m) => {
          const mine = m.sender?._id === myId;
          return (
            <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? "bg-[#1B1464] text-white" : "bg-white ring-1 ring-slate-200"}`}>
                {!mine && <p className="text-xs font-semibold text-[#5B3FE0]">{m.sender?.nom}</p>}

                {m.attachment && (
                  <button
                    type="button"
                    onClick={() => download(m)}
                    className={`my-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                      mine ? "bg-white/15 hover:bg-white/25" : "bg-[#F7F6FF] hover:bg-[#ECE9FF]"
                    }`}
                    title="Télécharger"
                  >
                    <span aria-hidden="true" className="text-xl">📎</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{m.attachment.name}</span>
                      <span className={`block text-xs ${mine ? "text-white/70" : "text-slate-500"}`}>
                        {formatSize(m.attachment.size)} · Télécharger
                      </span>
                    </span>
                  </button>
                )}

                {m.content && <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>}
                <p className={`mt-1 text-[10px] ${mine ? "text-white/60" : "text-slate-400"}`}>{formatTime(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-3">
        <input ref={fileRef} type="file" onChange={handleFile} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current.click()}
          disabled={!connected || uploading}
          aria-label="Joindre un fichier"
          title="Joindre un fichier (10 Mo max)"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg transition hover:bg-slate-50 disabled:opacity-60"
        >
          {uploading ? "…" : "📎"}
        </button>
        <label htmlFor="chat-input" className="sr-only">Votre message</label>
        <input
          id="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Écrire un message..."
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#5B3FE0] focus:ring-4 focus:ring-[#5B3FE0]/20"
        />
        <button
          disabled={!connected || !text.trim()}
          className="rounded-xl bg-[#1B1464] px-6 py-3 font-semibold text-white transition hover:bg-[#2a1f9a] disabled:opacity-60"
        >
          Envoyer
        </button>
      </form>
    </section>
  );
}