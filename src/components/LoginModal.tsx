import { useState, type FormEvent } from 'react';
import { Phone, Lock, LogIn, AlertCircle } from 'lucide-react';
import { storage } from '../lib/storage';
import { Commercial } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: Commercial, requiresProfile: boolean) => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await storage.login(phone, password);
      if (!result.success || !result.user) {
        setError(result.error || 'Identifiants invalides.');
        return;
      }

      if (result.user.role === 'manager') {
        setError('Utilisez le portail Direction pour ce compte.');
        await storage.logout();
        return;
      }

      onSuccess(result.user, Boolean(result.requiresProfile));
      onClose();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Erreur de connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="commercial-login-title">
      <div className="backdrop-blur-2xl bg-slate-900/90 border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fenêtre de connexion"
          className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10"
        >
          ×
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-600/30">K2</div>
          <div>
            <h2 id="commercial-login-title" className="text-xl font-bold text-white">Connexion sécurisée</h2>
            <p className="text-xs text-slate-400">Compte commercial Supabase Auth</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs flex items-center gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5" htmlFor="commercial-phone">
              Numéro de téléphone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                id="commercial-phone"
                type="tel"
                required
                autoFocus
                placeholder="+225 07 08 09 10 11"
                value={phone}
                onChange={event => setPhone(event.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5" htmlFor="commercial-password">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                id="commercial-password"
                type="password"
                required
                placeholder="Votre mot de passe"
                value={password}
                onChange={event => setPassword(event.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoading ? 'Vérification…' : 'Se connecter'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
