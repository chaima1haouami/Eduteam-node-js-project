import { useEffect, useState } from "react";
import api from "../services/api"; // ADAPTE : ton instance axios (celle qui envoie le token)

const ROLES = [
  { value: "etudiant", label: "Étudiant" },
  { value: "encadrant", label: "Encadrant" },
  { value: "admin", label: "Admin" },
];

// ADAPTE : récupère l'utilisateur connecté depuis ton store ou ton contexte
const useCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
};

export default function AdminUsers() {
  const me = useCurrentUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    api
      .get("/users") // ADAPTE : "/api/users" si ton baseURL ne contient pas /api
      .then((r) => setUsers(r.data))
      .catch((e) => setError(e.response?.data?.message || "Chargement impossible"))
      .finally(() => setLoading(false));
  }, []);

  const changeRole = async (user, role) => {
    if (role === user.role) return;
    if (!window.confirm(`Passer ${user.nom} en « ${role} » ?`)) return;
    setSaving(user._id);
    setError("");
    try {
      const { data } = await api.patch(`/users/${user._id}/role`, { role });
      setUsers((list) => list.map((u) => (u._id === data._id ? data : u)));
    } catch (e) {
      setError(e.response?.data?.message || "Modification impossible");
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <p className="p-6">Chargement…</p>;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Gestion des utilisateurs</h1>
      {error && <p className="mb-3 text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3">Nom</th>
              <th className="p-3">Email</th>
              <th className="p-3">Filière</th>
              <th className="p-3">Rôle</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isMe = u._id === (me._id || me.id);
              return (
                <tr key={u._id} className="border-t">
                  <td className="p-3">{u.nom}{isMe && " (vous)"}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.filiere || "—"}</td>
                  <td className="p-3">
                    <select
                      className="rounded border p-1"
                      value={u.role}
                      disabled={isMe || saving === u._id}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}