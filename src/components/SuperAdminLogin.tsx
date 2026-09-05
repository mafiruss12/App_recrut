import { useState, type FormEvent } from 'react';
import { AlertCircle, KeyRound, LockKeyhole, Shield } from 'lucide-react';
import { storage } from '../lib/storage';
import { Commercial } from '../types';

export function SuperAdminLogin({ onSuccess, onBack }: { onSuccess: (user: Commercial) => void; onBack: () => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await storage.login(identifier, password);
      if (!result.success || !result.user || result.user.role !== 'super_admin') {
        if (result.user) await storage.logout();
        setError('Accès Super Administrateur refusé.');
      } else {
        onSuccess(result.user);
      }
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative z-10 flex-1 flex items-center justify-center bg-slate-950 px-5 py-12">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 sm:p-9 shadow-2xl">
        <div className="flex items-center gap-3 mb-8"><div className="w-12 h-12 rounded-2xl bg-cyan-400/15 text-cyan-300 flex items-center justify-center"><Shield className="w-6 h-6" /></div><div><p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-bold">K2L Core</p><h1 className="text-xl font-black text-white">Super Administration</h1></div></div>
        <p className="text-sm leading-6 text-slate-400 mb-6">Accès réservé au propriétaire de la plateforme. Cet espace supervise les organisations et leurs administrateurs.</p>
        {error && <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-3 text-xs text-red-200 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">Téléphone de sécurité</span><div className="relative"><KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" /><input required value={identifier} onChange={event => setIdentifier(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-cyan-400" /></div></label>
          <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">Mot de passe</span><div className="relative"><LockKeyhole className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" /><input required type="password" value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-cyan-400" /></div></label>
          <button disabled={loading} className="w-full rounded-xl bg-cyan-500 py-3.5 text-sm font-black text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50">{loading ? 'Vérification…' : 'Ouvrir la console'}</button>
        </form>
        <button onClick={onBack} className="mt-6 w-full text-center text-xs font-semibold text-slate-500 hover:text-white">← Retour à l’accueil</button>
      </div>
    </main>
  );
}
