import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";

const roleLabel = { chef: "Chef de projet", membre: "Membre", encadrant: "Encadrant" };
const ACCENTS = ["#FFD23F", "#7DD3FC", "#F9A8D4", "#86EFAC", "#C4B5FD"];
const FILTERS = [
  { id: "tous", label: "Tous" },
  { id: "actif", label: "Actifs" },
  { id: "archive", label: "Archivés" },
];
const EMPTY_FORM = { titre: "", description: "", dateDebut: "", dateFin: "" };
const DAY = 86400000;

const field =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#5B3FE0] focus:ring-4 focus:ring-[#5B3FE0]/20";

// Avancement du projet entre sa date de début et sa date de fin
function timing(p) {
  if (!p.dateFin) return null;
  const end = new Date(p.dateFin).getTime();
  const left = Math.ceil((end - Date.now()) / DAY);
  let pct = null;
  if (p.dateDebut) {
    const start = new Date(p.dateDebut).getTime();
    if (end > start) pct = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
  }
  const label =
    left > 1 ? `${left} jours restants` : left === 1 ? "1 jour restant" : left === 0 ? "Dernier jour" : "Échéance dépassée";
  return { label, pct, late: left < 0 };
}

export default function Projects() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("tous");
  const titreRef = useRef(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get("/projects")).data.projects,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post("/projects", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setForm(EMPTY_FORM);
      setError("");
      setOpen(false);
    },
    onError: (err) => setError(err.response?.data?.message || "Erreur"),
  });

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => titreRef.current?.focus(), 80);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    // on n'envoie pas les dates vides (Joi les refuserait)
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
    createMutation.mutate(payload);
  };

  const actifs = projects.filter((p) => p.statut !== "archive").length;
  const visibles = projects.filter((p) =>
    filter === "tous" ? true : filter === "archive" ? p.statut === "archive" : p.statut !== "archive"
  );

  return (
    <div className="pj-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&display=swap');
        .pj-root { font-family: 'DM Sans', system-ui, sans-serif; }
        .pj-title { font-family: 'Bricolage Grotesque', system-ui, sans-serif; }
        @media (prefers-reduced-motion: reduce) { .pj-root * { transition: none !important; } }
      `}</style>

      {/* En-tête */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="pj-title text-3xl font-extrabold text-[#1B1464] sm:text-4xl">Mes projets</h1>
          <p className="mt-1 text-slate-600">
            {isLoading
              ? "Chargement..."
              : `${projects.length} projet${projects.length > 1 ? "s" : ""}, dont ${actifs} actif${actifs > 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-[#FFD23F] px-5 py-3 font-semibold text-[#1B1464] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FFD23F]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1464]"
        >
          Nouveau projet
        </button>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex gap-2" role="tablist" aria-label="Filtrer les projets">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === f.id ? "bg-[#1B1464] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-[#1B1464]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-60 animate-pulse rounded-3xl bg-slate-200/70" />
          ))}
        </div>
      )}

      {!isLoading && visibles.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-[#5B3FE0]/30 bg-white/60 p-12 text-center">
          <p className="pj-title text-xl font-bold text-[#1B1464]">
            {projects.length === 0 ? "Aucun projet pour le moment" : "Aucun projet dans cette catégorie"}
          </p>
          {projects.length === 0 && (
            <>
              <p className="mx-auto mt-2 max-w-sm text-slate-600">
                Créez le premier pour répartir les tâches avec votre équipe.
              </p>
              <button
                onClick={() => setOpen(true)}
                className="mt-5 rounded-xl bg-[#1B1464] px-5 py-3 font-semibold text-white transition hover:bg-[#2a1f9a]"
              >
                Créer un projet
              </button>
            </>
          )}
        </div>
      )}

      {/* Grille de projets */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visibles.map((p, i) => {
          const archived = p.statut === "archive";
          const t = timing(p);
          return (
            <Link
              key={p._id}
              to={`/projects/${p._id}`}
              className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#1B1464]/10 focus-visible:outline-2 focus-visible:outline-[#5B3FE0]"
            >
              <div
                className="relative h-24 p-4"
                style={{ background: archived ? "#E2E8F0" : ACCENTS[i % ACCENTS.length] }}
              >
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#1B1464]">
                  {roleLabel[p.monRole]}
                </span>
                <span
                  className="pj-title absolute -bottom-4 right-4 text-8xl font-extrabold leading-none text-[#1B1464] opacity-15"
                  aria-hidden="true"
                >
                  {p.titre?.[0]?.toUpperCase()}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="pj-title text-xl font-bold text-[#1B1464] group-hover:text-[#5B3FE0]">
                    {p.titre}
                  </h2>
                  {archived && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      Archivé
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 flex-1 text-slate-600">
                  {p.description || "Pas de description"}
                </p>

                <div className="mt-5">
                  {t ? (
                    <>
                      {t.pct !== null && (
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${t.late ? "bg-red-500" : "bg-[#5B3FE0]"}`}
                            style={{ width: `${t.pct}%` }}
                          />
                        </div>
                      )}
                      <p className={`mt-2 text-sm font-medium ${t.late ? "text-red-600" : "text-slate-500"}`}>
                        {t.label}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">Pas d'échéance</p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Panneau de création */}
      <div className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}>
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-[#1B1464]/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          inert={!open}
          className={`absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl transition-transform duration-300 sm:p-8 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 id="drawer-title" className="pj-title text-2xl font-extrabold text-[#1B1464]">
              Nouveau projet
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#5B3FE0]"
            >
              Fermer
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div>
              <label htmlFor="titre" className="mb-1.5 block text-sm font-medium text-slate-700">
                Titre <span className="font-normal text-slate-500">(3 caractères minimum)</span>
              </label>
              <input ref={titreRef} id="titre" className={field} name="titre" value={form.titre} onChange={onChange} required />
            </div>

            <div>
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
                Description <span className="font-normal text-slate-500">(facultatif)</span>
              </label>
              <textarea id="description" className={field} name="description" rows={4} value={form.description} onChange={onChange} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="dateDebut" className="mb-1.5 block text-sm font-medium text-slate-700">Début</label>
                <input id="dateDebut" className={`${field} px-3`} type="date" name="dateDebut" value={form.dateDebut} onChange={onChange} />
              </div>
              <div>
                <label htmlFor="dateFin" className="mb-1.5 block text-sm font-medium text-slate-700">Fin</label>
                <input id="dateFin" className={`${field} px-3`} type="date" name="dateFin" value={form.dateFin} onChange={onChange} />
              </div>
            </div>

            <button
              disabled={createMutation.isPending}
              className="w-full rounded-xl bg-[#1B1464] px-4 py-3.5 font-semibold text-white transition hover:bg-[#2a1f9a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createMutation.isPending ? "Création en cours..." : "Créer le projet"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}