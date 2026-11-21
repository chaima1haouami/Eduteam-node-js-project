import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import api from "../services/api";
import TaskModal from "./TaskModal";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const STATUS_STYLE = {
  todo: "bg-slate-200 text-slate-800",
  in_progress: "bg-amber-100 text-amber-800",
  done: "bg-emerald-100 text-emerald-800",
};

const STATUS_LABEL = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminée",
};

const pad = (n) => String(n).padStart(2, "0");
const dayKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function ProjectCalendar({
  projectId,
  members = [],
  isManager = false,
}) {
  const now = new Date();
  const todayKey = dayKey(now.getFullYear(), now.getMonth(), now.getDate());
  const queryClient = useQueryClient();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(todayKey);
  const [showModal, setShowModal] = useState(false);

  // Même clé que TaskBoard : le calendrier suit les changements du Kanban
  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () =>
      (await api.get(`/projects/${projectId}/tasks`)).data,
  });

  // Création d'une tâche depuis le calendrier
  const createTask = useMutation({
    mutationFn: (body) => api.post(`/projects/${projectId}/tasks`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      setShowModal(false);
    },
  });

  const tasks = Array.isArray(data) ? data : data?.tasks || [];

  // Regroupement des tâches par jour d'échéance
  const byDay = {};
  tasks.forEach((task) => {
    if (!task.dueDate) return;
    const key = String(task.dueDate).slice(0, 10);
    (byDay[key] = byDay[key] || []).push(task);
  });

  // Construction de la grille (semaine commençant le lundi)
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const goMonth = (delta) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const goToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelected(todayKey);
  };

  const isLate = (task) =>
    task.status !== "done" &&
    String(task.dueDate).slice(0, 10) < todayKey;

  const selectedTasks = byDay[selected] || [];
  const noDate = tasks.filter((t) => !t.dueDate).length;

  if (isLoading) return <p>Chargement du calendrier...</p>;

  if (error) {
    return (
      <p className="text-red-600">Impossible de charger le calendrier.</p>
    );
  }

  return (
    <section className="bg-white p-5 rounded-lg shadow mt-6">
      {/* En-tête */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-indigo-900">
          Calendrier du projet
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => goMonth(-1)}
            className="rounded border px-3 py-1 hover:bg-slate-50"
            aria-label="Mois précédent"
          >
            ‹
          </button>
          <span className="min-w-36 text-center font-semibold capitalize text-slate-800">
            {monthLabel}
          </span>
          <button
            onClick={() => goMonth(1)}
            className="rounded border px-3 py-1 hover:bg-slate-50"
            aria-label="Mois suivant"
          >
            ›
          </button>
          <button
            onClick={goToday}
            className="rounded bg-indigo-900 px-3 py-1 text-sm text-white hover:bg-indigo-800"
          >
            Aujourd'hui
          </button>
        </div>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 gap-1 mb-1 text-center text-xs font-semibold text-slate-500">
        {DAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Grille du mois */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="min-h-20 rounded bg-slate-50" />;
          }

          const key = dayKey(year, month, day);
          const dayTasks = byDay[key] || [];
          const isToday = key === todayKey;
          const isSelected = key === selected;

          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`min-h-20 rounded border p-1 text-left align-top transition-colors hover:bg-indigo-50 ${
                isSelected ? "border-indigo-600 ring-1 ring-indigo-600" : "border-slate-200"
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday ? "bg-indigo-900 font-bold text-white" : "text-slate-700"
                }`}
              >
                {day}
              </span>

              {dayTasks.slice(0, 2).map((task) => (
                <div
                  key={task._id}
                  className={`mt-1 truncate rounded px-1 text-[11px] ${
                    isLate(task)
                      ? "bg-red-100 text-red-800"
                      : STATUS_STYLE[task.status] || STATUS_STYLE.todo
                  }`}
                >
                  {task.title}
                </div>
              ))}

              {dayTasks.length > 2 && (
                <div className="mt-1 text-[11px] text-slate-500">
                  +{dayTasks.length - 2} autre{dayTasks.length - 2 > 1 ? "s" : ""}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Légende */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-slate-200" /> À faire</span>
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-amber-100" /> En cours</span>
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-emerald-100" /> Terminée</span>
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-red-100" /> En retard</span>
      </div>

      {/* Détail du jour sélectionné */}
      <div className="mt-5 rounded-lg bg-slate-50 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-800">
            {new Date(`${selected}T12:00:00`).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h3>

          <button
            onClick={() => setShowModal(true)}
            className="rounded bg-indigo-900 px-3 py-1 text-sm text-white hover:bg-indigo-800"
          >
            + Ajouter une tâche ce jour
          </button>
        </div>

        {selectedTasks.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune échéance ce jour-là.</p>
        ) : (
          <ul className="space-y-2">
            {selectedTasks.map((task) => (
              <li
                key={task._id}
                className="flex items-center justify-between rounded bg-white p-3 shadow-sm"
              >
                <div>
                  <p className="font-medium text-indigo-900">{task.title}</p>
                  <p className="text-xs text-slate-500">
                    {task.assignee?.nom
                      ? `Attribuée à : ${task.assignee.nom}`
                      : "Non attribuée"}
                  </p>
                </div>
                <span
                  className={`rounded px-2 py-1 text-xs ${
                    isLate(task)
                      ? "bg-red-100 text-red-800"
                      : STATUS_STYLE[task.status] || STATUS_STYLE.todo
                  }`}
                >
                  {isLate(task) ? "En retard" : STATUS_LABEL[task.status] || task.status}
                </span>
              </li>
            ))}
          </ul>
        )}

        {noDate > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            {noDate} tâche{noDate > 1 ? "s" : ""} sans échéance (non affichée{noDate > 1 ? "s" : ""} ici).
          </p>
        )}

        {createTask.isError && (
          <p className="mt-3 text-sm text-red-600">
            {createTask.error?.response?.data?.message ||
              "Erreur lors de la création de la tâche."}
          </p>
        )}
      </div>

      {/* Formulaire de création, échéance pré-remplie */}
      {showModal && (
        <TaskModal
          task={null}
          members={members}
          isManager={isManager}
          saving={createTask.isPending}
          defaultDueDate={selected}
          onClose={() => setShowModal(false)}
          onSubmit={(body) => createTask.mutate(body)}
        />
      )}
    </section>
  );
}