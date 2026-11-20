import { useState } from "react";

const EMPTY = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  dueDate: "",
  assignee: "",
};

// Formulaire de création / modification d'une tâche (US09, US10, US12)
export default function TaskModal({ task, members, isManager, saving, onClose, onSubmit }) {
  const [form, setForm] = useState(
    task
      ? {
          title: task.title,
          description: task.description || "",
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
          assignee: task.assignee?._id || "",
        }
      : EMPTY
  );

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const body = {
      title: form.title,
      description: form.description,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || null,
    };
    if (isManager) body.assignee = form.assignee || null;
    onSubmit(body);
  };

  const field = "w-full rounded border px-3 py-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-lg space-y-3 rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold">
          {task ? "Modifier la tâche" : "Nouvelle tâche"}
        </h3>

        <input required maxLength={120} placeholder="Titre" className={field}
          value={form.title} onChange={set("title")} />

        <textarea rows={3} placeholder="Description (optionnelle)" className={field}
          value={form.description} onChange={set("description")} />

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Priorité
            <select className={field} value={form.priority} onChange={set("priority")}>
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
            </select>
          </label>
          <label className="text-sm">
            Échéance
            <input type="date" className={field} value={form.dueDate} onChange={set("dueDate")} />
          </label>
          <label className="text-sm">
            Statut
            <select className={field} value={form.status} onChange={set("status")}>
              <option value="todo">À faire</option>
              <option value="in_progress">En cours</option>
              <option value="done">Terminé</option>
            </select>
          </label>
          {isManager && (
            <label className="text-sm">
              Attribuée à
              <select className={field} value={form.assignee} onChange={set("assignee")}>
                <option value="">Non attribuée</option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-2">
            Annuler
          </button>
          <button disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}