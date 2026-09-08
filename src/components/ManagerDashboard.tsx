import { useState, useMemo, useEffect } from 'react';
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
import { ClientEntry, Commercial, canManageAccounts, canSeeAllClients } from '../types';
import { storage } from '../lib/storage';
import { exportToExcel, exportToCSV, exportToPDF } from '../lib/export';
import { UserManagement } from './UserManagement';
import { PartnerManagement } from './PartnerManagement';

interface ManagerDashboardProps {
  currentUser: Commercial;
  activeSection?: 'principal' | 'dashboard' | 'gestion' | 'profil' | 'parametres';
  onRefresh: () => void;
  onOpenGoogleSheets: () => void;
  onOpenNewEntry: () => void;
}

export function ManagerDashboard({
  currentUser,
  activeSection = 'dashboard',
  onRefresh,
  onOpenGoogleSheets,
  onOpenNewEntry,
}: ManagerDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommercial, setSelectedCommercial] = useState('ALL');
  const [selectedCabinet, setSelectedCabinet] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'CUSTOM'>('ALL');
  const [customDate, setCustomDate] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'client_phone' | 'commercial_name' | 'cabinet'>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const [allClients, setAllClients] = useState<any[]>([]);
  const [allCommerciaux, setAllCommerciaux] = useState<any[]>([]);
  const [duplicatesAvoided, setDuplicatesAvoided] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      try {
        const [clients, stats, users] = await Promise.all([
          storage.getClientsForUser(currentUser),
          storage.getStats(),
          storage.getAllUsers(),
        ]);
        if (!cancelled) {
          setAllClients(clients);
          setDuplicatesAvoided(stats.duplicatesAvoided || 0);
          setAllCommerciaux(users.filter(u => u.is_active));
          if (typeof (stats as any).latencyMs === 'number') {
            (window as any).__k2lLatency = (stats as any).latencyMs;
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser.id, currentUser.role]);

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

      // Date filter (période inclusive YYYY-MM-DD en local)
      if (selectedDateFilter !== 'ALL') {
        const d = new Date(client.created_at);
        const clientDay = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        if (selectedDateFilter === 'TODAY') {
          if (clientDay !== today) return false;
        } else if (selectedDateFilter === '7DAYS') {
          const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
          const fromStr = `${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,'0')}-${String(from.getDate()).padStart(2,'0')}`;
          if (clientDay < fromStr || clientDay > today) return false;
        } else if (selectedDateFilter === '30DAYS') {
          const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
          const fromStr = `${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,'0')}-${String(from.getDate()).padStart(2,'0')}`;
          if (clientDay < fromStr || clientDay > today) return false;
        } else if (selectedDateFilter === 'CUSTOM') {
          const from = customDate || '0000-01-01';
          const to = customDateEnd || customDate || '9999-12-31';
          if (clientDay < from || clientDay > to) return false;
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
  }, [allClients, searchQuery, selectedCommercial, selectedCabinet, selectedDateFilter, customDate, customDateEnd, sortField, sortAsc]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCommercial, selectedCabinet, selectedDateFilter, customDate, customDateEnd]);

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
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      exportToExcel(filteredClients, `K2L_Recrutement_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    exportToCSV(filteredClients, `K2L_Recrutement_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportPDF = () => {
    exportToPDF(filteredClients, 'Rapport Recrutement K2L - Direction');
  };

  // Google Sheets via proxy serveur (feedback HTTP réel)
  const handleSyncToGoogleSheets = async () => {
    const settings = storage.getSettings();
    if (!settings.googleSheetsWebhookUrl) {
      onOpenGoogleSheets();
      return;
    }

    setSyncFeedback('Synchronisation en cours avec Google Sheets...');
    try {
      const r = await fetch('/api/sheets-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: settings.googleSheetsWebhookUrl,
          payload: filteredClients,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (r.ok && body.ok) {
        setSyncFeedback(`✓ ${filteredClients.length} fiche(s) envoyée(s) à Google Sheets.`);
      } else if (r.status === 404) {
        // Fallback direct si API absente
        await fetch(settings.googleSheetsWebhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filteredClients),
        });
        setSyncFeedback(`Envoi lancé (${filteredClients.length} fiches) — vérifiez la feuille Google.`);
      } else {
        setSyncFeedback(`Erreur Sheets : ${body.message || r.status}`);
      }
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err: any) {
      setSyncFeedback(`Erreur de synchronisation : ${err.message || 'réseau'}`);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pagedClients = filteredClients.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

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
      {/* Section title */}
      <div className="pt-1">
        <h2 className="text-lg font-bold text-white">
          {activeSection === 'gestion' ? 'Gestion' :
           activeSection === 'principal' ? 'Vue principale' :
           activeSection === 'parametres' ? 'Paramètres' :
           'Dashboard recrutement'}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {currentUser.name} · {currentUser.role}
        </p>
      </div>

      {/* ========== GESTION ========== */}
      {activeSection === 'gestion' && (
        <>
          {/* Historique par période */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-600/15 to-indigo-600/10 border border-violet-500/25">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-violet-300" />
              <span className="text-sm font-semibold text-white">Historique par période</span>
              <span className="text-[11px] text-slate-400">De telle date à telle date</span>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Du</label>
                <input
                  type="date"
                  value={customDate}
                  onChange={e => {
                    setCustomDate(e.target.value);
                    setSelectedDateFilter('CUSTOM');
                    if (customDateEnd && e.target.value && customDateEnd < e.target.value) {
                      setCustomDateEnd(e.target.value);
                    }
                  }}
                  className="px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/20 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 min-w-[150px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Au</label>
                <input
                  type="date"
                  value={customDateEnd}
                  min={customDate || undefined}
                  onChange={e => {
                    setCustomDateEnd(e.target.value);
                    setSelectedDateFilter('CUSTOM');
                  }}
                  className="px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/20 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 min-w-[150px]"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!customDate) {
                    const n = new Date();
                    const t0 = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
                    setCustomDate(t0);
                    setCustomDateEnd(t0);
                  }
                  setSelectedDateFilter('CUSTOM');
                }}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold"
              >
                Appliquer
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomDate('');
                  setCustomDateEnd('');
                  setSelectedDateFilter('ALL');
                }}
                className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-300 text-sm"
              >
                Réinitialiser
              </button>
              <div className="flex flex-wrap gap-1.5 ml-auto">
                {([
                  { id: 'TODAY' as const, label: "Aujourd'hui" },
                  { id: '7DAYS' as const, label: '7 jours' },
                  { id: '30DAYS' as const, label: '30 jours' },
                  { id: 'ALL' as const, label: 'Tout' },
                ]).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedDateFilter(p.id);
                      setCustomDate('');
                      setCustomDateEnd('');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${
                      selectedDateFilter === p.id
                        ? 'bg-violet-600 border-violet-500 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {selectedDateFilter === 'CUSTOM' && customDate && (
              <p className="mt-3 text-xs text-violet-200">
                Période : <strong>{customDate}</strong>
                {customDateEnd && customDateEnd !== customDate ? <> → <strong>{customDateEnd}</strong></> : ' (journée)'}
                {' '}· {filteredClients.length} fiche{filteredClients.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Répartition par cabinet */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 p-5 rounded-2xl">
            <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-violet-400" />
              Répartition par Cabinet
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cabinetDistribution.length === 0 ? (
                <p className="text-xs text-slate-400">Aucune donnée</p>
              ) : (
                cabinetDistribution.map((cab, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/5">
                    <span className="text-slate-200 font-medium truncate">{cab.cabinet}</span>
                    <span className="text-violet-300 font-bold">{cab.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Filtres + exports rapides */}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleExportExcel} className="px-3 py-2 rounded-xl bg-white/10 text-xs text-slate-200 border border-white/10 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Excel
            </button>
            <button type="button" onClick={handleExportCSV} className="px-3 py-2 rounded-xl bg-white/10 text-xs text-slate-200 border border-white/10">CSV</button>
            <button type="button" onClick={handleExportPDF} className="px-3 py-2 rounded-xl bg-white/10 text-xs text-slate-200 border border-white/10">PDF</button>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/70 border border-white/15 text-xs text-white"
              />
            </div>
            <select value={selectedCommercial} onChange={e => setSelectedCommercial(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900/70 border border-white/15 text-xs text-slate-200">
              <option value="ALL">Tous les commerciaux</option>
              {uniqueCommerciaux.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          {/* Feuille des recrutements */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-bold text-white text-base">Feuille des Recrutements</h3>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-xs font-mono">{filteredClients.length} lignes</span>
            </div>
            <div className="overflow-x-auto min-h-[280px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="text-slate-400 uppercase tracking-wider bg-slate-950/70 sticky top-0 z-20 border-b border-white/10 font-semibold">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">N°</th>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort('created_at')}>Date</th>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort('client_phone')}>Téléphone</th>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort('commercial_name')}>Commercial</th>
                    <th className="px-4 py-3">Cabinet</th>
                    <th className="px-4 py-3">Localité</th>
                    <th className="px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredClients.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Aucune fiche pour cette période</td></tr>
                  ) : (
                    pagedClients.map((client, index) => (
                      <tr key={client.id || index} className="hover:bg-white/[0.03]">
                        <td className="px-4 py-3 text-center text-slate-500">{(pageSafe - 1) * PAGE_SIZE + index + 1}</td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                          {new Date(client.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-white font-medium">{client.client_phone}</td>
                        <td className="px-4 py-3 text-slate-300">{client.commercial_name}</td>
                        <td className="px-4 py-3 text-slate-300">{client.cabinet}</td>
                        <td className="px-4 py-3 text-slate-300">{client.localite}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            client.status === 'synced' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {client.status === 'synced' ? 'Synchro' : 'En attente'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredClients.length > PAGE_SIZE && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-white/10 text-sm text-slate-400">
                <span>
                  Page {pageSafe}/{totalPages} · {filteredClients.length} fiche(s)
                  {allClients.length >= 20000 ? ' (plafond chargé)' : ''}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40"
                    disabled={pageSafe <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40"
                    disabled={pageSafe >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Gestion des comptes */}
          {canManageAccounts(currentUser.role) && (
            <div className="border-t border-white/10 pt-6 space-y-10">
              <UserManagement currentUser={currentUser} onRefresh={onRefresh} />
              <PartnerManagement />
            </div>
          )}
        </>
      )}

      {/* ========== DASHBOARD / PRINCIPAL ========== */}
      {(activeSection === 'dashboard' || activeSection === 'principal') && (
        <>
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
            <span>Excel (.xlsx)</span>
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
          <div className="text-[11px] text-slate-400 mt-1">Connexion Supabase active</div>
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


        </>
      )}

      {/* Paramètres */}
      {activeSection === 'parametres' && (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-5">
          <h3 className="text-white font-bold text-lg">Paramètres Direction</h3>
          <p className="text-sm text-slate-400">Synchronisation, exports et options de sécurité applicative.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onOpenGoogleSheets}
              className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Google Sheets
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold flex items-center gap-2 border border-white/10"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser les données
            </button>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/50 border border-white/10 text-xs text-slate-400 space-y-2">
            <p><span className="text-slate-300 font-semibold">Sécurité :</span> sessions 12 h, codes 5 chiffres hachés, verrouillage multi-appareils.</p>
            <p><span className="text-slate-300 font-semibold">Doublons :</span> blocage strict activé — chaque tentative est journalisée.</p>
            <p><span className="text-slate-300 font-semibold">Éditeur :</span> Powered by KEVIN TECH PRO</p>
          </div>
        </div>
      )}
    </div>
  );
}
