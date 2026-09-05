import { useState } from 'react';
import {
  ShieldCheck,
  Wifi,
  WifiOff,
  FileSpreadsheet,
  LogOut,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface BossHeaderProps {
  onOpenGoogleSheets: () => void;
  onLogout: () => void;
  onRefresh: () => void;
  isOnline: boolean;
  sheetsOk: boolean;
}

export function BossHeader({
  onOpenGoogleSheets,
  onLogout,
  onRefresh,
  isOnline,
  sheetsOk,
}: BossHeaderProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyCommercialLink = () => {
    const terrainUrl = window.location.origin + '/';
    navigator.clipboard.writeText(terrainUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenTerrain = () => {
    window.open('/', '_blank');
  };

  return (
    <header className="relative z-20 backdrop-blur-xl bg-slate-900/60 border-b border-white/10 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Executive Badge */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/25">
          K2
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white tracking-tight">K2L Direction</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              Boss / Manager
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Tableau de bord de pilotage & supervision globale
          </div>
        </div>
      </div>

      {/* Actions & Tools */}
      <div className="flex items-center flex-wrap gap-2.5">
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

        {/* Copy/Open Terrain Link for Boss */}
        <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-0.5">
          <button
            onClick={handleCopyCommercialLink}
            title="Copier le lien d'accès terrain à partager aux commerciaux"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/10 text-xs text-slate-300 transition-colors"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400 font-semibold">Lien Terrain Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                <span>Copier Lien Terrain</span>
              </>
            )}
          </button>
          <button
            onClick={handleOpenTerrain}
            title="Ouvrir le portail commercial terrain dans un nouvel onglet"
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Google Sheets Sync modal button */}
        <button
          onClick={onOpenGoogleSheets}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300 font-semibold transition-colors"
        >
          <div className={`w-2 h-2 rounded-full ${sheetsOk ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>Google Sheets</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          title="Actualiser les données"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Logout / Lock button */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-semibold transition-colors"
          title="Verrouiller la session Boss"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Verrouiller</span>
        </button>
      </div>
    </header>
  );
}
