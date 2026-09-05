import { useState, useMemo, type FormEvent } from 'react';
import {
  Phone,
  UserCheck,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  RefreshCw,
  FileText,
  ShieldCheck,
  Building2,
  MapPin,
  Briefcase,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Commercial, ClientEntry, DuplicateCheckResult } from '../types';
import { storage, formatPhoneDisplay, normalizePhone } from '../lib/storage';

interface CommercialViewProps {
  currentUser: Commercial;
  onRefresh: () => void;
  onOpenProfile: () => void;
  isOnline: boolean;
  pendingCount: number;
}

export function CommercialView({
  currentUser,
  onRefresh,
  onOpenProfile,
  isOnline,
  pendingCount,
}: CommercialViewProps) {
  const [phoneInput, setPhoneInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<DuplicateCheckResult | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Live duplicate preview check while typing
  const liveDuplicateCheck = useMemo(() => {
    const clean = normalizePhone(phoneInput);
    if (clean.length >= 8) {
      return storage.checkDuplicate(clean);
    }
    return { isDuplicate: false };
  }, [phoneInput]);

  // Personal clients history
  const allClients = storage.getAllClients();
  const personalClients = useMemo(() => {
    return allClients.filter(
      c => c.commercial_id === currentUser.id || c.commercial_phone === currentUser.phone
    );
  }, [allClients, currentUser]);

  // Today count
  const todayCount = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return personalClients.filter(c => c.created_at.slice(0, 10) === todayStr).length;
  }, [personalClients]);

  // Filtered personal clients
  const filteredPersonalClients = useMemo(() => {
    if (!searchFilter.trim()) return personalClients;
    const q = searchFilter.toLowerCase();
    return personalClients.filter(
      c =>
        c.client_phone.toLowerCase().includes(q) ||
        c.client_phone_clean.includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q))
    );
  }, [personalClients, searchFilter]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;

    setIsSubmitting(true);
    setDuplicateAlert(null);
    setSuccessMessage(null);

    const res = await storage.addClient(phoneInput, currentUser, notesInput);
    setIsSubmitting(false);

    if (!res.success) {
      if (res.isDuplicate) {
        setDuplicateAlert({
          isDuplicate: true,
          message: res.message,
        });
      } else {
        alert(res.message || 'Erreur lors de la saisie');
      }
      return;
    }

    // Success
    setSuccessMessage(`Client ${formatPhoneDisplay(phoneInput)} enregistré avec succès !`);
    setPhoneInput('');
    setNotesInput('');
    onRefresh();

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  // Quick keypad add helper
  const handleKeypadPress = (val: string) => {
    setPhoneInput(prev => prev + val);
  };

  const handleBackspace = () => {
    setPhoneInput(prev => prev.slice(0, -1));
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full z-10 flex flex-col gap-6">
      {/* Commercial Profile Ribbon / Header Card */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-600/30">
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {currentUser.name || 'Commercial Terrain'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Session Active
              </span>
              {!isOnline && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Mode Hors Ligne
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-slate-400">
                <Phone className="w-3.5 h-3.5 text-indigo-400" />
                {currentUser.phone}
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                {currentUser.cabinet || 'Cabinet non défini'}
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                {currentUser.localite || 'Localité non définie'}
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                {currentUser.action || 'Saisie Terrain'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenProfile}
          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold border border-white/10 transition-colors self-end md:self-center"
        >
          Modifier mon profil
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="backdrop-blur-md bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl">
          <div className="text-slate-400 text-xs sm:text-sm font-medium mb-1">Total Mes Clients</div>
          <div className="text-2xl sm:text-3xl font-black text-white">{personalClients.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Clients enregistrés par vous</div>
        </div>

        <div className="backdrop-blur-md bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl">
          <div className="text-slate-400 text-xs sm:text-sm font-medium mb-1">Aujourd'hui</div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-400">{todayCount}</div>
          <div className="text-[11px] text-indigo-300/80 mt-1">Saisies de la journée</div>
        </div>

        <div className="backdrop-blur-md bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl">
          <div className="text-slate-400 text-xs sm:text-sm font-medium mb-1">En File d'Attente</div>
          <div className={`text-2xl sm:text-3xl font-black ${pendingCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            {pendingCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Synchro automatique dès connexion</div>
        </div>

        <div className="backdrop-blur-md bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl">
          <div className="text-slate-400 text-xs sm:text-sm font-medium mb-1">Statut Réseau</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isOnline ? 'Connecté' : 'Hors ligne'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Cache PWA actif</div>
        </div>
      </div>

      {/* Main Action Area: Client Entry + Real-time Duplicate Check */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Saisie d'un Client (Formulaire terrain optimisé) */}
        <div className="lg:col-span-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-7 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Saisie d'un Nouveau Client</h2>
                <p className="text-xs text-slate-400">1 seul numéro à la fois • Contrôle immédiat des doublons</p>
              </div>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
              Auto-Check
            </span>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-3 text-sm animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Duplicate Blocked Banner */}
          {duplicateAlert && duplicateAlert.isDuplicate && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 flex items-start gap-3 text-sm animate-shake">
              <AlertOctagon className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-red-300 font-bold mb-1">DOUBLON DÉTECTÉ ET BLOQUÉ !</strong>
                <p className="text-xs sm:text-sm text-red-200 leading-relaxed">{duplicateAlert.message}</p>
                <p className="text-[11px] text-red-300/80 mt-2">
                  Ce client ne sera pas enregistré deux fois afin de préserver l'intégrité de la base de données K2L.
                </p>
              </div>
            </div>
          )}

          {/* Live Typing Duplicate Warning */}
          {liveDuplicateCheck.isDuplicate && !duplicateAlert && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 flex items-center gap-2.5 text-xs">
              <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Attention :</strong> Ce numéro existe déjà dans l'historique !
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Numéro de téléphone du Client <span className="text-indigo-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  id="input-client-phone"
                  required
                  placeholder="ex: 07 08 09 10 11 ou +225..."
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-900/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 text-lg sm:text-xl font-mono tracking-wider"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Format libre : espaces, indicatif +225 ou 10 chiffres reconnus automatiquement.
              </p>
            </div>

            {/* Quick keypad dial buttons for field workers on mobile */}
            <div className="grid grid-cols-6 gap-1.5 pt-1">
              {['01', '05', '07', '+225', 'Effacer'].map(prefix => (
                <button
                  key={prefix}
                  type="button"
                  onClick={() => {
                    if (prefix === 'Effacer') {
                      handleBackspace();
                    } else {
                      setPhoneInput(prev => prev + (prev.length > 0 ? ' ' : '') + prefix);
                    }
                  }}
                  className={`py-1.5 rounded-lg text-xs font-medium border border-white/10 ${
                    prefix === 'Effacer'
                      ? 'col-span-2 bg-red-500/10 hover:bg-red-500/20 text-red-300'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  {prefix}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Note / Observation (facultatif)
              </label>
              <input
                type="text"
                id="input-client-notes"
                placeholder="ex: Intéressé par offre pro, rappeler à 16h..."
                value={notesInput}
                onChange={e => setNotesInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <button
              type="submit"
              id="btn-submit-client"
              disabled={isSubmitting || !phoneInput.trim()}
              className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Vérification du doublon...
                </>
              ) : (
                <>
                  <UserCheck className="w-5 h-5" />
                  Enregistrer et Contrôler le Doublon
                </>
              )}
            </button>
          </form>

          {/* Saisie info preview */}
          <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
            <div className="p-2 rounded-lg bg-white/5">
              <span className="block text-slate-500 text-[10px]">Cabinet</span>
              <span className="font-semibold text-slate-300 truncate block">{currentUser.cabinet || 'Non défini'}</span>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <span className="block text-slate-500 text-[10px]">Partenaire</span>
              <span className="font-semibold text-slate-300 truncate block">{currentUser.partenaire || 'Orange'}</span>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <span className="block text-slate-500 text-[10px]">Action</span>
              <span className="font-semibold text-slate-300 truncate block">{currentUser.action || 'Terrain'}</span>
            </div>
          </div>
        </div>

        {/* Historique Personnel du Commercial */}
        <div className="lg:col-span-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-7 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                Mon Historique Personnel
              </h2>
              <p className="text-xs text-slate-400">{personalClients.length} clients saisis par votre compte</p>
            </div>

            {/* Quick search */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher tél..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900/60 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* List of items */}
          <div className="flex-1 overflow-y-auto max-h-[460px] space-y-2.5 pr-1">
            {filteredPersonalClients.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                <p className="text-sm font-medium">Aucun client trouvé dans votre historique.</p>
                <p className="text-xs text-slate-500 mt-1">Utilisez le formulaire pour saisir votre premier client.</p>
              </div>
            ) : (
              filteredPersonalClients.map((client, idx) => (
                <div
                  key={client.id}
                  className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                      #{filteredPersonalClients.length - idx}
                    </div>
                    <div>
                      <div className="font-mono font-bold text-white text-base tracking-wide">
                        {client.client_phone}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                        <span>
                          {new Date(client.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>•</span>
                        <span>{client.cabinet}</span>
                        {client.notes && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-300 italic truncate max-w-[120px]">{client.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 ${
                        client.status === 'synced'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : client.status === 'failed'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                      title={client.sync_error || undefined}
                    >
                      {client.status === 'synced' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Synchro
                        </>
                      ) : client.status === 'failed' ? (
                        <>
                          <AlertOctagon className="w-3 h-3" /> Échec
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" /> En attente
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
