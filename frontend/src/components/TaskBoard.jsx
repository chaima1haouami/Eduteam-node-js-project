import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import api from "../services/api";
import TaskModal from "./TaskModal";

export default function TaskBoard({
  projectId,
  members = [],
  isManager = false,
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Glisser-déposer (US14)
  const [draggedId, setDraggedId] = useState(null);
  const [overColumn, setOverColumn] = useState(null);

  const queryClient = useQueryClient();

  // Récupération des tâches
  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () =>
      (await api.get(`/projects/${projectId}/tasks`)).data,
  });

  const tasks = Array.isArray(data)
    ? data
    : data?.tasks || [];

  // Progression du projet (US22)
  const total = tasks.length;
  const doneCount = tasks.filter((task) => task.status === "done").length;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });

  // Création et modification
  const saveTask = useMutation({
    mutationFn: (body) => {
      if (selectedTask) {
        return api.patch(
          `/projects/${projectId}/tasks/${selectedTask._id}`,
          body
        );
      }

      return api.post(`/projects/${projectId}/tasks`, body);
    },

    onSuccess: () => {
      refresh();
      setShowModal(false);
      setSelectedTask(null);
    },
  });

  // Changement de statut par glisser-déposer
  const moveTask = useMutation({
    mutationFn: ({ id, status }) =>
      api.patch(`/projects/${projectId}/tasks/${id}`, { status }),
    onSuccess: refresh,
  });

  // Suppression
  const deleteTask = useMutation({
    mutationFn: (id) => api.delete(`/projects/${projectId}/tasks/${id}`),
    onSuccess: refresh,
  });

  const columns = [
    { id: "todo", title: "À faire" },
    { id: "in_progress", title: "En cours" },
    { id: "done", title: "Terminées" },
  ];

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    const task = tasks.find((t) => t._id === id);

    setDraggedId(null);
    setOverColumn(null);

    if (task && task.status !== columnId) {
      moveTask.mutate({ id: task._id, status: columnId });
    }
  };

  if (isLoading) {
    return <p>Chargement des tâches...</p>;
  }

  if (error) {
    return (
      <p className="text-red-600">
        Impossible de charger les tâches.
      </p>
    );
  }

  return (
    <section className="bg-white p-5 rounded-lg shadow">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold text-indigo-900">
          Tableau des tâches
        </h2>

        <button
          onClick={() => {
            setSelectedTask(null);
            setShowModal(true);
          }}
          className="bg-indigo-900 text-white px-4 py-2 rounded hover:bg-indigo-800"
        >
          + Nouvelle tâche
        </button>
      </div>

      {/* Barre de progression */}
      <div className="mb-6">
        <div className="mb-1 flex justify-between text-sm text-slate-600">
          <span>Progression du projet</span>
          <span>
            {doneCount}/{total} terminée{doneCount > 1 ? "s" : ""} · {percent} %
          </span>
        </div>
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-indigo-900 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Colonnes Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => (
          <div
            key={column.id}
            onDragOver={(e) => {
              e.preventDefault();
              if (overColumn !== column.id) setOverColumn(column.id);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setOverColumn(null);
              }
            }}
            onDrop={(e) => handleDrop(e, column.id)}
            className={`rounded-lg p-4 min-h-48 transition-colors ${
              overColumn === column.id
                ? "bg-indigo-100 ring-2 ring-indigo-400"
                : "bg-slate-100"
            }`}
          >
            <h3 className="font-semibold text-slate-800 mb-4">
              {column.title} (
              {tasks.filter((task) => task.status === column.id).length})
            </h3>

            {tasks
              .filter((task) => task.status === column.id)
              .map((task) => (
                <div
                  key={task._id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", task._id);
                    e.dataTransfer.effectAllowed = "move";
                    setDraggedId(task._id);
                  }}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setOverColumn(null);
                  }}
                  className={`bg-white rounded-lg p-4 shadow-sm mb-3 cursor-grab active:cursor-grabbing ${
                    draggedId === task._id ? "opacity-40" : ""
                  }`}
                >
                  <h4 className="font-semibold text-indigo-900">
                    {task.title}
                  </h4>

                  <p className="text-sm text-slate-600 mt-1">
                    {task.description || "Aucune description"}
                  </p>

                  <p className="text-xs text-slate-500 mt-2">
                    Priorité : {task.priority}
                  </p>

                  {task.assignee && (
                    <p className="text-xs text-slate-500">
                      Attribuée à : {task.assignee.nom}
                    </p>
                  )}

                  {task.dueDate && (
                    <p className="text-xs text-slate-500">
                      Échéance :{" "}
                      {new Date(task.dueDate).toLocaleDateString("fr-FR")}
                    </p>
                  )}

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setShowModal(true);
                      }}
                      className="text-indigo-700 text-sm underline"
                    >
                      Modifier
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm("Supprimer cette tâche ?")) {
                          deleteTask.mutate(task._id);
                        }
                      }}
                      className="text-red-600 text-sm underline"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>

      {/* Modal de création / modification */}
      {showModal && (
        <TaskModal
          task={selectedTask}
          members={members}
          isManager={isManager}
          saving={saveTask.isPending}
          onClose={() => {
            setShowModal(false);
            setSelectedTask(null);
          }}
          onSubmit={(body) => saveTask.mutate(body)}
        />
      )}

      {saveTask.isError && (
        <p className="text-red-600 mt-3">
          {saveTask.error?.response?.data?.message ||
            "Erreur lors de l'enregistrement de la tâche."}
        </p>
      )}

      {moveTask.isError && (
        <p className="text-red-600 mt-3">
          {moveTask.error?.response?.data?.message ||
            "Impossible de déplacer la tâche."}
        </p>
      )}

      {deleteTask.isError && (
        <p className="text-red-600 mt-3">
          {deleteTask.error?.response?.data?.message ||
            "Erreur lors de la suppression."}
        </p>
      )}
    </section>
  );
}