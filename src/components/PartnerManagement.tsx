import { useState, useEffect, type FormEvent } from 'react';
import { Building2, Plus, Save, RefreshCw } from 'lucide-react';
import { storage } from '../lib/storage';
import type { PartenaireDef } from '../lib/partenaires-k2l';

export function PartnerManagement() {
  const [list, setList] = useState<PartenaireDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [actionsText, setActionsText] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editActions, setEditActions] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await storage.getPartenaires();
    setList(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const actions = actionsText.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    const res = await storage.addPartenaire(name, actions);
    if (!res.success) {
      setErr(res.error || 'Erreur');
      return;
    }
    setMsg(`Partenaire « ${name.toUpperCase()} » ajouté`);
    setName('');
    setActionsText('');
    await load();
  };

  const handleSaveActions = async (partnerName: string) => {
    setErr(null);
    setMsg(null);
    const actions = editActions.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    const res = await storage.updatePartenaireActions(partnerName, actions);
    if (!res.success) {
      setErr(res.error || 'Erreur');
      return;
    }
    setMsg(`Actions mises à jour pour ${partnerName}`);
    setEditing(null);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-violet-400" />
          Partenaires & actions
        </h3>
        <button type="button" onClick={load}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Actualiser
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Chaque partenaire a ses propres actions. Les commerciaux choisissent le partenaire puis l’action adaptée.
        Vous pouvez ajouter un nouveau partenaire (nouveau contrat).
      </p>

      {err && <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-xs">{err}</div>}
      {msg && <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs">{msg}</div>}

      <form onSubmit={handleAdd} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau partenaire
        </p>
        <input required value={name} onChange={e => setName(e.target.value)}
          placeholder="Nom (ex. CORIS BANK)"
          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
        <textarea value={actionsText} onChange={e => setActionsText(e.target.value)}
          placeholder="Actions séparées par des virgules ou une par ligne&#10;ex: Ouverture de compte, Collecte KYC, Prospection"
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
        <button type="submit"
          className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium">
          Ajouter le partenaire
        </button>
      </form>

      <div className="space-y-3">
        {loading ? (
          <p className="text-slate-500 text-sm">Chargement…</p>
        ) : (
          list.map(p => (
            <div key={p.id || p.name} className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-semibold text-white">{p.name}</span>
                <button type="button"
                  onClick={() => {
                    if (editing === p.name) setEditing(null);
                    else {
                      setEditing(p.name);
                      setEditActions((p.actions || []).join(', '));
                    }
                  }}
                  className="text-xs text-violet-300 hover:text-white px-2 py-1 rounded-lg bg-violet-500/15">
                  {editing === p.name ? 'Annuler' : 'Modifier actions'}
                </button>
              </div>
              {editing === p.name ? (
                <div className="space-y-2">
                  <textarea value={editActions} onChange={e => setEditActions(e.target.value)} rows={3}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-white/15 text-white text-sm" />
                  <button type="button" onClick={() => handleSaveActions(p.name)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
                    <Save className="w-3.5 h-3.5" /> Enregistrer
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(p.actions || []).length === 0 ? (
                    <span className="text-xs text-slate-500">Aucune action définie</span>
                  ) : (
                    p.actions.map(a => (
                      <span key={a} className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-200 text-[11px] border border-violet-500/25">
                        {a}
                      </span>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
