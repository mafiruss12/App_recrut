import { ClientEntry, Commercial, DuplicateCheckResult, AppSettings, UserRole } from '../types';
import { supabase, checkSupabaseConnection, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import { CABINET_K2L } from './localites-ci';
import { PARTENAIRES_DEFAUT, type PartenaireDef } from './partenaires-k2l';

const STORAGE_KEYS = {
  OFFLINE_QUEUE: 'k2l_offline_queue_v2',
  CURRENT_USER: 'k2l_current_user_v2',
  SETTINGS: 'k2l_settings_v2',
  SESSION_TOKEN: 'k2l_session_token_v2',
};

export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let clean = rawPhone.replace(/[^0-9]/g, '');
  if (clean.startsWith('00225')) clean = clean.substring(5);
  else if (clean.startsWith('225') && clean.length > 8) clean = clean.substring(3);
  return clean;
}

export function formatPhoneDisplay(rawPhone: string): string {
  const clean = normalizePhone(rawPhone);
  if (!clean) return rawPhone;
  if (clean.length === 10) {
    return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 8)} ${clean.slice(8, 10)}`;
  }
  return clean.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

export async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode('k2l-salt-v1:' + code.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Code d'accès personnel : exactement 5 chiffres */
export function generateFiveDigitCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

export function isValidAccessCode(code: string): boolean {
  return /^\d{5}$/.test(code.trim());
}

export const DEFAULT_SETTINGS: AppSettings = {
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  googleSheetsWebhookUrl: '',
  autoSyncGoogleSheets: true,
  enableDuplicateStrictBlocking: true,
};

function mapUser(row: any): Commercial {
  return {
    id: row.id,
    phone: row.phone,
    email: row.email || null,
    name: row.name || '',
    localite: row.localite || '',
    cabinet: row.cabinet || CABINET_K2L,
    partenaire: row.partenaire || '',
    action: row.action || '',
    role: (row.role as UserRole) || 'commercial',
    is_active: row.is_active !== false,
    created_at: row.created_at,
    last_active_at: row.last_active_at,
    session_token: row.session_token,
    profile_completed: !!row.profile_completed,
    superviseur_id: row.superviseur_id || null,
    superviseur_name: row.superviseur_name || null,
  };
}

export class StorageService {
  private static instance: StorageService;

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.syncOfflineQueue());
      ['k2l_commerciaux_v1', 'k2l_clients_v1', 'k2l_boss_session_v2', 'k2l_boss_session_v1'].forEach(k => {
        try { localStorage.removeItem(k); } catch {}
      });
    }
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) StorageService.instance = new StorageService();
    return StorageService.instance;
  }

  public getSettings(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public saveSettings(settings: Partial<AppSettings>): AppSettings {
    const updated = { ...this.getSettings(), ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  }

  public getCurrentUser(): Commercial | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public setCurrentUser(user: Commercial | null) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
    } else {
      const safe = { ...user };
      delete (safe as any).code;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(safe));
      if (user.session_token) localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, user.session_token);
    }
  }

  /** Login unifié : commercial, superviseur, manager, admin */
  public async login(
    identifier: string,
    code: string,
    forceTakeover = false
  ): Promise<{
    success: boolean;
    user?: Commercial;
    error?: string;
    requiresProfile?: boolean;
    sessionLocked?: boolean;
  }> {
    const raw = (identifier || '').trim();
    const cleanCode = code.trim();
    const looksLikeEmail = raw.includes('@');
    const cleanPhone = looksLikeEmail ? '' : normalizePhone(raw);
    const cleanEmail = looksLikeEmail ? raw.toLowerCase() : '';

    if (looksLikeEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { success: false, error: 'Adresse e-mail invalide.' };
      }
    } else if (!cleanPhone || cleanPhone.length < 8) {
      return { success: false, error: 'Numéro de téléphone ou e-mail invalide.' };
    }
    if (!isValidAccessCode(cleanCode)) {
      return { success: false, error: 'Le code d’accès doit contenir exactement 5 chiffres.' };
    }

    const codeHash = await hashCode(cleanCode);

    let existing: any = null;
    let fetchErr: any = null;
    if (looksLikeEmail) {
      const res = await supabase
        .from('commerciaux')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();
      existing = res.data;
      fetchErr = res.error;
    } else {
      const res = await supabase
        .from('commerciaux')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();
      existing = res.data;
      fetchErr = res.error;
    }

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      const cached = this.getCurrentUser();
      if (cached && normalizePhone(cached.phone) === cleanPhone) {
        return { success: true, user: cached, requiresProfile: !cached.profile_completed };
      }
      return { success: false, error: 'Impossible de joindre le serveur. Vérifiez votre connexion.' };
    }

    // Compte inexistant
    if (!existing) {
      return {
        success: false,
        error: looksLikeEmail
          ? 'Aucun compte pour cet e-mail. Contactez un Manager pour créer votre accès Direction.'
          : 'Aucun compte pour ce numéro. Utilisez « S’inscrire » pour obtenir un code à 5 chiffres.',
      };
    }

    // E-mail réservé aux rôles Direction (superviseur / manager / admin)
    if (looksLikeEmail) {
      const role = (existing.role || 'commercial') as string;
      if (role === 'commercial') {
        return {
          success: false,
          error: 'La connexion par e-mail est réservée aux Superviseurs, Managers et Admins.',
        };
      }
    }

    if (existing.code_hash !== codeHash) {
      return { success: false, error: 'Code personnel incorrect pour ce numéro.' };
    }
    if (!existing.is_active) {
      return { success: false, error: 'Ce compte a été désactivé. Contactez la Direction.' };
    }

    const now = Date.now();
    const expiresAt = existing.session_expires_at ? new Date(existing.session_expires_at).getTime() : 0;
    const hasActiveSession = existing.session_token && expiresAt > now;

    if (hasActiveSession && !forceTakeover) {
      return {
        success: false,
        sessionLocked: true,
        error: 'Une session est déjà active sur un autre appareil.',
      };
    }

    const sessionToken = 'tok-' + crypto.randomUUID();
    const newExpires = new Date(Date.now() + 12 * 3600 * 1000).toISOString();

    await supabase
      .from('commerciaux')
      .update({
        session_token: sessionToken,
        session_expires_at: newExpires,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    let superviseurName = existing.superviseur_name || null;
    if (existing.superviseur_id && !superviseurName) {
      const { data: sup } = await supabase
        .from('commerciaux')
        .select('name')
        .eq('id', existing.superviseur_id)
        .maybeSingle();
      if (sup) superviseurName = sup.name;
    }

    const user = mapUser({
      ...existing,
      session_token: sessionToken,
      last_active_at: new Date().toISOString(),
      superviseur_name: superviseurName,
    });
    this.setCurrentUser(user);

    const requiresProfile =
      !existing.profile_completed ||
      !existing.name ||
      !existing.localite ||
      (existing.role === 'commercial' && !existing.superviseur_id);

    return { success: true, user, requiresProfile };
  }

  public async updateProfile(
    userId: string,
    updates: {
      name: string;
      localite: string;
      partenaire?: string;
      action?: string;
      superviseur_id?: string | null;
      superviseur_name?: string | null;
    }
  ): Promise<Commercial> {
    const payload: any = {
      name: updates.name,
      localite: updates.localite,
      cabinet: CABINET_K2L,
      partenaire: updates.partenaire || '',
      action: updates.action || '',
      profile_completed: true,
      last_active_at: new Date().toISOString(),
    };
    if (updates.superviseur_id !== undefined) {
      payload.superviseur_id = updates.superviseur_id;
    }

    const { data, error } = await supabase
      .from('commerciaux')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    let superviseurName = updates.superviseur_name || null;
    if (data.superviseur_id && !superviseurName) {
      const { data: sup } = await supabase
        .from('commerciaux')
        .select('name')
        .eq('id', data.superviseur_id)
        .maybeSingle();
      if (sup) superviseurName = sup.name;
    }

    const user = mapUser({ ...data, superviseur_name: superviseurName });
    this.setCurrentUser(user);
    return user;
  }

  public async logoutCommercial() {
    const user = this.getCurrentUser();
    if (user?.id) {
      try {
        await supabase
          .from('commerciaux')
          .update({ session_token: null, session_expires_at: null })
          .eq('id', user.id);
      } catch {}
    }
    this.setCurrentUser(null);
  }

  /** Liste des superviseurs actifs (pour le select profil commercial) */
  public async getSuperviseurs(): Promise<Commercial[]> {
    const { data, error } = await supabase
      .from('commerciaux')
      .select('*')
      .eq('role', 'superviseur')
      .eq('is_active', true)
      .order('name');
    if (error) return [];
    return (data || []).map(mapUser);
  }

  /** Tous les utilisateurs (manager / admin) */
  public async getAllUsers(): Promise<Commercial[]> {
    const { data, error } = await supabase
      .from('commerciaux')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(mapUser);
  }

  /** Création de compte par Manager/Admin */
  public async createUser(params: {
    phone: string;
    email?: string;
    code?: string;
    name: string;
    role: UserRole;
    localite?: string;
  }): Promise<{ success: boolean; user?: Commercial; error?: string; generatedCode?: string }> {
    const cleanPhone = normalizePhone(params.phone);
    if (!cleanPhone || cleanPhone.length < 8) {
      return { success: false, error: 'Numéro invalide' };
    }
    const emailRaw = (params.email || '').trim().toLowerCase();
    const elevated = params.role === 'superviseur' || params.role === 'manager' || params.role === 'admin';
    if (elevated && emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return { success: false, error: 'E-mail invalide' };
    }
    if (elevated && !emailRaw) {
      return { success: false, error: 'E-mail obligatoire pour Superviseur / Manager / Admin' };
    }
    const plainCode = params.code && isValidAccessCode(params.code) ? params.code.trim() : generateFiveDigitCode();
    if (params.code && !isValidAccessCode(params.code)) {
      return { success: false, error: 'Le code doit contenir exactement 5 chiffres.' };
    }
    const codeHash = await hashCode(plainCode);
    const { data, error } = await supabase
      .from('commerciaux')
      .insert({
        phone: cleanPhone,
        email: elevated ? emailRaw : null,
        code_hash: codeHash,
        name: params.name.trim(),
        localite: params.localite || '',
        cabinet: CABINET_K2L,
        role: params.role,
        is_active: true,
        profile_completed: params.role !== 'commercial',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return { success: false, error: 'Ce numéro existe déjà.' };
      return { success: false, error: error.message };
    }
    await this.logAudit('user_created', { phone: cleanPhone, role: params.role, name: params.name });
    return { success: true, user: mapUser(data), generatedCode: plainCode };
  }

  /** Inscription commercial : génère un code 5 chiffres unique */
  public async registerCommercial(phone: string): Promise<{
    success: boolean;
    generatedCode?: string;
    error?: string;
  }> {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 8) {
      return { success: false, error: 'Numéro de téléphone invalide.' };
    }
    const { data: existing } = await supabase
      .from('commerciaux')
      .select('id')
      .eq('phone', cleanPhone)
      .maybeSingle();
    if (existing) {
      return { success: false, error: 'Ce numéro est déjà inscrit. Utilisez « Se connecter ».' };
    }
    const plainCode = generateFiveDigitCode();
    const codeHash = await hashCode(plainCode);
    const { error } = await supabase.from('commerciaux').insert({
      phone: cleanPhone,
      code_hash: codeHash,
      name: '',
      localite: '',
      cabinet: CABINET_K2L,
      role: 'commercial',
      is_active: true,
      profile_completed: false,
    });
    if (error) {
      if (error.code === '23505') return { success: false, error: 'Ce numéro est déjà inscrit.' };
      return { success: false, error: error.message };
    }
    return { success: true, generatedCode: plainCode };
  }

  /** Régénération du code d'accès (manager) — retourne le nouveau code 5 chiffres */
  public async regenerateUserCode(userId: string): Promise<{
    success: boolean;
    generatedCode?: string;
    error?: string;
  }> {
    const plainCode = generateFiveDigitCode();
    const codeHash = await hashCode(plainCode);
    const { error } = await supabase
      .from('commerciaux')
      .update({
        code_hash: codeHash,
        session_token: null,
        session_expires_at: null,
      })
      .eq('id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true, generatedCode: plainCode };
  }

  public async updateUserRole(userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('commerciaux').update({ role }).eq('id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  public async setUserActive(userId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    const payload: any = { is_active: isActive };
    if (!isActive) {
      payload.session_token = null;
      payload.session_expires_at = null;
    }
    const { error } = await supabase.from('commerciaux').update(payload).eq('id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  public async resetUserSession(userId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('commerciaux')
      .update({ session_token: null, session_expires_at: null })
      .eq('id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  public async checkDuplicate(rawClientPhone: string): Promise<DuplicateCheckResult> {
    const clean = normalizePhone(rawClientPhone);
    if (!clean || clean.length < 6) return { isDuplicate: false };

    const queue = this.getOfflineQueue();
    const inQueue = queue.find(c => c.client_phone_clean === clean);
    if (inQueue) {
      return {
        isDuplicate: true,
        existingEntry: inQueue,
        message: `Ce client est déjà dans la file d'attente hors-ligne.`,
      };
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('client_phone_clean', clean)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const dateStr = new Date(data.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        isDuplicate: true,
        existingEntry: data as ClientEntry,
        message: `Client déjà recruté le ${dateStr} par ${data.commercial_name} (${data.cabinet}).`,
      };
    }
    return { isDuplicate: false };
  }

  public getOfflineQueue(): ClientEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveOfflineQueue(queue: ClientEntry[]) {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  }

  /** Charge les clients par pages (évite la coupure silencieuse à 5000). */
  public async getAllClientsFromServer(maxRows = 20000): Promise<ClientEntry[]> {
    const pageSize = 1000;
    const all: ClientEntry[] = [];
    let from = 0;
    while (from < maxRows) {
      const to = Math.min(from + pageSize - 1, maxRows - 1);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) break;
      const batch = (data || []) as ClientEntry[];
      all.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
    return all;
  }

  public async getClientsByCommercial(commercialId: string): Promise<ClientEntry[]> {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('commercial_id', commercialId)
      .order('created_at', { ascending: false });
    return (data || []) as ClientEntry[];
  }

  /** Clients visibles selon le rôle */
  public async getClientsForUser(user: Commercial): Promise<ClientEntry[]> {
    if (user.role === 'manager' || user.role === 'admin') {
      return this.getAllClientsFromServer();
    }
    if (user.role === 'superviseur') {
      const { data: team } = await supabase
        .from('commerciaux')
        .select('id')
        .eq('superviseur_id', user.id)
        .eq('is_active', true);
      const ids = [user.id, ...(team || []).map((t: any) => t.id)];
      const { data } = await supabase
        .from('clients')
        .select('*')
        .in('commercial_id', ids)
        .order('created_at', { ascending: false })
        .limit(3000);
      return (data || []) as ClientEntry[];
    }
    return this.getClientsByCommercial(user.id);
  }

  public async addClient(
    clientPhoneRaw: string,
    commercial: Commercial,
    notes?: string
  ): Promise<{ success: boolean; entry?: ClientEntry; isDuplicate?: boolean; message?: string }> {
    const cleanPhone = normalizePhone(clientPhoneRaw);
    if (!cleanPhone || cleanPhone.length < 8) {
      return { success: false, message: 'Numéro de téléphone invalide (8 à 10 chiffres minimum).' };
    }

    const settings = this.getSettings();
    const dupCheck = await this.checkDuplicate(cleanPhone);
    if (dupCheck.isDuplicate && settings.enableDuplicateStrictBlocking) {
      await this.logAudit('duplicate_blocked', {
        client_phone: cleanPhone,
        commercial_id: commercial.id,
        commercial_name: commercial.name,
        message: dupCheck.message,
      }, commercial.phone);
      return { success: false, isDuplicate: true, message: dupCheck.message };
    }

    const newEntry: ClientEntry = {
      id: crypto.randomUUID(),
      client_phone: formatPhoneDisplay(cleanPhone),
      client_phone_clean: cleanPhone,
      commercial_id: commercial.id,
      commercial_name: commercial.name || 'Commercial',
      commercial_phone: commercial.phone,
      cabinet: CABINET_K2L,
      localite: commercial.localite || '',
      partenaire: commercial.partenaire || '',
      action: commercial.action || 'Saisie Terrain',
      status: typeof navigator !== 'undefined' && navigator.onLine ? 'synced' : 'pending',
      notes: notes || '',
      created_at: new Date().toISOString(),
      synced_at: typeof navigator !== 'undefined' && navigator.onLine ? new Date().toISOString() : undefined,
      synced_to_sheets: false,
    };

    const queue = this.getOfflineQueue();
    queue.push(newEntry);
    this.saveOfflineQueue(queue);

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      await this.syncOfflineQueue();
    }
    return { success: true, entry: newEntry };
  }

  /**
   * Synchronise la file offline.
   * P0 : re-vérifie les doublons côté serveur avant insert (évite 2 offline → 2 lignes).
   * P1 : messages d'erreur lisibles pour le commercial.
   */
  public async syncOfflineQueue(): Promise<{
    syncedCount: number;
    blockedDuplicates: number;
    errors: string[];
  }> {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return { syncedCount: 0, blockedDuplicates: 0, errors: [] };

    const errors: string[] = [];
    let syncedCount = 0;
    let blockedDuplicates = 0;
    const remaining: ClientEntry[] = [];
    const settings = this.getSettings();
    const sessionToken =
      (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN)) ||
      this.getCurrentUser()?.session_token ||
      '';

    for (const item of queue) {
      let ok = false;
      try {
        // --- Re-check doublon serveur (autre commercial / autre appareil) ---
        const { data: existing } = await supabase
          .from('clients')
          .select('id, commercial_name, cabinet, created_at, client_phone_clean')
          .eq('client_phone_clean', item.client_phone_clean)
          .neq('id', item.id)
          .limit(1)
          .maybeSingle();

        if (existing) {
          blockedDuplicates++;
          const dateStr = existing.created_at
            ? new Date(existing.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';
          const msg = `Doublon : ${item.client_phone} déjà saisi le ${dateStr} par ${existing.commercial_name || 'un collègue'} (${existing.cabinet || '—'}). Non envoyé.`;
          errors.push(msg);
          await this.logAudit(
            'duplicate_blocked_on_sync',
            {
              client_phone: item.client_phone_clean,
              commercial_id: item.commercial_id,
              commercial_name: item.commercial_name,
              existing_id: existing.id,
              message: msg,
            },
            item.commercial_phone
          );
          // Ne pas remettre en file : doublon confirmé
          continue;
        }

        // Préférer API sécurisée (service_role serveur) si disponible
        let usedApi = false;
        try {
          const apiRes = await fetch('/api/clients-insert', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
            },
            body: JSON.stringify(item),
          });
          if (apiRes.status !== 404 && apiRes.status !== 405) {
            usedApi = true;
            const body = await apiRes.json().catch(() => ({}));
            if (apiRes.ok && body.ok) {
              ok = true;
            } else if (body.duplicate) {
              blockedDuplicates++;
              errors.push(body.message || `Doublon : ${item.client_phone} déjà enregistré.`);
              continue;
            } else {
              errors.push(
                body.message ||
                  `Échec envoi de ${item.client_phone}. Réessayez quand le réseau est stable.`
              );
            }
          }
        } catch {
          usedApi = false;
        }

        if (!usedApi) {
          const { error } = await supabase.from('clients').upsert(
            {
              id: item.id,
              client_phone: item.client_phone,
              client_phone_clean: item.client_phone_clean,
              commercial_id: item.commercial_id,
              commercial_name: item.commercial_name,
              commercial_phone: item.commercial_phone,
              cabinet: item.cabinet,
              localite: item.localite,
              partenaire: item.partenaire,
              action: item.action,
              status: 'synced',
              notes: item.notes,
              created_at: item.created_at,
              synced_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
          if (!error) {
            ok = true;
          } else if (/duplicate|unique|23505/i.test(error.message)) {
            blockedDuplicates++;
            errors.push(
              `Doublon : ${item.client_phone} existe déjà en base. Non envoyé (protection anti-doublon).`
            );
            continue;
          } else {
            errors.push(
              `Impossible d'envoyer ${item.client_phone} : ${error.message}. Conservé hors-ligne.`
            );
          }
        }

        if (ok && settings.autoSyncGoogleSheets && settings.googleSheetsWebhookUrl) {
          try {
            const sheetRes = await fetch('/api/sheets-proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                webhookUrl: settings.googleSheetsWebhookUrl,
                payload: item,
              }),
            });
            if (!sheetRes.ok && sheetRes.status !== 404) {
              errors.push(`Client ${item.client_phone} enregistré, mais Google Sheets a échoué.`);
            }
          } catch {
            /* Sheets non bloquant */
          }
        }
      } catch (e: any) {
        errors.push(
          `Réseau indisponible pour ${item.client_phone}. Saisie conservée hors-ligne.`
        );
      }

      if (ok) syncedCount++;
      else remaining.push(item);
    }

    this.saveOfflineQueue(remaining);
    return { syncedCount, blockedDuplicates, errors };
  }

  public async getStats(): Promise<{
    totalClients: number;
    activeCommerciaux: number;
    pendingSyncCount: number;
    isOnline: boolean;
    supabaseConnected: boolean;
    sheetsConnected: boolean;
    duplicatesAvoided: number;
    latencyMs?: number;
  }> {
    const conn = await checkSupabaseConnection();
    const clients = await this.getAllClientsFromServer();
    const queue = this.getOfflineQueue();
    const settings = this.getSettings();
    const duplicatesAvoided = await this.getDuplicatesAvoidedCount();
    const { count } = await supabase
      .from('commerciaux')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('role', 'commercial');

    return {
      totalClients: clients.length,
      activeCommerciaux: count || 0,
      pendingSyncCount: queue.length,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      supabaseConnected: conn.connected && conn.tablesReady,
      sheetsConnected: !!settings.googleSheetsWebhookUrl,
      duplicatesAvoided,
      latencyMs: conn.latencyMs,
    };
  }


  /** Journal d'audit (actions sensibles + doublons bloqués) */
  public async logAudit(
    actionType: string,
    details: Record<string, unknown> = {},
    actorPhone?: string
  ): Promise<void> {
    try {
      const user = this.getCurrentUser();
      await supabase.from('audit_log').insert({
        action_type: actionType,
        actor_phone: actorPhone || user?.phone || null,
        details,
      });
    } catch {
      /* non bloquant */
    }
  }

  public async getDuplicatesAvoidedCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('action_type', 'duplicate_blocked');
      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  }

  /** Catalogue partenaires (DB + défauts) */
  public async getPartenaires(): Promise<PartenaireDef[]> {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'partenaires_catalogue')
        .maybeSingle();
      if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
        return (data.value as PartenaireDef[]).filter(p => p.is_active !== false);
      }
    } catch {}
    return PARTENAIRES_DEFAUT.map(p => ({ ...p, is_active: true }));
  }

  public async savePartenaires(list: PartenaireDef[]): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('app_settings').upsert(
      { key: 'partenaires_catalogue', value: list, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  public async addPartenaire(name: string, actions: string[]): Promise<{ success: boolean; error?: string }> {
    const list = await this.getPartenaires();
    const clean = name.trim().toUpperCase();
    if (!clean) return { success: false, error: 'Nom du partenaire requis' };
    if (list.some(p => p.name.toUpperCase() === clean)) {
      return { success: false, error: 'Ce partenaire existe déjà' };
    }
    const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    list.push({ id, name: clean, actions: actions.filter(Boolean), is_active: true });
    return this.savePartenaires(list);
  }

  public async updatePartenaireActions(name: string, actions: string[]): Promise<{ success: boolean; error?: string }> {
    const list = await this.getPartenaires();
    const idx = list.findIndex(p => p.name.toUpperCase() === name.toUpperCase());
    if (idx < 0) return { success: false, error: 'Partenaire introuvable' };
    list[idx] = { ...list[idx], actions: actions.filter(Boolean) };
    return this.savePartenaires(list);
  }

}

export const storage = StorageService.getInstance();
