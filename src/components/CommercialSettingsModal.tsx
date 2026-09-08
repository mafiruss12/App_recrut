import { Wifi, WifiOff, RefreshCw, Shield, Info } from 'lucide-react';
import { storage } from '../lib/storage';
import { PoweredBy } from './PoweredBy';
import { Commercial } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Commercial | null;
  isOnline: boolean;
  pendingCount: number;
  onSync: () => void;
}

export function CommercialSettingsModal({ isOpen, onClose, currentUser, isOnline, pendingCount, onSync }: Props) {
  if (!isOpen) return null;
  const settings = storage.getSettings();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="backdrop-blur-2xl bg-slate-900/95 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg w-8 h-8 rounded-full bg-white/5">✕</button>
        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Info className="w-5 h-5 text-violet-400" /> Paramètres
        </h2>
        <p className="text-xs text-slate-400 mb-5">Compte terrain · synchronisation · sécurité</p>

        <div className="space-y-3 text-sm">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between">
            <span className="text-slate-400">Réseau</span>
            <span className={isOnline ? 'text-emerald-400 flex items-center gap-1' : 'text-amber-400 flex items-center gap-1'}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
            <span className="text-slate-400">File d’attente sync</span>
            <span className="text-white font-semibold">{pendingCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between">
            <span className="text-slate-400">Blocage doublons</span>
            <span className="text-emerald-400">{settings.enableDuplicateStrictBlocking ? 'Actif' : 'Inactif'}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Shield className="w-4 h-4" /> Sécurité session
            </div>
            <p className="text-xs text-slate-300">Session limitée à 12 h · 1 appareil à la fois · code 5 chiffres personnel</p>
          </div>
          {currentUser && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400">
              Connecté : <span className="text-white">{currentUser.name || currentUser.phone}</span>
              {currentUser.partenaire ? <> · {currentUser.partenaire}</> : null}
            </div>
          )}
          <button
            type="button"
            onClick={() => { onSync(); }}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Forcer la synchronisation
          </button>
        </div>
        <div className="mt-6 pt-4 border-t border-white/10">
          <PoweredBy />
        </div>
      </div>
    </div>
  );
}
