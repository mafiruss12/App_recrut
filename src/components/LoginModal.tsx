import { useState, type FormEvent } from 'react';
import { Phone, Lock, LogIn, AlertCircle, ShieldAlert, Check } from 'lucide-react';
import { storage } from '../lib/storage';
import { Commercial } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: Commercial, requiresProfile: boolean) => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [phone, setPhone] = useState('0708091011');
  const [code, setCode] = useState('1234');
  const [error, setError] = useState<string | null>(null);
  const [sessionLocked, setSessionLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent, forceTakeover = false) => {
    e.preventDefault();
    setError(null);
    setSessionLocked(false);
    setIsLoading(true);

    try {
      const res = await storage.login(phone, code, forceTakeover);
      setIsLoading(false);

      if (!res.success) {
        if (res.sessionLocked) {
          setSessionLocked(true);
        } else {
          setError(res.error || 'Identifiants invalides');
        }
        return;
      }

      if (res.user) {
        onSuccess(res.user, !!res.requiresProfile);
        onClose();
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Erreur de connexion');
    }
  };

  const handleQuickCommercial = (p: string, c: string) => {
    setPhone(p);
    setCode(c);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="backdrop-blur-2xl bg-slate-900/90 border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-600/30">
            K2
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Connexion Sécurisée</h2>
            <p className="text-xs text-slate-400">Application Terrain K2L Recrutement</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {sessionLocked && (
          <div className="mb-5 p-4 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Verrouillage de Session Actif</span>
            </div>
            <p>
              Ce compte est déjà connecté sur un autre appareil. Souhaitez-vous forcer la déconnexion de l'autre appareil pour ouvrir votre session ici ?
            </p>
            <button
              type="button"
              onClick={e => handleSubmit(e, true)}
              className="mt-1 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs self-start transition-colors"
            >
              Forcer la reprise de session
            </button>
          </div>
        )}

        <form onSubmit={e => handleSubmit(e, false)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Numéro de Téléphone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="tel"
                required
                placeholder="ex: 0708091011"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Code Fixe Personnel (ou PIN Manager)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                required
                placeholder="4 chiffres ou PIN"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 font-mono tracking-widest"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoading ? 'Vérification...' : 'Se Connecter'}</span>
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-[11px] text-slate-400 mb-2 font-medium">Comptes de test pré-configurés :</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickCommercial('0708091011', '1234')}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-left border border-white/10 text-slate-300 transition-colors"
            >
              <div className="font-semibold text-white">Mafi Russ (Commercial)</div>
              <div className="text-slate-400">Tél: 0708091011 • Code: 1234</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickCommercial('0505050505', '2026')}
              className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-left border border-indigo-500/20 text-indigo-200 transition-colors"
            >
              <div className="font-semibold text-white">Direction (Manager)</div>
              <div className="text-indigo-300">Code PIN Boss: 2026</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
