import { useState, type FormEvent } from 'react';
import { Phone, Lock, ArrowRight, AlertCircle, ArrowLeft, ShieldAlert } from 'lucide-react';
import { storage } from '../lib/storage';
import { Commercial, canAccessBossPortal } from '../types';
import { PoweredBy } from './PoweredBy';

interface BossLoginProps {
  onSuccess: (user: Commercial) => void;
  onGoToCommercial?: () => void;
}

export function BossLogin({ onSuccess, onGoToCommercial }: BossLoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sessionLocked, setSessionLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent, forceTakeover = false) => {
    e.preventDefault();
    setError(null);
    setSessionLocked(false);
    setIsLoading(true);
    try {
      const res = await storage.login(identifier, code, forceTakeover);
      setIsLoading(false);
      if (!res.success) {
        if (res.sessionLocked) setSessionLocked(true);
        else setError(res.error || 'Identifiants invalides');
        return;
      }
      if (res.user) {
        if (!canAccessBossPortal(res.user.role)) {
          setError('Ce compte n’a pas accès à l’espace Direction. Utilisez l’espace Commercial.');
          await storage.logoutCommercial();
          return;
        }
        onSuccess(res.user);
      }
    } catch {
      setIsLoading(false);
      setError('Erreur de connexion');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
      <div className="backdrop-blur-2xl bg-slate-900/90 border border-white/10 rounded-3xl p-6 sm:p-10 max-w-md w-full shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center mb-8 relative">
          <div className="bg-white rounded-xl px-3 py-2 mb-5 max-w-[260px] w-full shadow-md">
            <img src="/logo-k2l.png" alt="K2L Services" className="w-full h-auto object-contain" />
          </div>
          <span className="px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300 text-[11px] font-semibold uppercase tracking-wider mb-3">
            Espace Direction
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Supervision & Pilotage</h1>
          <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
            Connexion Manager, Superviseur ou Admin — e-mail ou téléphone + code 5 chiffres.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {sessionLocked && (
          <div className="mb-5 p-4 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <ShieldAlert className="w-4 h-4" />
              Session déjà active
            </div>
            <button
              type="button"
              onClick={e => handleSubmit(e as any, true)}
              className="w-full py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-100 font-medium text-xs"
            >
              Forcer la connexion
            </button>
          </div>
        )}

        <form onSubmit={e => handleSubmit(e, false)} className="space-y-4 relative">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">E-mail ou téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="email@k2l.ci ou 07 XX XX XX XX"
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                required
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Superviseurs, Managers et Admins peuvent se connecter par e-mail</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Code personnel</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="5 chiffres"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            {isLoading ? 'Connexion…' : (
              <>
                Accéder au tableau de bord
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {onGoToCommercial && (
          <button
            type="button"
            onClick={onGoToCommercial}
            className="mt-6 w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Espace commercial
          </button>
        )}
        <div className="mt-6">
          <PoweredBy />
        </div>
      </div>
    </div>
  );
}
