import { Wifi, WifiOff, User, LogOut, ShieldCheck } from 'lucide-react';
import { Commercial } from '../types';

interface CommercialHeaderProps {
  currentUser: Commercial | null;
  onOpenProfile: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  isOnline: boolean;
  pendingQueueCount: number;
}

export function CommercialHeader({
  currentUser,
  onOpenProfile,
  onOpenLogin,
  onLogout,
  isOnline,
  pendingQueueCount,
}: CommercialHeaderProps) {
  return (
    <header className="relative z-20 backdrop-blur-xl bg-white/5 border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Brand & Field Mode Badge */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/25">
          K2
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white tracking-tight">K2L Recrutement</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Terrain
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Saisie rapide & contrôle doublons
          </div>
        </div>
      </div>

      {/* Status & User Actions */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Offline Queue Badge */}
        {pendingQueueCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>{pendingQueueCount} en attente sync</span>
          </div>
        )}

        {/* Network status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-green-400" />
              <span className="text-slate-300 hidden sm:inline">En ligne</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300">Hors ligne</span>
            </>
          )}
        </div>

        {/* User Account / Profile */}
        {currentUser ? (
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 transition-colors"
              title="Modifier mon profil"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <span className="font-semibold hidden sm:inline">
                {currentUser.name || currentUser.phone}
              </span>
            </button>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-xs transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all"
          >
            Se Connecter
          </button>
        )}
      </div>
    </header>
  );
}
