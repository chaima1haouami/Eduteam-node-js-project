import { useEffect, useState } from "react";
import api from "../services/api";

const formatDate = (d) =>
  new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function SupervisorComments({ projectId, canComment = false, myId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");
  const base = `/projects/${projectId}`;

  const load = async () => {
    try {
      const { data } = await api.get(`${base}/comments`);
      setComments(data.comments || []);
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger les commentaires");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const submit = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setError("");
    try {
      const { data } = await api.post(`${base}/comments`, { content });
      setComments((prev) => [data.comment, ...prev]);
      setText("");
    } catch (err) {
      setError(err.response?.data?.message || "Envoi impossible");
    } finally {
      setSending(false);
    }
  };

  const suggest = async () => {
    setSuggesting(true);
    setError("");
    try {
      const { data } = await api.post(`${base}/assistant/suggest-comment`);
      setText(data.suggestion); // l'encadrant relit et modifie avant d'envoyer
    } catch (err) {
      setError(err.response?.data?.message || "L'assistant IA est indisponible");
    } finally {
      setSuggesting(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm("Supprimer ce commentaire ?")) return;
    try {
      await api.delete(`${base}/comments/${c._id}`);
      setComments((prev) => prev.filter((x) => x._id !== c._id));
    } catch (err) {
      setError(err.response?.data?.message || "Suppression impossible");
    }
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-8">
      <h2 className="pd-title mb-4 text-xl font-extrabold text-[#1B1464]">Commentaires de l'encadrant</h2>

      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {canComment && (
        <form onSubmit={submit} className="mb-5 space-y-3">
          <label htmlFor="comment-input" className="sr-only">Votre commentaire</label>
          <textarea
            id="comment-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Écrire un commentaire de suivi pour l'équipe..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#5B3FE0] focus:ring-4 focus:ring-[#5B3FE0]/20"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={suggest}
              disabled={suggesting}
              className="rounded-xl border border-[#5B3FE0] px-4 py-2.5 text-sm font-semibold text-[#5B3FE0] transition hover:bg-[#F7F6FF] disabled:opacity-60"
            >
              {suggesting ? "Rédaction en cours..." : "✨ Suggérer avec l'IA"}
            </button>
            <button
              disabled={sending || !text.trim()}
              className="rounded-xl bg-[#1B1464] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a1f9a] disabled:opacity-60"
            >
              {sending ? "Envoi..." : "Publier le commentaire"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Chargement...</p>
      ) : comments.length === 0 ? (
        <p className="rounded-xl bg-[#F7F6FF] px-4 py-6 text-center text-sm text-slate-600">
          Aucun commentaire de l'encadrant pour le moment.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c._id} className="rounded-2xl bg-[#F7F6FF] p-4">
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#1B1464]">
                  {c.author?.nom} <span className="font-normal text-slate-500">· {formatDate(c.createdAt)}</span>
                </p>
                {String(c.author?._id) === String(myId) && (
                  <button
                    onClick={() => remove(c)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Supprimer
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{c.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}