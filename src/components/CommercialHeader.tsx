import { useState, useRef, useEffect } from 'react';
import { Wifi, WifiOff, User, LogOut, Menu, X, Home, ClipboardList, Settings } from 'lucide-react';
import { Commercial } from '../types';

interface CommercialHeaderProps {
  currentUser: Commercial | null;
  onOpenProfile: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  isOnline: boolean;
  pendingQueueCount: number;
  onGoHome?: () => void;
  onGoHistory?: () => void;
  onOpenSettings?: () => void;
}

export function CommercialHeader({
  currentUser,
  onOpenProfile,
  onOpenLogin,
  onLogout,
  isOnline,
  pendingQueueCount,
  onGoHome,
  onGoHistory,
  onOpenSettings,
}: CommercialHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="relative z-30 backdrop-blur-xl bg-white/5 border-b border-white/10 px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {currentUser && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white"
              aria-label="Menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl bg-slate-900 border border-white/15 shadow-2xl py-2 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onGoHome?.();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                >
                  <Home className="w-4 h-4" />
                  Principal (saisie)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onGoHistory?.();
                    document.getElementById('historique-saisies')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                >
                  <ClipboardList className="w-4 h-4" />
                  Mes saisies
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                >
                  <User className="w-4 h-4" />
                  Profil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSettings?.();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                >
                  <Settings className="w-4 h-4" />
                  Paramètres
                </button>
                <div className="my-1 border-t border-white/10" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg px-1.5 py-1 shadow-sm shrink-0">
          <img src="/logo-k2l.png" alt="K2L Services" className="h-8 sm:h-9 w-auto object-contain" />
        </div>
        <div className="min-w-0 hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight">K2L Services</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Terrain
            </span>
          </div>
          <div className="text-xs text-slate-400 truncate">Saisie rapide & contrôle doublons</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {pendingQueueCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="hidden sm:inline">{pendingQueueCount} sync</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          )}
        </div>

        {currentUser ? (
          <>
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-2 p-1.5 pr-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
              title="Profil"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <span className="hidden md:inline text-xs text-slate-200 font-medium max-w-[90px] truncate">
                {currentUser.name || currentUser.phone}
              </span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs"
          >
            Se connecter
          </button>
        )}
      </div>
    </header>
  );
}
