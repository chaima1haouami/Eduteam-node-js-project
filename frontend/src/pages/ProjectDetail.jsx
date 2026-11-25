import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import TaskBoard from "../components/TaskBoard";
import ProjectCalendar from "../components/ProjectCalendar";
import ProjectFiles from "./ProjectFiles";
import ProjectChat from "../components/ProjectChat";
import SupervisorComments from "../components/SupervisorComments";
import AiAssistant from "../components/AiAssistant";

const roleLabel = { chef: "Chef de projet", membre: "Membre", encadrant: "Encadrant" };
const AVATAR_COLORS = ["#FFD23F", "#7DD3FC", "#F9A8D4", "#86EFAC", "#C4B5FD"];

const initials = (nom = "") =>
  nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

const formatDate = (d) => new Date(d).toLocaleDateString("fr-FR");

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useSelector((state) => state.auth.user);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null); // { type: "ok" | "err", text }

  const { data, isLoading, error } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => (await api.get(`/projects/${projectId}`)).data,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  const errText = (err) => err.response?.data?.message || "Erreur";

  const invite = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/members`, { email }),
    onSuccess: () => {
      setEmail("");
      setMessage({ type: "ok", text: "Membre ajouté" });
      refresh();
    },
    onError: (err) => setMessage({ type: "err", text: errText(err) }),
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }) => api.put(`/projects/${projectId}/members/${userId}`, { role }),
    onSuccess: () => { setMessage(null); refresh(); },
    onError: (err) => setMessage({ type: "err", text: errText(err) }),
  });

  const removeMember = useMutation({
    mutationFn: (userId) => api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: () => { setMessage(null); refresh(); },
    onError: (err) => setMessage({ type: "err", text: errText(err) }),
  });

  const archive = useMutation({
    mutationFn: (statut) => api.put(`/projects/${projectId}`, { statut }),
    onSuccess: () => { refresh(); queryClient.invalidateQueries({ queryKey: ["projects"] }); },
  });

  const deleteProject = useMutation({
    mutationFn: () => api.delete(`/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate("/projects");
    },
  });

  if (isLoading)
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-40 animate-pulse rounded-3xl bg-[#1B1464]/10" />
        <div className="h-56 animate-pulse rounded-3xl bg-slate-200/70" />
      </div>
    );

  if (error)
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p role="alert" className="mb-3 text-red-700">{errText(error)}</p>
        <Link to="/projects" className="font-semibold text-[#5B3FE0] underline-offset-4 hover:underline">
          Retour aux projets
        </Link>
      </div>
    );

  const { project, monRole, members } = data;
  const isChef = monRole === "chef";
  const actif = project.statut === "actif";
  const myId = me?._id || me?.id;

  return (
    <div className="pd-root space-y-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&display=swap');
        .pd-root { font-family: 'DM Sans', system-ui, sans-serif; }
        .pd-title { font-family: 'Bricolage Grotesque', system-ui, sans-serif; }
      `}</style>

      <Link
        to="/projects"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[#5B3FE0] underline-offset-4 hover:underline"
      >
        <span aria-hidden="true">←</span> Mes projets
      </Link>

      {/* En-tête du projet */}
      <section className="relative overflow-hidden rounded-3xl bg-[#1B1464] p-6 text-white sm:p-8">
        <div
          className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#5B3FE0] opacity-50 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  actif ? "bg-[#86EFAC] text-[#14532d]" : "bg-white/20 text-white"
                }`}
              >
                {actif ? "Actif" : "Archivé"}
              </span>
              <span className="rounded-full bg-[#FFD23F] px-3 py-1 text-xs font-semibold text-[#1B1464]">
                Votre rôle : {roleLabel[monRole]}
              </span>
            </div>
            <h1 className="pd-title text-3xl font-extrabold leading-tight sm:text-4xl">
              {project.titre}
            </h1>
            <p className="mt-2 max-w-2xl text-white/75">
              {project.description || "Pas de description"}
            </p>
            {(project.dateDebut || project.dateFin) && (
              <p className="mt-4 text-sm text-white/60">
                {project.dateDebut && formatDate(project.dateDebut)}
                {project.dateFin && ` jusqu'au ${formatDate(project.dateFin)}`}
              </p>
            )}
          </div>

          {isChef && (
            <div className="flex gap-2">
              <button
                onClick={() => archive.mutate(actif ? "archive" : "actif")}
                disabled={archive.isPending}
                className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#FFD23F] disabled:opacity-60"
              >
                {actif ? "Archiver" : "Réactiver"}
              </button>
              <button
                onClick={() =>
                  window.confirm("Supprimer définitivement ce projet ?") && deleteProject.mutate()
                }
                className="rounded-xl border border-red-300/60 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 focus-visible:outline-2 focus-visible:outline-red-300"
              >
                Supprimer
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Membres */}
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-8">
        <h2 className="pd-title mb-4 text-xl font-extrabold text-[#1B1464]">
          Équipe ({members.length})
        </h2>

        {message && (
          <p
            role={message.type === "err" ? "alert" : "status"}
            className={`mb-4 rounded-xl px-4 py-3 text-sm ${
              message.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </p>
        )}

        <ul className="divide-y divide-slate-100">
          {members.map((m, i) => (
            <li key={m._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[#1B1464]"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  aria-hidden="true"
                >
                  {initials(m.user.nom)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {m.user.nom}{" "}
                    {m.user._id === myId && (
                      <span className="text-xs font-medium text-[#5B3FE0]">(vous)</span>
                    )}
                  </p>
                  <p className="truncate text-sm text-slate-500">{m.user.email}</p>
                </div>
              </div>

              {isChef ? (
                <div className="flex items-center gap-3">
                  <select
                    value={m.role}
                    aria-label={`Rôle de ${m.user.nom}`}
                    onChange={(e) => changeRole.mutate({ userId: m.user._id, role: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#5B3FE0] focus:ring-4 focus:ring-[#5B3FE0]/20"
                  >
                    <option value="chef">Chef de projet</option>
                    <option value="membre">Membre</option>
                    <option value="encadrant">Encadrant</option>
                  </select>
                  <button
                    onClick={() =>
                      window.confirm(`Retirer ${m.user.nom} ?`) && removeMember.mutate(m.user._id)
                    }
                    className="rounded-md px-2 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-500"
                  >
                    Retirer
                  </button>
                </div>
              ) : (
                <span className="rounded-full bg-[#5B3FE0]/10 px-3 py-1 text-sm font-medium text-[#3b24b0]">
                  {roleLabel[m.role]}
                </span>
              )}
            </li>
          ))}
        </ul>

        {isChef && (
          <form
            onSubmit={(e) => { e.preventDefault(); setMessage(null); invite.mutate(); }}
            className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row"
          >
            <label htmlFor="invite-email" className="sr-only">Email de l'étudiant à inviter</label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email de l'étudiant à inviter"
              required
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#5B3FE0] focus:ring-4 focus:ring-[#5B3FE0]/20"
            />
            <button
              disabled={invite.isPending}
              className="rounded-xl bg-[#1B1464] px-6 py-3 font-semibold text-white transition hover:bg-[#2a1f9a] disabled:opacity-60"
            >
              {invite.isPending ? "Invitation..." : "Inviter"}
            </button>
          </form>
        )}
      </section>

      <ProjectChat projectId={projectId} />

      <TaskBoard projectId={projectId} members={members} isManager={isChef} />

      <ProjectCalendar projectId={projectId} members={members} isManager={isChef} />

      <ProjectFiles projectId={projectId} isManager={isChef} />

      <SupervisorComments
        projectId={projectId}
        canComment={monRole === "encadrant" || me?.role === "admin"}
        myId={myId}
      />

      <AiAssistant projectId={projectId} />
    </div>
  );
}