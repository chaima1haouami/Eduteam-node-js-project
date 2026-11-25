import { useEffect, useRef, useState } from "react";
import api from "../services/api";

const SUGGESTIONS = [
  "Où en est le projet ?",
  "Quelles tâches sont en retard ?",
  "Qui a le plus contribué ?",
  "Que faut-il faire en priorité ?",
];

export default function AiAssistant({ projectId }) {
  const [messages, setMessages] = useState([]); // { role: "user" | "assistant", content }
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const ask = async (q) => {
    const content = q.trim();
    if (!content || loading) return;
    const history = messages.slice(-6);
    setMessages((prev) => [...prev, { role: "user", content }]);
    setQuestion("");
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/assistant/ask`, { question: content, history });
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(err.response?.data?.message || "L'assistant IA est indisponible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-8">
      <div className="mb-4 flex items-center gap-2">
        <span aria-hidden="true" className="text-xl">✨</span>
        <h2 className="pd-title text-xl font-extrabold text-[#1B1464]">Assistant IA</h2>
      </div>
      <p className="mb-4 text-sm text-slate-600">
        Posez une question sur l'avancement, les tâches ou la contribution de l'équipe.
      </p>

      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mb-4 max-h-96 min-h-40 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="rounded-full border border-[#5B3FE0]/30 bg-white px-3 py-1.5 text-sm text-[#5B3FE0] transition hover:bg-[#F7F6FF]"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${
                m.role === "user" ? "bg-[#1B1464] text-white" : "bg-white text-slate-800 ring-1 ring-slate-200"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <p className="text-sm text-slate-500">L'assistant réfléchit...</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex gap-3"
      >
        <label htmlFor="ai-input" className="sr-only">Votre question</label>
        <input
          id="ai-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          placeholder="Posez votre question..."
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#5B3FE0] focus:ring-4 focus:ring-[#5B3FE0]/20"
        />
        <button
          disabled={loading || !question.trim()}
          className="rounded-xl bg-[#1B1464] px-6 py-3 font-semibold text-white transition hover:bg-[#2a1f9a] disabled:opacity-60"
        >
          Demander
        </button>
      </form>
    </section>
  );
}