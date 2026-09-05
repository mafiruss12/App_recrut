import { useState } from 'react';
import { ShieldCheck, Wifi, WifiOff, Database, FileSpreadsheet, User, LogOut, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { Commercial } from '../types';

interface HeaderProps {
  currentUser: Commercial | null;
  currentView: 'commercial' | 'manager';
  onSwitchView: (view: 'commercial' | 'manager') => void;
  onOpenAudit: () => void;
  onOpenGoogleSheets: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  isOnline: boolean;
  supabaseOk: boolean;
  sheetsOk: boolean;
  pendingQueueCount: number;
}

export function Header({
  currentUser,
  currentView,
  onSwitchView,
  onOpenAudit,
  onOpenGoogleSheets,
  onOpenLogin,
  onLogout,
  isOnline,
  supabaseOk,
  sheetsOk,
  pendingQueueCount,
}: HeaderProps) {
  return (
    <header className="relative z-20 backdrop-blur-xl bg-white/5 border-b border-white/10 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Title */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/25">
          K2
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white tracking-tight">K2L Recrutement</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              PWA Field
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Projet:</span>
            <span className="text-indigo-400 font-mono">wfeygwvvvyjomyahdgrc</span>
          </div>
        </div>
      </div>

      {/* Center Navigation Switcher */}
      <div className="flex items-center p-1 rounded-xl bg-slate-900/60 border border-white/10">
        <button
          id="btn-nav-commercial"
          onClick={() => onSwitchView('commercial')}
          className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            currentView === 'commercial'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Mode Commercial (Terrain)
        </button>
        <button
          id="btn-nav-manager"
          onClick={() => onSwitchView('manager')}
          className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            currentView === 'manager'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Tableau Manager / Boss
        </button>
      </div>

      {/* System Status Indicators & Actions */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Offline / Pending Queue Badge */}
        {pendingQueueCount > 0 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>{pendingQueueCount} en attente sync</span>
          </div>
        ) : null}

        {/* Network status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-green-400" />
              <span className="text-slate-300 hidden md:inline">En ligne</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300">Hors ligne</span>
            </>
          )}
        </div>

        {/* Supabase status */}
        <button
          onClick={onOpenAudit}
          title="Cliquez pour voir le statut Supabase et SQL"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition-colors"
        >
          <div className={`w-2 h-2 rounded-full ${supabaseOk ? 'bg-green-400 animate-pulse' : 'bg-emerald-400'}`} />
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden lg:inline">Supabase</span>
        </button>

        {/* Google Sheets status button */}
        <button
          id="btn-header-sheets"
          onClick={onOpenGoogleSheets}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition-colors"
        >
          <div className={`w-2 h-2 rounded-full ${sheetsOk ? 'bg-green-400' : 'bg-slate-500'}`} />
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden lg:inline">Google Sheets</span>
        </button>

        {/* Audit / Déploiement Button */}
        <button
          id="btn-open-audit-report"
          onClick={onOpenAudit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Ce qui a été fait / Reste</span>
        </button>

        {/* User Account / Login */}
        {currentUser ? (
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-xs font-semibold text-white leading-tight">
                {currentUser.name || 'Commercial'}
              </span>
              <span className="text-[10px] text-slate-400 leading-tight">
                {currentUser.cabinet || currentUser.phone}
              </span>
            </div>
            <button
              id="btn-logout"
              onClick={onLogout}
              title="Déconnexion"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-white/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            id="btn-open-login"
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
          >
            <User className="w-3.5 h-3.5" />
            <span>Connexion</span>
          </button>
        )}
      </div>
    </header>
  );
}
