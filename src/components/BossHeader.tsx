import { useState, useRef, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  FileSpreadsheet,
  LogOut,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Menu,
  X,
  LayoutDashboard,
  Users,
  User,
  Settings,
  Home,
  ShieldCheck,
} from 'lucide-react';
import { Commercial } from '../types';

export type BossSection = 'principal' | 'dashboard' | 'gestion' | 'profil' | 'parametres';

interface BossHeaderProps {
  currentUser?: Commercial | null;
  activeSection?: BossSection;
  onSectionChange?: (section: BossSection) => void;
  onOpenGoogleSheets: () => void;
  onOpenProfile?: () => void;
  onLogout: () => void;
  onRefresh: () => void;
  isOnline: boolean;
  sheetsOk: boolean;
}

const MENU_ITEMS: { id: BossSection; label: string; icon: typeof Home }[] = [
  { id: 'principal', label: 'Principal', icon: Home },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'gestion', label: 'Gestion', icon: Users },
  { id: 'profil', label: 'Profil', icon: User },
  { id: 'parametres', label: 'Paramètres', icon: Settings },
];

export function BossHeader({
  currentUser,
  activeSection = 'dashboard',
  onSectionChange,
  onOpenGoogleSheets,
  onOpenProfile,
  onLogout,
  onRefresh,
  isOnline,
  sheetsOk,
}: BossHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleCopyCommercialLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <header className="relative z-30 backdrop-blur-xl bg-slate-900/70 border-b border-white/10 px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
      {/* Left: hamburger + brand */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {menuOpen && (
            <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl bg-slate-900 border border-white/15 shadow-2xl shadow-black/50 py-2 z-50">
              {MENU_ITEMS.map(item => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSectionChange?.(item.id);
                      setMenuOpen(false);
                      if (item.id === 'profil') onOpenProfile?.();
                      if (item.id === 'parametres') onOpenGoogleSheets();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      active
                        ? 'bg-violet-600/30 text-violet-200'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
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

        <div className="bg-white rounded-lg px-1.5 py-1 shadow-sm shrink-0 hidden xs:block sm:block">
          <img src="/logo-k2l.png" alt="K2L" className="h-8 w-auto object-contain" />
        </div>
        <div className="min-w-0 hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight truncate">K2L Direction</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {currentUser?.role || 'Manager'}
            </span>
          </div>
        </div>
      </div>

      {/* Right: status + profile + logout */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-green-400" />
              <span className="text-slate-300">En ligne</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300">Hors ligne</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopyCommercialLink}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedLink ? 'Copié' : 'Lien terrain'}</span>
        </button>

        <button
          type="button"
          onClick={() => window.open('/', '_blank')}
          className="hidden sm:flex p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white"
          title="Espace commercial"
        >
          <ExternalLink className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenGoogleSheets}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300"
        >
          <span className={`w-2 h-2 rounded-full ${sheetsOk ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          <FileSpreadsheet className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onRefresh}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
          title="Actualiser"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Profile icon */}
        <button
          type="button"
          onClick={() => {
            onSectionChange?.('profil');
            onOpenProfile?.();
          }}
          className="flex items-center gap-2 p-1.5 pr-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          title="Profil"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <span className="hidden md:inline text-xs text-slate-200 font-medium max-w-[100px] truncate">
            {currentUser?.name || 'Profil'}
          </span>
        </button>

        {/* Logout icon top right */}
        <button
          type="button"
          onClick={onLogout}
          className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition-colors"
          title="Déconnexion"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
