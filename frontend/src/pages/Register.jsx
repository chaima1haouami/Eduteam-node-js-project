import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { register, clearError } from "../features/authSlice";

const STEPS = [
  { title: "Créez votre compte", text: "Un nom, un email et vous êtes prêt." },
  { title: "Lancez un projet", text: "Titre, dates, description : en une minute." },
  { title: "Invitez votre équipe", text: "Chacun voit ses tâches et leur avancement." },
];

const ROLES = [
  { value: "etudiant", label: "Étudiant", hint: "Je travaille sur un projet" },
  { value: "encadrant", label: "Encadrant", hint: "Je suis des équipes" },
];

const field =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#5B3FE0] focus:ring-4 focus:ring-[#5B3FE0]/20";

export default function Register() {
  const [form, setForm] = useState({
    nom: "",
    email: "",
    password: "",
    filiere: "",
    role: "etudiant",
  });
  const [showPassword, setShowPassword] = useState(false);
  const { loading, error } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onChange = (e) => {
    dispatch(clearError());
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(register(form));
    if (register.fulfilled.match(result)) navigate("/projects");
  };

  return (
    <div className="reg-root grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&display=swap');
        .reg-root { font-family: 'DM Sans', system-ui, sans-serif; }
        .reg-title { font-family: 'Bricolage Grotesque', system-ui, sans-serif; }
        @keyframes drift { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,26px) scale(1.08); } }
        @keyframes pop { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .blob { animation: drift 14s ease-in-out infinite; }
        .step { animation: pop .6s cubic-bezier(.2,.8,.2,1) both; }
        .rail { transform-origin: top; animation: grow 1.6s .2s cubic-bezier(.3,.8,.3,1) both; }
        .form-in > * { animation: pop .6s cubic-bezier(.2,.8,.2,1) both; }
        .form-in > *:nth-child(2) { animation-delay: .08s; }
        .form-in > *:nth-child(3) { animation-delay: .16s; }
        .form-in > *:nth-child(4) { animation-delay: .24s; }
        @media (prefers-reduced-motion: reduce) {
          .blob, .step, .rail, .form-in > * { animation: none; }
        }
      `}</style>

      {/* Panneau gauche : les 3 étapes */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#1B1464] p-12 text-white lg:flex">
        <div
          className="blob absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#5B3FE0] opacity-60 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="blob absolute -bottom-32 -left-10 h-96 w-96 rounded-full bg-[#FFD23F] opacity-20 blur-3xl"
          style={{ animationDelay: "-7s" }}
          aria-hidden="true"
        />

        <div className="reg-title relative flex items-center gap-2 text-2xl font-extrabold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD23F] text-[#1B1464]">
            E
          </span>
          Eduteam
        </div>

        <div className="relative">
          <h2 className="reg-title mb-12 max-w-md text-4xl font-extrabold leading-tight">
            De l'idée à la soutenance, en équipe.
          </h2>

          <ol className="relative max-w-sm space-y-8 pl-14">
            <span
              className="rail absolute left-[19px] top-2 h-[calc(100%-1rem)] w-0.5 bg-white/25"
              aria-hidden="true"
            />
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="step relative"
                style={{ animationDelay: `${0.3 + i * 0.35}s` }}
              >
                <span className="reg-title absolute -left-14 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#FFD23F] text-lg font-extrabold text-[#1B1464]">
                  {i + 1}
                </span>
                <p className="reg-title text-xl font-bold">{s.title}</p>
                <p className="mt-1 text-white/70">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>

        <p className="relative text-sm text-white/50">
          Pour les étudiants et leurs encadrants.
        </p>
      </aside>

      {/* Panneau droit : formulaire */}
      <main className="flex items-center justify-center bg-[#F7F6FF] px-6 py-12">
        <form onSubmit={onSubmit} className="form-in w-full max-w-md">
          <div className="reg-title mb-8 flex items-center gap-2 text-xl font-extrabold text-[#1B1464] lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFD23F]">
              E
            </span>
            Eduteam
          </div>

          <div className="mb-6">
            <h1 className="reg-title text-3xl font-extrabold text-[#1B1464]">
              Créer votre compte
            </h1>
            <p className="mt-2 text-slate-600">
              Rejoignez votre équipe en quelques secondes.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="nom" className="mb-1.5 block text-sm font-medium text-slate-700">
                Nom complet
              </label>
              <input id="nom" name="nom" autoComplete="name" required value={form.nom} onChange={onChange} className={field} />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input id="email" type="email" name="email" autoComplete="email" required value={form.email} onChange={onChange} placeholder="prenom.nom@universite.tn" className={field} />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Mot de passe <span className="font-normal text-slate-500">(6 caractères minimum)</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={onChange}
                  className={`${field} pr-24`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-sm font-medium text-[#5B3FE0] hover:bg-[#5B3FE0]/10 focus-visible:outline-2 focus-visible:outline-[#5B3FE0]"
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="filiere" className="mb-1.5 block text-sm font-medium text-slate-700">
                Filière <span className="font-normal text-slate-500">(facultatif)</span>
              </label>
              <input id="filiere" name="filiere" value={form.filiere} onChange={onChange} className={field} />
            </div>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-slate-700">Votre rôle</legend>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r) => (
                  <label
                    key={r.value}
                    className={`cursor-pointer rounded-xl border-2 px-4 py-3 transition focus-within:ring-4 focus-within:ring-[#5B3FE0]/20 ${
                      form.role === r.value
                        ? "border-[#5B3FE0] bg-[#5B3FE0]/10"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={form.role === r.value}
                      onChange={onChange}
                      className="sr-only"
                    />
                    <span className="block font-semibold text-[#1B1464]">{r.label}</span>
                    <span className="block text-sm text-slate-600">{r.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mt-6">
            {error && (
              <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#1B1464] px-4 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2a1f9a] hover:shadow-lg hover:shadow-[#1B1464]/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? "Création en cours..." : "Créer mon compte"}
            </button>
            <p className="mt-6 text-center text-sm text-slate-600">
              Vous avez déjà un compte ?{" "}
              <Link to="/login" className="font-semibold text-[#5B3FE0] underline-offset-4 hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
