
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

  // Création et modification
  const saveTask = useMutation({
    mutationFn: (body) => {
      if (selectedTask) {
        return api.put(`/tasks/${selectedTask._id}`, body);
      }

      return api.post(`/projects/${projectId}/tasks`, body);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", projectId],
      });

      setShowModal(false);
      setSelectedTask(null);
    },
  });

  // Suppression
  const deleteTask = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", projectId],
      });
    },
  });

  const columns = [
    { id: "todo", title: "À faire" },
    { id: "in_progress", title: "En cours" },
    { id: "done", title: "Terminées" },
  ];

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

      {/* Colonnes Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {columns.map((column) => (
          <div
            key={column.id}
            className="bg-slate-100 rounded-lg p-4 min-h-48"
          >
            <h3 className="font-semibold text-slate-800 mb-4">
              {column.title} (
              {tasks.filter(
                (task) => task.status === column.id
              ).length}
              )
            </h3>

            {tasks
              .filter((task) => task.status === column.id)
              .map((task) => (
                <div
                  key={task._id}
                  className="bg-white rounded-lg p-4 shadow-sm mb-3"
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
          Erreur lors de l'enregistrement de la tâche.
        </p>
      )}

      {deleteTask.isError && (
        <p className="text-red-600 mt-3">
          Erreur lors de la suppression.
        </p>
      )}

    </section>
  );
}
