import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { login, clearError } from "../features/authSlice";

const COLUMNS = ["À faire", "En cours", "Terminé"];

const INITIAL_CARDS = [
  { id: 1, title: "Rédiger le rapport", who: "CH", col: 0, color: "#FFD23F" },
  { id: 2, title: "Maquette de l'application", who: "SA", col: 0, color: "#7DD3FC" },
  { id: 3, title: "Modèle de la base de données", who: "YM", col: 1, color: "#F9A8D4" },
  { id: 4, title: "Préparer la soutenance", who: "LB", col: 1, color: "#FFD23F" },
  { id: 5, title: "Revue de code", who: "CH", col: 2, color: "#86EFAC" },
];

function TeamBoard() {
  const [cards, setCards] = useState(INITIAL_CARDS);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let tick = 0;
    const timer = setInterval(() => {
      const target = INITIAL_CARDS[tick % INITIAL_CARDS.length].id;
      setCards((prev) =>
        prev.map((c) => (c.id === target ? { ...c, col: (c.col + 1) % 3 } : c))
      );
      tick += 1;
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const seen = [0, 0, 0];
  const placed = cards.map((c) => ({ ...c, row: seen[c.col]++ }));

  return (
    <div className="relative h-[340px] w-full max-w-[520px]" aria-hidden="true">
      {COLUMNS.map((name, i) => (
        <div
          key={name}
          className="absolute top-0 h-full rounded-2xl border border-white/15 bg-white/[0.06]"
          style={{ left: `${i * 34}%`, width: "32%" }}
        >
          <p className="px-3 pt-3 text-sm font-semibold text-white/70">{name}</p>
        </div>
      ))}
      {placed.map((c) => (
        <div
          key={c.id}
          className="absolute rounded-xl bg-white p-3 text-[#1B1464] shadow-lg"
          style={{
            left: `calc(${c.col * 34}% + 6px)`,
            top: 44 + c.row * 92,
            width: "calc(32% - 12px)",
            transition:
              "left .8s cubic-bezier(.3,1.3,.5,1), top .8s cubic-bezier(.3,1.3,.5,1)",
          }}
        >
          <span
            className="mb-2 block h-1.5 w-8 rounded-full"
            style={{ background: c.color }}
          />
          <p className="text-[13px] font-semibold leading-snug">{c.title}</p>
          <span className="mt-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1B1464] text-[10px] font-bold text-white">
            {c.who}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const { loading, error } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onChange = (e) => {
    dispatch(clearError());
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(form));
    if (login.fulfilled.match(result)) navigate("/projects");
  };

  return (
    <div className="login-root grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&display=swap');
        .login-root { font-family: 'DM Sans', system-ui, sans-serif; }
        .login-title { font-family: 'Bricolage Grotesque', system-ui, sans-serif; }
        @keyframes drift { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-24px) scale(1.08); } }
        @keyframes pop { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .blob { animation: drift 14s ease-in-out infinite; }
        .form-in > * { animation: pop .6s cubic-bezier(.2,.8,.2,1) both; }
        .form-in > *:nth-child(2) { animation-delay: .08s; }
        .form-in > *:nth-child(3) { animation-delay: .16s; }
        .form-in > *:nth-child(4) { animation-delay: .24s; }
        .form-in > *:nth-child(5) { animation-delay: .32s; }
        @media (prefers-reduced-motion: reduce) {
          .blob, .form-in > * { animation: none; }
        }
      `}</style>

      {/* Panneau gauche : l'équipe au travail */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#1B1464] p-12 text-white lg:flex">
        <div
          className="blob absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#5B3FE0] opacity-60 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="blob absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-[#FFD23F] opacity-20 blur-3xl"
          style={{ animationDelay: "-6s" }}
          aria-hidden="true"
        />

        <div className="login-title relative flex items-center gap-2 text-2xl font-extrabold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD23F] text-[#1B1464]">
            E
          </span>
          Eduteam
        </div>

        <div className="relative">
          <h2 className="login-title mb-3 max-w-md text-4xl font-extrabold leading-tight">
            Votre projet de groupe avance, tâche après tâche.
          </h2>
          <p className="mb-10 max-w-sm text-white/70">
            Répartissez le travail, suivez l'avancement et rendez à temps avec
            toute votre équipe.
          </p>
          <TeamBoard />
        </div>

        <p className="relative text-sm text-white/50">
          Pour les étudiants et leurs encadrants.
        </p>
      </aside>

      {/* Panneau droit : formulaire */}
      <main className="flex items-center justify-center bg-[#F7F6FF] px-6 py-12">
        <form onSubmit={handleSubmit} className="form-in w-full max-w-sm">
          <div className="login-title mb-8 flex items-center gap-2 text-xl font-extrabold text-[#1B1464] lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFD23F]">
              E
            </span>
            Eduteam
          </div>

          <div className="mb-8">
            <h1 className="login-title text-3xl font-extrabold text-[#1B1464]">
              Content de vous revoir
            </h1>
            <p className="mt-2 text-slate-600">
              Connectez-vous pour retrouver vos projets.
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={onChange}
              placeholder="prenom.nom@universite.tn"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#5B3FE0] focus:ring-4 focus:ring-[#5B3FE0]/20"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={onChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-24 text-slate-900 outline-none transition focus:border-[#5B3FE0] focus:ring-4 focus:ring-[#5B3FE0]/20"
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
            {error && (
              <p
                role="alert"
                className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#1B1464] px-4 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2a1f9a] hover:shadow-lg hover:shadow-[#1B1464]/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? "Connexion en cours..." : "Se connecter"}
            </button>
            <p className="mt-6 text-center text-sm text-slate-600">
              Pas encore de compte ?{" "}
              <Link to="/register" className="font-semibold text-[#5B3FE0] underline-offset-4 hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
