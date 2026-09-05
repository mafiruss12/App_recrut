import { useState, type FormEvent } from 'react';
import { ShieldCheck, Lock, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { storage } from '../lib/storage';

interface BossLoginProps {
  onSuccess: () => void;
  onGoToCommercial?: () => void;
}

export function BossLogin({ onSuccess, onGoToCommercial }: BossLoginProps) {
  const [pinCode, setPinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = storage.authenticateBoss(pinCode);
      setIsLoading(false);

      if (res.success) {
        onSuccess();
      } else {
        setError(res.error || 'Code secret Direction invalide');
      }
    }, 200);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 animate-fade-in">
      <div className="backdrop-blur-2xl bg-slate-900/80 border border-white/15 rounded-3xl p-6 sm:p-10 max-w-md w-full shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand / Icon */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-4 border border-indigo-400/30">
            <ShieldCheck className="w-9 h-9 text-white" />
          </div>
          <span className="px-3 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold uppercase tracking-wider mb-2">
            Espace Protégé
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">Direction & Supervision</h1>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
            Accès sécurisé réservé au Boss et Managers de K2L.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Code Secret Direction (PIN)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                required
                autoFocus
                placeholder="Entrez le code secret Boss"
                value={pinCode}
                onChange={e => setPinCode(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/70 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 font-mono tracking-widest text-center"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 text-center">
              Code PIN Direction initial : <code className="text-indigo-300 font-bold">2026</code>
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>{isLoading ? 'Vérification...' : 'Déverrouiller le Tableau de Bord'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Switch link */}
        {onGoToCommercial && (
          <div className="mt-8 pt-4 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={onGoToCommercial}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
            >
              <span>Accéder à l'espace commercial (terrain)</span>
              <span>→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
