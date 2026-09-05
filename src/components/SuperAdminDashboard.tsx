import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Building2, LogOut, Plus, ShieldCheck, UserPlus, Users, X } from 'lucide-react';
import { storage } from '../lib/storage';
import { Commercial, Organization } from '../types';

interface SuperAdminDashboardProps {
  user: Commercial;
  onLogout: () => void;
}

export function SuperAdminDashboard({ user, onLogout }: SuperAdminDashboardProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [commercials, setCommercials] = useState<Commercial[]>([]);
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminName, setAdminName] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [orgs] = await Promise.all([storage.getOrganizations(), storage.refreshRemoteData()]);
      setOrganizations(orgs);
      setCommercials(storage.getCommerciaux());
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Chargement impossible.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const createOrg = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await storage.createOrganization(orgName);
      setOrgName('');
      setShowOrgForm(false);
      setNotice({ type: 'success', text: 'Organisation créée.' });
      await load();
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Création impossible.' });
    }
  };

  const createAdmin = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const result = await storage.provisionAdmin({ phone: adminPhone, name: adminName, organizationId: selectedOrg });
      setAdminPhone(''); setAdminName(''); setShowAdminForm(false);
      setNotice({ type: 'success', text: `Administrateur créé. Mot de passe temporaire : ${result.temporaryPassword}` });
      await load();
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Création impossible.' });
    }
  };

  return (
    <main className="relative z-10 flex-1 bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-cyan-400/15 text-cyan-300 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div><div><p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-bold">K2L Core</p><h1 className="font-black">Console Super Administrateur</h1></div></div>
        <button onClick={onLogout} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 flex gap-2 items-center"><LogOut className="w-4 h-4" />Quitter</button>
      </header>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        <div className="mb-8"><p className="text-sm text-slate-500">Bonjour {user.name || 'Super Administrateur'}</p><h2 className="mt-1 text-3xl font-black tracking-tight">Vue globale de la plateforme</h2></div>
        {notice && <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${notice.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{notice.text}<button className="float-right" onClick={() => setNotice(null)}><X className="w-4 h-4" /></button></div>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"><Metric icon={<Building2 />} label="Organisations" value={organizations.length} /><Metric icon={<Users />} label="Utilisateurs" value={commercials.length} /><Metric icon={<ShieldCheck />} label="Comptes actifs" value={commercials.filter(item => item.is_active).length} /></div>
        <div className="grid lg:grid-cols-2 gap-6">
          <section className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden"><div className="p-5 border-b border-slate-100 flex items-center justify-between"><div><h3 className="font-black">Organisations clientes</h3><p className="text-xs text-slate-500 mt-1">Chaque organisation possède son propre espace de données.</p></div><button onClick={() => setShowOrgForm(value => !value)} className="rounded-xl bg-indigo-600 text-white px-3 py-2 text-xs font-bold flex items-center gap-1"><Plus className="w-4 h-4" />Ajouter</button></div>{showOrgForm && <form onSubmit={createOrg} className="p-5 bg-slate-50 border-b border-slate-100 flex gap-2"><input required value={orgName} onChange={event => setOrgName(event.target.value)} placeholder="Nom de l’organisation" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" /><button className="rounded-xl bg-slate-950 text-white px-4 text-xs font-bold">Créer</button></form>}<div className="divide-y divide-slate-100">{loading ? <p className="p-6 text-sm text-slate-500">Chargement…</p> : organizations.length === 0 ? <p className="p-6 text-sm text-slate-500">Aucune organisation.</p> : organizations.map(org => <div key={org.id} className="p-4 flex items-center justify-between"><div><p className="font-bold">{org.name}</p><p className="text-xs text-slate-500">/{org.slug}</p></div><span className="text-[11px] font-bold text-emerald-600">{org.is_active ? 'Active' : 'Désactivée'}</span></div>)}</div></section>
          <section className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden"><div className="p-5 border-b border-slate-100 flex items-center justify-between"><div><h3 className="font-black">Administrateurs clients</h3><p className="text-xs text-slate-500 mt-1">Créez l’accès Boss d’une organisation.</p></div><button onClick={() => setShowAdminForm(value => !value)} className="rounded-xl bg-slate-950 text-white px-3 py-2 text-xs font-bold flex items-center gap-1"><UserPlus className="w-4 h-4" />Créer</button></div>{showAdminForm && <form onSubmit={createAdmin} className="p-5 bg-slate-50 border-b border-slate-100 space-y-2"><input required value={adminName} onChange={event => setAdminName(event.target.value)} placeholder="Nom du responsable" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" /><input required value={adminPhone} onChange={event => setAdminPhone(event.target.value)} placeholder="Téléphone" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" /><select required value={selectedOrg} onChange={event => setSelectedOrg(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Choisir une organisation</option>{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select><button className="w-full rounded-xl bg-indigo-600 text-white py-2.5 text-xs font-bold">Générer l’accès admin</button></form>}<div className="divide-y divide-slate-100">{commercials.filter(item => item.role === 'admin').map(admin => <div key={admin.id} className="p-4 flex items-center justify-between"><div><p className="font-bold">{admin.name || 'Administrateur'}</p><p className="text-xs text-slate-500">{admin.phone}</p></div><span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">ADMIN</span></div>)}{commercials.filter(item => item.role === 'admin').length === 0 && <p className="p-6 text-sm text-slate-500">Aucun administrateur client.</p>}</div></section>
        </div>
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) { return <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm"><div className="flex items-center justify-between text-slate-500 text-xs font-bold"><span>{label}</span><span className="text-indigo-600">{icon}</span></div><p className="mt-3 text-3xl font-black">{value}</p></div>; }
