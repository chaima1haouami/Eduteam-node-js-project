import { useEffect, useRef, useState } from "react";
import api from "../services/api";

const formatSize = (bytes = 0) =>
  bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} Mo`
    : `${Math.max(1, Math.round(bytes / 1024))} Ko`;

const extColor = (name = "") => {
  const ext = name.split(".").pop().toLowerCase();
  if (["pdf"].includes(ext)) return "#F9A8D4";
  if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext)) return "#7DD3FC";
  if (["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext)) return "#86EFAC";
  return "#FFD23F";
};

export default function ProjectFiles({ projectId }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const base = `/api/projects/${projectId}/files`;

  const loadFiles = async () => {
    try {
      const { data } = await api.get(base);
      setFiles(data.files);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur de chargement");
    }
  };

  useEffect(() => {
    loadFiles();
  }, [projectId]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setError("");
    try {
      await api.post(base, formData);
      await loadFiles();
    } catch (err) {
      setError(err.response?.data?.message || "Échec de l'envoi");
    } finally {
      setUploading(false);
      inputRef.current.value = "";
    }
  };

  const handleDownload = async (fileId) => {
    try {
      const { data } = await api.get(`${base}/${fileId}/download`);
      window.open(data.url, "_blank");
    } catch (err) {
      setError(err.response?.data?.message || "Échec du téléchargement");
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xl font-extrabold text-[#1B1464]">Fichiers du projet</h3>
        <button
          onClick={() => inputRef.current.click()}
          disabled={uploading}
          className="rounded-xl bg-[#1B1464] px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2a1f9a] hover:shadow-lg hover:shadow-[#1B1464]/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {uploading ? "Envoi en cours..." : "Déposer un fichier"}
        </button>
        <input ref={inputRef} type="file" onChange={handleUpload} className="hidden" />
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {files.length === 0 ? (
        <p className="rounded-xl bg-[#F7F6FF] px-4 py-6 text-center text-sm text-slate-600">
          Aucun fichier pour le moment. Déposez le premier !
        </p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f._id}
              className="flex items-center justify-between gap-4 rounded-xl bg-[#F7F6FF] p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-10 w-1.5 shrink-0 rounded-full"
                  style={{ background: extColor(f.name) }}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#1B1464]">{f.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatSize(f.size)} · {f.uploadedBy?.name} ·{" "}
                    {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDownload(f._id)}
                className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-[#5B3FE0] hover:bg-[#5B3FE0]/10 focus-visible:outline-2 focus-visible:outline-[#5B3FE0]"
              >
                Télécharger
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}