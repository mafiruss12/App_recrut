import { useState, useEffect, type FormEvent } from 'react';
import { UserPlus, Shield, UserX, RefreshCw, Users } from 'lucide-react';
import { Commercial, UserRole } from '../types';
import { storage } from '../lib/storage';
import { LOCALITES_CI } from '../lib/localites-ci';

interface UserManagementProps {
  currentUser: Commercial;
  onRefresh?: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  commercial: 'Commercial',
  superviseur: 'Superviseur',
  manager: 'Manager',
  admin: 'Admin',
};

export function UserManagement({ currentUser, onRefresh }: UserManagementProps) {
  const [users, setUsers] = useState<Commercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newCodeShown, setNewCodeShown] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('superviseur');
  const [localite, setLocalite] = useState('');

  const load = async () => {
    setLoading(true);
    const list = await storage.getAllUsers();
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const res = await storage.createUser({
      phone,
      email: email.trim() || undefined,
      code: code.trim() || undefined,
      name,
      role,
      localite,
    });
    if (!res.success) {
      setError(res.error || 'Erreur');
      return;
    }
    setSuccess(`Compte ${ROLE_LABELS[role]} créé : ${name}`);
    if (res.generatedCode) setNewCodeShown(res.generatedCode);
    setPhone('');
    setEmail('');
    setCode('');
    setName('');
    setLocalite('');
    setShowForm(false);
    await load();
    onRefresh?.();
  };

  const handleRegenerateCode = async (userId: string, userName: string) => {
    if (!confirm(`Régénérer le code d'accès de ${userName || 'cet utilisateur'} ? L'ancien code ne fonctionnera plus.`)) return;
    const res = await storage.regenerateUserCode(userId);
    if (!res.success) {
      setError(res.error || 'Erreur');
      return;
    }
    setNewCodeShown(res.generatedCode || null);
    setSuccess(`Nouveau code généré pour ${userName || 'utilisateur'}`);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const res = await storage.updateUserRole(userId, newRole);
    if (!res.success) alert(res.error);
    else await load();
  };

  const handleToggleActive = async (user: Commercial) => {
    const res = await storage.setUserActive(user.id, !user.is_active);
    if (!res.success) alert(res.error);
    else await load();
  };

  const handleResetSession = async (userId: string) => {
    const res = await storage.resetUserSession(userId);
    if (!res.success) alert(res.error);
    else {
      setSuccess('Session réinitialisée');
      await load();
    }
  };

  const canManage = currentUser.role === 'manager' || currentUser.role === 'admin';
  if (!canManage) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-400" />
          Gestion des comptes
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => load()}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Nouveau compte
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-xs">{error}</div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs">{success}</div>
      )}
      {newCodeShown && (
        <div className="p-4 rounded-xl bg-violet-500/15 border border-violet-500/30 text-center">
          <p className="text-xs text-violet-300 mb-1">Code d'accès (5 chiffres) — à communiquer une seule fois</p>
          <p className="text-2xl font-black tracking-[0.3em] text-white font-mono select-all">{newCodeShown}</p>
          <button type="button" onClick={() => setNewCodeShown(null)} className="mt-2 text-[11px] text-slate-400 hover:text-white">Masquer</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <p className="text-sm font-semibold text-white">Créer un compte</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nom complet"
              className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
            />
            <input
              required
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Téléphone"
              className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
            />
            {(role === 'superviseur' || role === 'manager' || role === 'admin') && (
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="E-mail (connexion Direction)"
                className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm sm:col-span-2"
              />
            )}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{5}"
              maxLength={5}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="Code 5 chiffres (vide = auto)"
              className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
            >
              <option value="commercial" className="bg-slate-900">Commercial</option>
              <option value="superviseur" className="bg-slate-900">Superviseur</option>
              <option value="manager" className="bg-slate-900">Manager</option>
              {currentUser.role === 'admin' && (
                <option value="admin" className="bg-slate-900">Admin</option>
              )}
            </select>
            <select
              value={localite}
              onChange={e => setLocalite(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm sm:col-span-2"
            >
              <option value="" className="bg-slate-900">Localité (optionnel)</option>
              {LOCALITES_CI.map(l => (
                <option key={l} value={l} className="bg-slate-900">{l}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium"
          >
            Créer le compte
          </button>
        </form>
      )}

      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Nom</th>
                <th className="text-left px-4 py-3">Téléphone</th>
                <th className="text-left px-4 py-3">Rôle</th>
                <th className="text-left px-4 py-3">Localité</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Chargement…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Aucun compte
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-white font-medium">{u.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-300">
                      <div>{u.phone}</div>
                      {u.email && <div className="text-[10px] text-violet-300">{u.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={u.id === currentUser.id}
                        onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                      >
                        {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                          <option key={r} value={r} className="bg-slate-900" disabled={r === 'admin' && currentUser.role !== 'admin'}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{u.localite || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          u.is_active
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {u.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {u.id !== currentUser.id && (
                        <>
                          <button
                            type="button"
                            title={u.is_active ? 'Désactiver' : 'Activer'}
                            onClick={() => handleToggleActive(u)}
                            className="inline-flex p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Réinitialiser session"
                            onClick={() => handleResetSession(u.id)}
                            className="inline-flex p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Régénérer code 5 chiffres"
                            onClick={() => handleRegenerateCode(u.id, u.name)}
                            className="inline-flex px-2 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 text-[10px] font-semibold"
                          >
                            Code
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
