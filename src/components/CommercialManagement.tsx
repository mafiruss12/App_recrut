import { useEffect, useState, type FormEvent } from 'react';
import { Copy, KeyRound, Plus, RefreshCw, Users, X } from 'lucide-react';
import { storage } from '../lib/storage';
import { Commercial } from '../types';

export function CommercialManagement({ organizationId }: { organizationId?: string | null }) {
  const [commercials, setCommercials] = useState<Commercial[]>([]);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [cabinet, setCabinet] = useState('');
  const [localite, setLocalite] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => setCommercials(storage.getCommerciaux().filter(item => item.role === 'commercial' && (!organizationId || item.organization_id === organizationId)));
  useEffect(load, [organizationId]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!organizationId) { setMessage('Votre organisation n’est pas encore configurée.'); return; }
    setLoading(true); setMessage(''); setGeneratedCode('');
    try {
      const result = await storage.provisionCommercial({ phone, name, cabinet, localite, organizationId });
      setGeneratedCode(result.code);
      setPhone(''); setName(''); setCabinet(''); setLocalite('');
      setOpen(false); setMessage('Commercial créé. Copiez le code maintenant : il ne sera plus affiché.');
      await storage.refreshRemoteData(); load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Création impossible.');
    } finally { setLoading(false); }
  };

  return <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 overflow-hidden"><div className="p-5 border-b border-white/10 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center"><Users className="w-4 h-4" /></div><div><h2 className="font-bold text-white">Équipe commerciale</h2><p className="text-xs text-slate-400">Générez un code personnel unique pour chaque commercial.</p></div></div><button onClick={() => setOpen(value => !value)} className="rounded-xl bg-indigo-500 px-3 py-2 text-xs font-black text-white flex items-center gap-1"><Plus className="w-4 h-4" />Nouveau commercial</button></div>
    {message && <div className="mx-5 mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-xs text-cyan-200">{message}</div>}
    {generatedCode && <div className="mx-5 mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4"><p className="text-xs font-bold text-emerald-300">Code personnel à transmettre au commercial</p><div className="mt-2 flex items-center justify-between gap-3"><code className="text-2xl font-black tracking-[0.35em] text-white">{generatedCode}</code><button onClick={() => void navigator.clipboard.writeText(generatedCode)} className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white flex items-center gap-1"><Copy className="w-3.5 h-3.5" />Copier</button></div><p className="mt-2 text-[11px] text-emerald-200/80">Ce code est fixe jusqu’à sa régénération. Ne le partagez pas dans un canal public.</p></div>}
    {open && <form onSubmit={create} className="p-5 bg-slate-950/30 border-b border-white/10 grid sm:grid-cols-2 gap-3"><input required value={name} onChange={event => setName(event.target.value)} placeholder="Nom complet" className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400" /><input required value={phone} onChange={event => setPhone(event.target.value)} placeholder="Téléphone" className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400" /><input value={cabinet} onChange={event => setCabinet(event.target.value)} placeholder="Cabinet" className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400" /><input value={localite} onChange={event => setLocalite(event.target.value)} placeholder="Localité" className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400" /><div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400">Annuler</button><button disabled={loading} className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-black text-white flex items-center gap-2">{loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}Générer le code</button></div></form>}
    <div className="divide-y divide-white/5">{commercials.length === 0 ? <p className="p-6 text-sm text-slate-500">Aucun commercial rattaché à cette organisation.</p> : commercials.map(item => <div key={item.id} className="p-4 flex items-center justify-between"><div><p className="font-bold text-white">{item.name || 'Commercial sans nom'}</p><p className="text-xs text-slate-400">{item.phone} · {item.localite || 'Localité non définie'}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>{item.is_active ? 'ACTIF' : 'INACTIF'}</span></div>)}</div>
  </section>;
}
