import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";

const ROLES = [
  { value: "etudiant", label: "Étudiant" },
  { value: "encadrant", label: "Encadrant" },
  { value: "admin", label: "Admin" },
];

const BADGE = {
  admin: "bg-[#1B1464] text-white",
  encadrant: "bg-[#FFD23F] text-[#1B1464]",
  etudiant: "bg-[#5B3FE0]/10 text-[#5B3FE0]",
};

const initials = (nom = "") =>
  nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

export default function AdminUsers() {
  const me = useSelector((state) => state.auth.user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    api
      .get("/users")
      .then((r) => setUsers(r.data))
      .catch((e) =>
        setError(e.response?.data?.message || "Chargement impossible")
      )
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

  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&display=swap');
        .admin-root { font-family: 'DM Sans', system-ui, sans-serif; }
        .admin-title { font-family: 'Bricolage Grotesque', system-ui, sans-serif; }
      `}</style>

      <div className="admin-root">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="admin-title text-3xl font-extrabold text-[#1B1464]">
              Gestion des utilisateurs
            </h1>
            <p className="mt-1 text-slate-600">
              Choisissez le rôle de chaque membre de la plateforme.
            </p>
          </div>
          <span className="rounded-full bg-[#5B3FE0]/10 px-3 py-1 text-sm font-semibold text-[#5B3FE0]">
            {users.length} utilisateur{users.length > 1 ? "s" : ""}
          </span>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-slate-500">Chargement…</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F7F6FF] text-slate-600">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Utilisateur</th>
                  <th className="px-5 py-3.5 font-semibold">Filière</th>
                  <th className="px-5 py-3.5 font-semibold">Rôle</th>
                  <th className="px-5 py-3.5 font-semibold">Modifier</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = u._id === (me?._id || me?.id);
                  return (
                    <tr
                      key={u._id}
                      className="border-t border-slate-100 transition hover:bg-[#F7F6FF]/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1B1464] text-xs font-bold text-white">
                            {initials(u.nom)}
                          </span>
                          <div>
                            <p className="font-semibold text-[#1B1464]">
                              {u.nom}
                              {isMe && (
                                <span className="ml-2 text-xs font-medium text-slate-400">
                                  (vous)
                                </span>
                              )}
                            </p>
                            <p className="text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {u.filiere || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE[u.role]}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          aria-label={`Rôle de ${u.nom}`}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-[#5B3FE0] focus:ring-4 focus:ring-[#5B3FE0]/20 disabled:cursor-not-allowed disabled:opacity-50"
                          value={u.role}
                          disabled={isMe || saving === u._id}
                          onChange={(e) => changeRole(u, e.target.value)}
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}