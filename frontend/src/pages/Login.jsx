import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mic, Target, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ username, password });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ====== Brand panel ====== */}
      <aside className="hidden lg:flex flex-col justify-between relative overflow-hidden bg-ink-950 text-white p-12">
        <div className="absolute inset-0 bg-brand-radial opacity-90 pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 20% 10%, rgba(34,197,94,0.22), transparent 55%), radial-gradient(ellipse at 85% 95%, rgba(20,184,166,0.2), transparent 55%)',
          }}
        />
        <div className="relative">
          <div className="mb-12">
            <img
              src="/dhronai-logo.svg"
              alt="DhronAI"
              className="object-contain select-none"
              style={{ height: 48, maxHeight: 56 }}
              draggable={false}
            />
          </div>

          <h1 className="hero-headline text-4xl xl:text-5xl">
            Your <span className="gradient-text-bright">intelligence partner</span><br />
            for every conversation.
          </h1>
          <p className="mt-6 text-ink-300 text-lg max-w-md font-normal">
            Upload meetings, let AI transcribe them, and watch action items appear on your calendar — automatically.
          </p>
        </div>

        <ul className="relative space-y-3 text-ink-200 text-sm">
          <Feature icon={Mic}        label="AI transcription with Sarvam Saaras v3" />
          <Feature icon={Target}     label="Auto-extracted follow-ups & deadlines" />
          <Feature icon={CheckCircle2} label="Smart calendar with drag-and-drop" />
        </ul>
      </aside>

      {/* ====== Form ====== */}
      <main className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex flex-col items-center">
            <img
              src="/dhronai-logo.svg"
              alt="DhronAI"
              className="object-contain"
              style={{ height: 44, maxHeight: 48 }}
            />
          </div>

          <h2 className="text-2xl font-bold text-ink-900 tracking-tight">Welcome back</h2>
          <p className="mt-1.5 text-sm text-ink-500">Sign in to your workspace.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
            )}

            <div>
              <label htmlFor="username" className="form-label">Username</label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder="you@company.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary mt-2 py-2.5 rounded-2xl">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-ink-400">
            CRM with AI-powered transcription • Built for Bharat
          </p>
        </div>
      </main>
    </div>
  );
}

function Feature({ icon: Icon, label }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary-400" />
      </span>
      {label}
    </li>
  );
}
