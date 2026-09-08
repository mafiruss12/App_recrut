import { useState, type FormEvent } from 'react';
import { Phone, Lock, LogIn, AlertCircle, ShieldAlert, KeyRound, Copy, Check, UserPlus } from 'lucide-react';
import { storage } from '../lib/storage';
import { Commercial } from '../types';
import { PoweredBy } from './PoweredBy';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: Commercial, requiresProfile: boolean) => void;
}

type Mode = 'login' | 'register' | 'code_shown';

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sessionLocked, setSessionLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ackNote, setAckNote] = useState(false);

  if (!isOpen) return null;

  const resetMessages = () => {
    setError(null);
    setSessionLocked(false);
  };

  const handleLogin = async (e: FormEvent, forceTakeover = false) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);
    try {
      const res = await storage.login(phone, code, forceTakeover);
      setIsLoading(false);
      if (!res.success) {
        if (res.sessionLocked) setSessionLocked(true);
        else setError(res.error || 'Identifiants invalides');
        return;
      }
      if (res.user) {
        onSuccess(res.user, !!res.requiresProfile);
        onClose();
        setPhone('');
        setCode('');
        setMode('login');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Erreur de connexion');
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);
    try {
      const res = await storage.registerCommercial(phone);
      setIsLoading(false);
      if (!res.success) {
        setError(res.error || 'Inscription impossible');
        return;
      }
      setGeneratedCode(res.generatedCode || '');
      setMode('code_shown');
      setAckNote(false);
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Erreur inscription');
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const goToLoginWithCode = () => {
    setCode(generatedCode);
    setMode('login');
    setGeneratedCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="backdrop-blur-2xl bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10"
        >
          ✕
        </button>

        <div className="flex flex-col items-center mb-5">
          <div className="bg-white rounded-xl px-3 py-2 mb-4 max-w-[240px] w-full shadow-md"><img src="/logo-k2l.png" alt="K2L Services" className="w-full h-auto object-contain" /></div>
          <h2 className="text-xl font-bold text-white">
            {mode === 'code_shown' ? 'Votre code d’accès' : mode === 'register' ? 'Inscription Commercial' : 'Connexion Commercial'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 text-center">
            {mode === 'code_shown'
              ? 'Notez ce code : il ne sera plus affiché'
              : 'K2L Services · Espace terrain'}
          </p>
        </div>

        {mode !== 'code_shown' && (
          <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 mb-5">
            <button
              type="button"
              onClick={() => { setMode('login'); resetMessages(); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'login' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); resetMessages(); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'register' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              S’inscrire
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {sessionLocked && (
          <div className="mb-4 p-4 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-200 text-xs flex flex-col gap-3">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Session déjà active
            </div>
            <p>Une session est ouverte sur un autre appareil.</p>
            <button
              type="button"
              onClick={(e) => handleLogin(e as any, true)}
              className="w-full py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 font-medium text-xs"
            >
              Forcer la connexion
            </button>
          </div>
        )}

        {/* Écran code généré */}
        {mode === 'code_shown' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-violet-500/15 border border-violet-500/30 text-center">
              <div className="flex items-center justify-center gap-2 text-violet-300 text-xs font-semibold mb-2">
                <KeyRound className="w-4 h-4" />
                Code personnel unique
              </div>
              <p className="text-3xl font-black tracking-[0.25em] text-white font-mono select-all">
                {generatedCode}
              </p>
              <button
                type="button"
                onClick={copyCode}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-white"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copié' : 'Copier le code'}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-100 text-xs leading-relaxed">
              <strong>Important :</strong> ce code ne sera plus affiché. Notez-le ou photographiez-le.
              Sans ce code, vous ne pourrez pas vous reconnecter.
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={ackNote}
                onChange={(e) => setAckNote(e.target.checked)}
                className="mt-0.5 rounded border-white/20"
              />
              <span>J’ai noté mon code d’accès en lieu sûr</span>
            </label>

            <button
              type="button"
              disabled={!ackNote}
              onClick={goToLoginWithCode}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 disabled:opacity-40 text-white font-semibold text-sm shadow-lg"
            >
              Continuer vers la connexion
            </button>
          </div>
        )}

        {/* Inscription */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Numéro de téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07 XX XX XX XX"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  required
                  autoComplete="tel"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              L’application générera un <strong className="text-slate-300">code d’accès unique</strong> visible une seule fois.
              Conservez-le précieusement.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {isLoading ? 'Génération…' : 'Générer mon code d’accès'}
            </button>
          </form>
        )}

        {/* Connexion */}
        {mode === 'login' && (
          <form onSubmit={(e) => handleLogin(e, false)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Numéro de téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07 XX XX XX XX"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  required
                  autoComplete="tel"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Code d’accès personnel</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="5 chiffres"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  required
                  autoComplete="one-time-code"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isLoading ? 'Connexion…' : 'Se connecter'}
            </button>

            <p className="text-center text-[11px] text-slate-500">
              Pas encore de compte ?{' '}
              <button type="button" onClick={() => setMode('register')} className="text-violet-400 hover:text-violet-300">
                S’inscrire et générer un code
              </button>
            </p>
          </form>
        )}
        <div className="mt-5 pt-4 border-t border-white/10">
          <PoweredBy />
        </div>
      </div>
    </div>
  );
}
