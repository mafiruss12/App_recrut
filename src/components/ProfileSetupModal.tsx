import { useState, useEffect, type FormEvent } from 'react';
import { User, Building2, MapPin, Briefcase, CheckCircle2 } from 'lucide-react';
import { Commercial } from '../types';
import { storage } from '../lib/storage';

interface ProfileSetupModalProps {
  isOpen: boolean;
  user: Commercial | null;
  onSave: (updatedUser: Commercial) => void;
}

export function ProfileSetupModal({ isOpen, user, onSave }: ProfileSetupModalProps) {
  const [name, setName] = useState('');
  const [localite, setLocalite] = useState('');
  const [cabinet, setCabinet] = useState('');
  const [partenaire, setPartenaire] = useState('Partenaire Orange');
  const [action, setAction] = useState('Prospection Terrain');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setLocalite(user.localite || '');
      setCabinet(user.cabinet || '');
      setPartenaire(user.partenaire || 'Partenaire Orange');
      setAction(user.action || 'Prospection Terrain');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cabinet.trim() || !localite.trim()) {
      setError('Veuillez remplir obligatoirement tous les champs requis.');
      return;
    }

    try {
      const updated = storage.updateProfile(user.id, {
        name: name.trim(),
        localite: localite.trim(),
        cabinet: cabinet.trim(),
        partenaire: partenaire.trim(),
        action: action.trim(),
      });
      onSave(updated);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la mise à jour du profil');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="backdrop-blur-2xl bg-slate-900/95 border border-white/15 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-600/30">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Profil Commercial Obligatoire</h2>
            <p className="text-xs text-slate-400">Renseignez vos informations pour activer vos saisies terrain</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Nom et Prénom du Commercial <span className="text-indigo-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ex: Mafi Russ"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Cabinet de Recrutement <span className="text-indigo-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ex: Cabinet Alpha, Buro Pro..."
                value={cabinet}
                onChange={e => setCabinet(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Localité / Ville / Commune <span className="text-indigo-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ex: Abidjan Plateau, Cocody..."
                value={localite}
                onChange={e => setLocalite(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Partenaire
              </label>
              <select
                value={partenaire}
                onChange={e => setPartenaire(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-white/15 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="Partenaire Orange">Partenaire Orange</option>
                <option value="Partenaire MTN">Partenaire MTN</option>
                <option value="Partenaire Moov">Partenaire Moov</option>
                <option value="Partenaire Wave">Partenaire Wave</option>
                <option value="Autre Partenaire">Autre Partenaire</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Type d'Action
              </label>
              <select
                value={action}
                onChange={e => setAction(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-white/15 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="Prospection Terrain">Prospection Terrain</option>
                <option value="Recrutement Direct">Recrutement Direct</option>
                <option value="Animation Stand">Animation Stand</option>
                <option value="Porte-à-porte">Porte-à-porte</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Valider et Accéder aux Saisies</span>
          </button>
        </form>
      </div>
    </div>
  );
}
