import { useState, useMemo } from 'react';
import {
  Users,
  ShieldAlert,
  Calendar,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Search,
  ArrowUpDown,
  Building2,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  Trash2,
} from 'lucide-react';
import { ClientEntry, Commercial } from '../types';
import { storage } from '../lib/storage';
import { CommercialManagement } from './CommercialManagement';


interface ManagerDashboardProps {
  onRefresh: () => void;
  onOpenGoogleSheets: () => void;
  onOpenNewEntry: () => void;
}

export function ManagerDashboard({
  onRefresh,
  onOpenGoogleSheets,
  onOpenNewEntry,
}: ManagerDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommercial, setSelectedCommercial] = useState('ALL');
  const [selectedCabinet, setSelectedCabinet] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS'>('ALL');
  const [sortField, setSortField] = useState<'created_at' | 'client_phone' | 'commercial_name' | 'cabinet'>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const allClients = storage.getAllClients();
  const allCommerciaux = storage.getCommerciaux();
  const duplicatesAvoided = storage.getDuplicatesAvoidedCount();

  // Unique cabinets for filter
  const uniqueCabinets = useMemo(() => {
    const set = new Set<string>();
    allClients.forEach(c => {
      if (c.cabinet) set.add(c.cabinet);
    });
    return Array.from(set);
  }, [allClients]);

  // Unique commercials for filter
  const uniqueCommerciaux = useMemo(() => {
    const map = new Map<string, string>();
    allCommerciaux.forEach(c => map.set(c.id, c.name || c.phone));
    allClients.forEach(c => {
      if (c.commercial_id && !map.has(c.commercial_id)) {
        map.set(c.commercial_id, c.commercial_name);
      }
    });
    return Array.from(map.entries());
  }, [allCommerciaux, allClients]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return allClients.filter(client => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          client.client_phone.toLowerCase().includes(q) ||
          client.client_phone_clean.includes(q) ||
          (client.commercial_name && client.commercial_name.toLowerCase().includes(q)) ||
          (client.cabinet && client.cabinet.toLowerCase().includes(q)) ||
          (client.localite && client.localite.toLowerCase().includes(q)) ||
          (client.partenaire && client.partenaire.toLowerCase().includes(q)) ||
          (client.action && client.action.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Commercial filter
      if (selectedCommercial !== 'ALL') {
        if (client.commercial_id !== selectedCommercial && client.commercial_name !== selectedCommercial) {
          return false;
        }
      }

      // Cabinet filter
      if (selectedCabinet !== 'ALL') {
        if (client.cabinet !== selectedCabinet) return false;
      }

      // Date filter
      if (selectedDateFilter !== 'ALL') {
        const clientDate = new Date(client.created_at).getTime();
        const now = Date.now();
        if (selectedDateFilter === 'TODAY') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          if (clientDate < startOfToday.getTime()) return false;
        } else if (selectedDateFilter === '7DAYS') {
          if (now - clientDate > 7 * 86400000) return false;
        } else if (selectedDateFilter === '30DAYS') {
          if (now - clientDate > 30 * 86400000) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'client_phone') {
        comparison = a.client_phone_clean.localeCompare(b.client_phone_clean);
      } else if (sortField === 'commercial_name') {
        comparison = (a.commercial_name || '').localeCompare(b.commercial_name || '');
      } else if (sortField === 'cabinet') {
        comparison = (a.cabinet || '').localeCompare(b.cabinet || '');
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [allClients, searchQuery, selectedCommercial, selectedCabinet, selectedDateFilter, sortField, sortAsc]);

  // Statistics summaries
  const activeCommerciauxCount = useMemo(() => {
    return allCommerciaux.filter(c => c.is_active && c.role === 'commercial').length;
  }, [allCommerciaux]);

  const syncedRate = useMemo(() => {
    if (allClients.length === 0) return 100;
    const synced = allClients.filter(c => c.status === 'synced').length;
    return Math.round((synced / allClients.length) * 100);
  }, [allClients]);

  // Daily registrations breakdown for mini chart
  const dailyStats = useMemo(() => {
    const map = new Map<string, number>();
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      map.set(key, 0);
    }
    allClients.forEach(c => {
      const d = new Date(c.created_at);
      const key = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([day, count]) => ({ day, count }));
  }, [allClients]);

  // Commercial ranking breakdown
  const commercialRanking = useMemo(() => {
    const map = new Map<string, { name: string; cabinet: string; count: number }>();
    allClients.forEach(c => {
      const name = c.commercial_name || 'Inconnu';
      const existing = map.get(name) || { name, cabinet: c.cabinet || '', count: 0 };
      existing.count += 1;
      map.set(name, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allClients]);

  // Cabinet distribution
  const cabinetDistribution = useMemo(() => {
    const map = new Map<string, number>();
    allClients.forEach(c => {
      const cab = c.cabinet || 'Non défini';
      map.set(cab, (map.get(cab) || 0) + 1);
    });
    return Array.from(map.entries()).map(([cabinet, count]) => ({
      cabinet,
      count,
      pct: allClients.length > 0 ? Math.round((count / allClients.length) * 100) : 0,
    }));
  }, [allClients]);

  // Handlers for export
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const { exportToExcel } = await import('../lib/export');
      exportToExcel(filteredClients, `K2L_Recrutement_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    const { exportToCSV } = await import('../lib/export');
    exportToCSV(filteredClients, `K2L_Recrutement_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportPDF = async () => {
    const { exportToPDF } = await import('../lib/export');
    exportToPDF(filteredClients, 'Rapport Recrutement K2L - Direction');
  };

  // Trigger Google Sheets Webhook Sync
  const handleSyncToGoogleSheets = async () => {
    const settings = storage.getSettings();
    if (!settings.googleSheetsWebhookUrl) {
      onOpenGoogleSheets();
      return;
    }

    setSyncFeedback('Synchronisation en cours avec Google Sheets...');
    try {
      await storage.syncClientsToGoogleSheets(filteredClients);
      setSyncFeedback(`✓ ${filteredClients.length} clients envoyés avec succès à Google Sheets !`);
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err: any) {
      setSyncFeedback(`Erreur de synchronisation : ${err.message}`);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full z-10 flex flex-col gap-6">
      {/* Top Header Row with Export Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Tableau de Bord Recrutement K2L
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              Supervision Boss
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm">
            Vue temps réel similaire à Google Sheets • Contrôle des doublons & Extraction multi-formats
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            id="btn-export-excel"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel compatible (.csv)</span>
          </button>

          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>CSV</span>
          </button>

          <button
            id="btn-export-pdf"
            onClick={handleExportPDF}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-all"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>PDF</span>
          </button>

          <button
            id="btn-sync-sheets"
            onClick={handleSyncToGoogleSheets}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 text-xs font-semibold border border-emerald-500/40 flex items-center gap-1.5 transition-all"
          >
            <Send className="w-4 h-4 text-emerald-400" />
            <span>Sync Google Sheet</span>
          </button>

          <button
            id="btn-manager-new-entry"
            onClick={onOpenNewEntry}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Saisie</span>
          </button>
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="p-3 rounded-xl bg-indigo-900/40 border border-indigo-500/40 text-indigo-200 text-xs sm:text-sm flex items-center justify-between">
          <span>{syncFeedback}</span>
          <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-white ml-2">
            ×
          </button>
        </div>
      )}

      {/* 4 Primary Frosted Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="backdrop-blur-md bg-white/5 border border-white/10 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="text-slate-400 text-xs sm:text-sm mb-1">Total Clients Saisis</div>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white">{allClients.length}</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +{filteredClients.length} filtrés actuellement
          </div>
        </div>

        <div className="backdrop-blur-md bg-white/5 border border-white/10 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="text-slate-400 text-xs sm:text-sm mb-1">Doublons Évités</div>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-amber-400">{duplicatesAvoided}</div>
          <div className="text-[11px] text-amber-300/80 mt-1">Économie de temps terrain garantie</div>
        </div>

        <div className="backdrop-blur-md bg-white/5 border border-white/10 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="text-slate-400 text-xs sm:text-sm mb-1">Commerciaux Actifs</div>
            <Building2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white">{activeCommerciauxCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Sessions individuelles sécurisées</div>
        </div>

        <div className="backdrop-blur-md bg-white/5 border border-white/10 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="text-slate-400 text-xs sm:text-sm mb-1">Taux Synchronisation</div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400">{syncedRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Latence Supabase ~120ms</div>
        </div>
      </div>

      {/* Analytics & Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Registrations Bar chart preview */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col">
          <h3 className="font-bold text-white text-sm mb-3 flex items-center justify-between">
            <span>Saisies des 7 derniers jours</span>
            <span className="text-xs text-indigo-400 font-normal">Temps Réel</span>
          </h3>
          <div className="flex items-end justify-between gap-2 h-36 pt-4 pb-1">
            {dailyStats.map((item, idx) => {
              const max = Math.max(...dailyStats.map(d => d.count), 1);
              const heightPct = Math.max(12, Math.round((item.count / max) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-bold text-indigo-300">{item.count}</span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-indigo-700 to-indigo-500 transition-all"
                  />
                  <span className="text-[9px] text-slate-400 uppercase tracking-tighter truncate max-w-[36px]">
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Commerciaux Ranking */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col">
          <h3 className="font-bold text-white text-sm mb-3 flex items-center justify-between">
            <span>Classement Commerciaux</span>
            <span className="text-xs text-slate-400 font-normal">Clients saisis</span>
          </h3>
          <div className="space-y-2.5 overflow-y-auto max-h-36 pr-1">
            {commercialRanking.length === 0 ? (
              <p className="text-xs text-slate-400">Aucune donnée disponible</p>
            ) : (
              commercialRanking.map((comm, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-slate-300 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-semibold text-white block leading-tight">{comm.name}</span>
                      <span className="text-[10px] text-slate-400 leading-tight">{comm.cabinet}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold font-mono">
                    {comm.count} clients
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cabinets Distribution */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col">
          <h3 className="font-bold text-white text-sm mb-3 flex items-center justify-between">
            <span>Répartition par Cabinet</span>
            <span className="text-xs text-slate-400 font-normal">Parts</span>
          </h3>
          <div className="space-y-2.5 overflow-y-auto max-h-36 pr-1">
            {cabinetDistribution.map((cab, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span className="truncate max-w-[150px] font-medium">{cab.cabinet}</span>
                  <span className="text-slate-400">
                    {cab.count} ({cab.pct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    style={{ width: `${cab.pct}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Filter Bar (Date, Commercial, Cabinet, Search) */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            id="input-manager-search"
            placeholder="Rechercher client, commercial, cabinet, localité, action..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/60 border border-white/15 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Filter */}
          <select
            id="select-date-filter"
            value={selectedDateFilter}
            onChange={e => setSelectedDateFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900/70 border border-white/15 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Toutes les dates</option>
            <option value="TODAY">Aujourd'hui</option>
            <option value="7DAYS">7 derniers jours</option>
            <option value="30DAYS">30 derniers jours</option>
          </select>

          {/* Cabinet Filter */}
          <select
            id="select-cabinet-filter"
            value={selectedCabinet}
            onChange={e => setSelectedCabinet(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900/70 border border-white/15 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 max-w-[150px] truncate"
          >
            <option value="ALL">Tous les cabinets</option>
            {uniqueCabinets.map(cab => (
              <option key={cab} value={cab}>
                {cab}
              </option>
            ))}
          </select>

          {/* Commercial Filter */}
          <select
            id="select-commercial-filter"
            value={selectedCommercial}
            onChange={e => setSelectedCommercial(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900/70 border border-white/15 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 max-w-[150px] truncate"
          >
            <option value="ALL">Tous les commerciaux</option>
            {uniqueCommerciaux.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {(searchQuery || selectedCommercial !== 'ALL' || selectedCabinet !== 'ALL' || selectedDateFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCommercial('ALL');
                setSelectedCabinet('ALL');
                setSelectedDateFilter('ALL');
              }}
              className="px-2.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs border border-red-500/20 transition-colors"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Google Sheets-Style Live Data Table */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-base">Feuille des Recrutements (Google Sheets Style)</h3>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-xs font-mono">
              {filteredClients.length} lignes
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Cliquez sur un en-tête pour trier les données instantanément
          </span>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="text-slate-400 uppercase tracking-wider bg-slate-950/70 sticky top-0 z-20 border-b border-white/10 font-semibold">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">N°</th>
                <th
                  onClick={() => toggleSort('created_at')}
                  className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Date / Heure</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('client_phone')}
                  className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Téléphone Client</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('commercial_name')}
                  className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Commercial</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('cabinet')}
                  className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Cabinet</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="px-4 py-3.5">Localité</th>
                <th className="px-4 py-3.5">Partenaire</th>
                <th className="px-4 py-3.5">Action</th>
                <th className="px-4 py-3.5 text-center">Statut Synchro</th>
                <th className="px-4 py-3.5">Observations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-400">
                    <Search className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="text-sm font-medium">Aucun client ne correspond aux critères sélectionnés.</p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client, index) => (
                  <tr
                    key={client.id}
                    className="hover:bg-white/5 transition-colors group cursor-default"
                  >
                    <td className="px-4 py-3 text-slate-500 text-center font-mono">{index + 1}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {new Date(client.created_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                        {client.client_phone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-200 whitespace-nowrap font-medium">
                      {client.commercial_name}
                      <span className="block text-[10px] text-slate-400">{client.commercial_phone}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{client.cabinet}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{client.localite}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{client.partenaire}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300">{client.action}</span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
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
                            <ShieldAlert className="w-3 h-3" /> Échec
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" /> En attente
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-[180px] truncate">
                      {client.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <CommercialManagement organizationId={storage.getCurrentUser()?.organization_id} />
    </div>
  );
}
