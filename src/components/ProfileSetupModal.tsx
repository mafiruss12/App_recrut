import { useState, useEffect, type FormEvent } from 'react';
import { MapPin, User, Users, Briefcase, Building2, ListChecks } from 'lucide-react';
import { Commercial } from '../types';
import { storage } from '../lib/storage';
import { LOCALITES_CI, CABINET_K2L } from '../lib/localites-ci';
import { PARTENAIRE_AUTRE, actionsForPartenaire, type PartenaireDef } from '../lib/partenaires-k2l';

interface ProfileSetupModalProps {
  isOpen: boolean;
  user: Commercial | null;
  onSave: (updatedUser: Commercial) => void;
}

export function ProfileSetupModal({ isOpen, user, onSave }: ProfileSetupModalProps) {
  const [name, setName] = useState('');
  const [localite, setLocalite] = useState('');
  const [customLocalite, setCustomLocalite] = useState('');
  const [partenaire, setPartenaire] = useState('');
  const [customPartenaire, setCustomPartenaire] = useState('');
  const [action, setAction] = useState('');
  const [customAction, setCustomAction] = useState('');
  const [superviseurId, setSuperviseurId] = useState('');
  const [superviseurs, setSuperviseurs] = useState<Commercial[]>([]);
  const [partenaires, setPartenaires] = useState<PartenaireDef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setLocalite(user.localite || '');
      setPartenaire(user.partenaire || '');
      setAction(user.action || '');
      setSuperviseurId(user.superviseur_id || '');
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;
    storage.getSuperviseurs().then(setSuperviseurs).catch(() => setSuperviseurs([]));
    storage.getPartenaires().then(list => {
      setPartenaires(list);
      if (user?.partenaire && !list.some(p => p.name === user.partenaire) && user.partenaire !== PARTENAIRE_AUTRE) {
        // partenaire personnalisé déjà enregistré
        setPartenaire(PARTENAIRE_AUTRE);
        setCustomPartenaire(user.partenaire);
      }
    }).catch(() => setPartenaires([]));
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const needsSuperviseur = user.role === 'commercial';
  const effectivePartenaireName =
    partenaire === PARTENAIRE_AUTRE ? customPartenaire.trim() : partenaire;
  const actionOptions = actionsForPartenaire(effectivePartenaireName, partenaires);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const finalLocalite = localite === 'Autre localité' ? customLocalite.trim() : localite.trim();
    if (!name.trim() || !finalLocalite) {
      setError(localite === 'Autre localité' ? 'Veuillez saisir votre localité.' : 'Nom et localité obligatoires.');
      return;
    }
    if (needsSuperviseur && !superviseurId) {
      setError('Veuillez sélectionner votre superviseur.');
      return;
    }
    if (!partenaire) {
      setError('Veuillez choisir un partenaire.');
      return;
    }
    if (partenaire === PARTENAIRE_AUTRE && !customPartenaire.trim()) {
      setError('Indiquez le nom du partenaire.');
      return;
    }
    const finalAction = action === 'Autre action' ? customAction.trim() : action.trim();
    if (!finalAction) {
      setError('Veuillez choisir ou saisir une action.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const sup = superviseurs.find(s => s.id === superviseurId);
      const updated = await storage.updateProfile(user.id, {
        name: name.trim(),
        localite: finalLocalite,
        partenaire: effectivePartenaireName,
        action: finalAction,
        superviseur_id: needsSuperviseur ? superviseurId : null,
        superviseur_name: needsSuperviseur ? (sup?.name || null) : null,
      });
      onSave(updated);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="backdrop-blur-2xl bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-white rounded-xl px-2 py-1.5 shadow-sm">
            <img src="/logo-k2l.png" alt="K2L" className="h-10 w-auto object-contain" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Profil</h2>
            <p className="text-xs text-slate-400">Localité, partenaire et action — modifiables à tout moment</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-xs">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              <User className="inline w-3.5 h-3.5 mr-1" /> Nom et prénom <span className="text-violet-400">*</span>
            </label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="ex: Kouassi Jean"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              <MapPin className="inline w-3.5 h-3.5 mr-1" /> Localité <span className="text-violet-400">*</span>
            </label>
            <select required value={localite} onChange={e => setLocalite(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50">
              <option value="" className="bg-slate-900">Choisir une localité…</option>
              {LOCALITES_CI.map(loc => (
                <option key={loc} value={loc} className="bg-slate-900">{loc}</option>
              ))}
            </select>
            {localite === 'Autre localité' && (
              <input type="text" value={customLocalite} onChange={e => setCustomLocalite(e.target.value)}
                placeholder="Saisir votre localité…" required
                className="mt-2 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              <Briefcase className="inline w-3.5 h-3.5 mr-1" /> Cabinet
            </label>
            <input type="text" value={CABINET_K2L} disabled
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm cursor-not-allowed" />
          </div>

          {/* Partenaire */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              <Building2 className="inline w-3.5 h-3.5 mr-1" /> Partenaire <span className="text-violet-400">*</span>
            </label>
            <select required value={partenaire}
              onChange={e => {
                setPartenaire(e.target.value);
                setAction('');
                setCustomAction('');
              }}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50">
              <option value="" className="bg-slate-900">Choisir un partenaire…</option>
              {partenaires.map(p => (
                <option key={p.id || p.name} value={p.name} className="bg-slate-900">{p.name}</option>
              ))}
              <option value={PARTENAIRE_AUTRE} className="bg-slate-900">{PARTENAIRE_AUTRE}</option>
            </select>
            {partenaire === PARTENAIRE_AUTRE && (
              <input type="text" value={customPartenaire} onChange={e => setCustomPartenaire(e.target.value)}
                placeholder="Nom du partenaire (ex. nouvelle banque)" required
                className="mt-2 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
            )}
            <p className="text-[10px] text-slate-500 mt-1">Vous pouvez changer de partenaire selon la mission</p>
          </div>

          {/* Action selon partenaire */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              <ListChecks className="inline w-3.5 h-3.5 mr-1" /> Action / Mission <span className="text-violet-400">*</span>
            </label>
            <select required value={action} onChange={e => setAction(e.target.value)}
              disabled={!partenaire && !customPartenaire}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-40">
              <option value="" className="bg-slate-900">
                {partenaire ? 'Choisir une action…' : 'Sélectionnez d’abord un partenaire'}
              </option>
              {actionOptions.map(a => (
                <option key={a} value={a} className="bg-slate-900">{a}</option>
              ))}
              <option value="Autre action" className="bg-slate-900">Autre action</option>
            </select>
            {action === 'Autre action' && (
              <input type="text" value={customAction} onChange={e => setCustomAction(e.target.value)}
                placeholder="Décrire l’action…" required
                className="mt-2 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
            )}
          </div>

          {needsSuperviseur && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                <Users className="inline w-3.5 h-3.5 mr-1" /> Superviseur <span className="text-violet-400">*</span>
              </label>
              <select required value={superviseurId} onChange={e => setSuperviseurId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50">
                <option value="" className="bg-slate-900">
                  {superviseurs.length === 0 ? 'Aucun superviseur — contactez le Manager' : 'Choisir votre superviseur…'}
                </option>
                {superviseurs.map(s => (
                  <option key={s.id} value={s.id} className="bg-slate-900">
                    {s.name || s.phone} {s.localite ? `(${s.localite})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 text-white font-semibold text-sm shadow-lg">
            {loading ? 'Enregistrement…' : 'Enregistrer le profil'}
          </button>
        </form>
      </div>
    </div>
  );
}
