import { ClientEntry, Commercial, DuplicateCheckResult, AppSettings } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { clearCache, readCache, removeCache, writeCache } from './local-db';

const CACHE_KEYS = {
  COMMERCIALS: 'commercials',
  CLIENTS: 'clients',
  QUEUE: 'offline-queue',
  SETTINGS: 'settings',
  DUPLICATES: 'duplicates-avoided',
} as const;

const EMPTY_SETTINGS: AppSettings = {
  googleSheetsWebhookUrl: '',
  autoSyncGoogleSheets: false,
  enableDuplicateStrictBlocking: true,
};

export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';

  let clean = rawPhone.replace(/\D/g, '');
  if (clean.startsWith('00225')) clean = clean.slice(5);
  else if (clean.startsWith('225') && clean.length > 10) clean = clean.slice(3);

  return clean;
}

export function formatPhoneDisplay(rawPhone: string): string {
  const clean = normalizePhone(rawPhone);
  if (clean.length === 10) {
    return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 8)} ${clean.slice(8, 10)}`;
  }
  return clean.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

function toAuthPhone(phone: string): string {
  const clean = normalizePhone(phone);
  return clean.length === 10 ? `+225${clean}` : phone.trim();
}

function asCommercial(row: Record<string, unknown>): Commercial {
  return {
    id: String(row.id ?? ''),
    user_id: row.user_id ? String(row.user_id) : undefined,
    phone: String(row.phone ?? ''),
    name: String(row.name ?? ''),
    localite: String(row.localite ?? ''),
    cabinet: String(row.cabinet ?? ''),
    partenaire: String(row.partenaire ?? ''),
    action: String(row.action ?? ''),
    role: row.role === 'manager' ? 'manager' : 'commercial',
    is_active: row.is_active !== false,
    created_at: String(row.created_at ?? new Date().toISOString()),
    last_active_at: String(row.last_active_at ?? new Date().toISOString()),
  };
}

function asClient(row: Record<string, unknown>): ClientEntry {
  return {
    id: String(row.id ?? ''),
    client_phone: String(row.client_phone ?? ''),
    client_phone_clean: String(row.client_phone_clean ?? normalizePhone(String(row.client_phone ?? ''))),
    commercial_id: String(row.commercial_id ?? ''),
    commercial_name: String(row.commercial_name ?? ''),
    commercial_phone: String(row.commercial_phone ?? ''),
    cabinet: String(row.cabinet ?? ''),
    localite: String(row.localite ?? ''),
    partenaire: String(row.partenaire ?? ''),
    action: String(row.action ?? ''),
    status: row.status === 'duplicate_blocked' ? 'duplicate_blocked' : row.status === 'failed' ? 'failed' : row.status === 'pending' ? 'pending' : 'synced',
    notes: row.notes ? String(row.notes) : '',
    created_at: String(row.created_at ?? new Date().toISOString()),
    synced_at: row.synced_at ? String(row.synced_at) : undefined,
    synced_to_sheets: row.synced_to_sheets === true,
  };
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class StorageService {
  private static instance: StorageService;
  private initialized = false;
  private commercials: Commercial[] = [];
  private clients: ClientEntry[] = [];
  private offlineQueue: ClientEntry[] = [];
  private currentUser: Commercial | null = null;
  private settings: AppSettings = { ...EMPTY_SETTINGS };
  private duplicatesAvoided = 0;
  private syncPromise: Promise<{ syncedCount: number; errors: string[] }> | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        void this.syncOfflineQueue();
      });
    }
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) StorageService.instance = new StorageService();
    return StorageService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // Remove caches from the insecure pre-production prototype. The current
    // app never reads them, but leaving phone data in localStorage would still
    // expose it to scripts running on the same origin.
    if (typeof window !== 'undefined') {
      const legacyKeys: string[] = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key?.startsWith('k2l_')) legacyKeys.push(key);
      }
      legacyKeys.forEach(key => window.localStorage.removeItem(key));
    }

    const [commercials, clients, queue, settings, duplicates] = await Promise.all([
      readCache<Commercial[]>(CACHE_KEYS.COMMERCIALS),
      readCache<ClientEntry[]>(CACHE_KEYS.CLIENTS),
      readCache<ClientEntry[]>(CACHE_KEYS.QUEUE),
      readCache<AppSettings>(CACHE_KEYS.SETTINGS),
      readCache<number>(CACHE_KEYS.DUPLICATES),
    ]);

    this.commercials = Array.isArray(commercials) ? commercials : [];
    this.clients = Array.isArray(clients) ? clients : [];
    this.offlineQueue = Array.isArray(queue) ? queue : [];
    this.settings = { ...EMPTY_SETTINGS, ...(settings ?? {}) };
    this.duplicatesAvoided = typeof duplicates === 'number' ? duplicates : 0;
    this.initialized = true;
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public saveSettings(settings: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...settings };
    void writeCache(CACHE_KEYS.SETTINGS, this.settings);
    return this.getSettings();
  }

  public getCommerciaux(): Commercial[] {
    return [...this.commercials];
  }

  public getCurrentUser(): Commercial | null {
    return this.currentUser;
  }

  public setCurrentUser(user: Commercial | null): void {
    this.currentUser = user;
  }

  public isBossAuthenticated(): boolean {
    return this.currentUser?.role === 'manager' && this.currentUser.is_active;
  }

  public async login(
    phone: string,
    code: string,
    _forceTakeover = false
  ): Promise<{ success: boolean; user?: Commercial; error?: string; requiresProfile?: boolean }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Connexion impossible : Supabase n’est pas configuré.' };
    }

    const cleanPhone = normalizePhone(phone);
    const cleanCode = code.trim();
    if (cleanPhone.length < 8 || !cleanCode) {
      return { success: false, error: 'Saisissez un numéro et un code valides.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      phone: toAuthPhone(cleanPhone),
      password: cleanCode,
    });

    if (error || !data.user) {
      return { success: false, error: 'Identifiants invalides ou compte non confirmé.' };
    }

    const profile = await this.getProfile(data.user.id);
    if (!profile) {
      await supabase.auth.signOut();
      return { success: false, error: 'Ce compte ne possède pas encore de profil commercial.' };
    }
    if (!profile.is_active) {
      await supabase.auth.signOut();
      return { success: false, error: 'Ce compte est désactivé.' };
    }

    this.currentUser = profile;
    await this.refreshRemoteData();
    return {
      success: true,
      user: profile,
      requiresProfile: !profile.name || !profile.cabinet || !profile.localite || !profile.partenaire,
    };
  }

  public async restoreSession(): Promise<Commercial | null> {
    if (!isSupabaseConfigured) return null;

    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return null;

    const profile = await this.getProfile(data.session.user.id);
    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      return null;
    }

    this.currentUser = profile;
    await this.refreshRemoteData();
    return profile;
  }

  public async logout(): Promise<void> {
    this.currentUser = null;
    this.clients = [];
    this.commercials = [];
    await Promise.all([
      writeCache(CACHE_KEYS.CLIENTS, this.clients),
      writeCache(CACHE_KEYS.COMMERCIALS, this.commercials),
    ]);
    if (isSupabaseConfigured) await supabase.auth.signOut();
  }

  private async getProfile(userId: string): Promise<Commercial | null> {
    const { data, error } = await supabase
      .from('commerciaux')
      .select('id,user_id,phone,name,localite,cabinet,partenaire,action,role,is_active,created_at,last_active_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    const profile = asCommercial(data as Record<string, unknown>);
    this.commercials = [profile, ...this.commercials.filter(item => item.id !== profile.id)];
    void writeCache(CACHE_KEYS.COMMERCIALS, this.commercials);
    return profile;
  }

  public async updateProfile(
    userId: string,
    updates: { name: string; localite: string; cabinet: string; partenaire: string; action: string }
  ): Promise<Commercial> {
    const sanitized = {
      name: updates.name.trim().slice(0, 255),
      localite: updates.localite.trim().slice(0, 150),
      cabinet: updates.cabinet.trim().slice(0, 150),
      partenaire: updates.partenaire.trim().slice(0, 150),
      action: updates.action.trim().slice(0, 255),
    };

    if (!sanitized.name || !sanitized.localite || !sanitized.cabinet) {
      throw new Error('Le nom, la localité et le cabinet sont obligatoires.');
    }

    const { data, error } = await supabase
      .from('commerciaux')
      .update({ ...sanitized, last_active_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id,user_id,phone,name,localite,cabinet,partenaire,action,role,is_active,created_at,last_active_at')
      .single();

    if (error || !data) throw new Error(error?.message || 'Profil introuvable.');

    const updated = asCommercial(data as Record<string, unknown>);
    this.currentUser = updated;
    this.commercials = [updated, ...this.commercials.filter(item => item.id !== updated.id)];
    await writeCache(CACHE_KEYS.COMMERCIALS, this.commercials);
    return updated;
  }

  public checkDuplicate(rawClientPhone: string): DuplicateCheckResult {
    const clean = normalizePhone(rawClientPhone);
    if (!clean || clean.length < 8) return { isDuplicate: false };

    const existing = [...this.clients, ...this.offlineQueue].find(client => client.client_phone_clean === clean);
    if (!existing) return { isDuplicate: false };

    const date = new Date(existing.created_at).toLocaleString('fr-FR');
    return {
      isDuplicate: true,
      existingEntry: existing,
      message: `Ce client (${formatPhoneDisplay(existing.client_phone)}) a déjà été enregistré le ${date} par ${existing.commercial_name || 'un commercial'}.`,
    };
  }

  public getAllClients(): ClientEntry[] {
    return [...this.clients].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  public getClientsByCommercial(commercialId: string): ClientEntry[] {
    return this.getAllClients().filter(client => client.commercial_id === commercialId);
  }

  public getOfflineQueue(): ClientEntry[] {
    if (!this.currentUser) return [];
    return this.offlineQueue.filter(item => item.commercial_id === this.currentUser?.id);
  }

  private async persistCache(): Promise<void> {
    await Promise.all([
      writeCache(CACHE_KEYS.COMMERCIALS, this.commercials),
      writeCache(CACHE_KEYS.CLIENTS, this.clients),
      writeCache(CACHE_KEYS.QUEUE, this.offlineQueue),
    ]);
  }

  public async refreshRemoteData(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured || !this.currentUser) return { success: false, error: 'Session Supabase absente.' };

    const remoteRows: Record<string, unknown>[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) return { success: false, error: error.message };
      const page = (data ?? []) as Record<string, unknown>[];
      remoteRows.push(...page);
      if (page.length < pageSize) break;
    }

    const { data: commercialRows, error: commercialsError } = await supabase
      .from('commerciaux')
      .select('id,user_id,phone,name,localite,cabinet,partenaire,action,role,is_active,created_at,last_active_at')
      .order('created_at', { ascending: true });
    if (commercialsError) return { success: false, error: commercialsError.message };

    const remoteClients = remoteRows.map(row => asClient(row));
    const remoteIds = new Set(remoteClients.map(client => client.id));
    const localPending = this.offlineQueue.filter(
      client => client.commercial_id === this.currentUser?.id && !remoteIds.has(client.id)
    );
    this.clients = [...localPending, ...remoteClients];
    this.commercials = (commercialRows ?? []).map(row => asCommercial(row as Record<string, unknown>));
    await this.persistCache();
    return { success: true };
  }

  public async addClient(
    clientPhoneRaw: string,
    commercial: Commercial,
    notes?: string
  ): Promise<{ success: boolean; entry?: ClientEntry; isDuplicate?: boolean; message?: string }> {
    const cleanPhone = normalizePhone(clientPhoneRaw);
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      return { success: false, message: 'Veuillez saisir un numéro valide de 8 à 15 chiffres.' };
    }
    if (!commercial.id || !this.currentUser || commercial.id !== this.currentUser.id) {
      return { success: false, message: 'Session commerciale invalide. Reconnectez-vous.' };
    }

    const duplicate = this.checkDuplicate(cleanPhone);
    if (duplicate.isDuplicate && this.settings.enableDuplicateStrictBlocking) {
      this.incrementDuplicatesAvoided();
      return { success: false, isDuplicate: true, message: duplicate.message };
    }

    const entry: ClientEntry = {
      id: makeId(),
      client_phone: formatPhoneDisplay(cleanPhone),
      client_phone_clean: cleanPhone,
      commercial_id: commercial.id,
      commercial_name: commercial.name || 'Commercial',
      commercial_phone: commercial.phone,
      cabinet: commercial.cabinet || 'Non spécifié',
      localite: commercial.localite || 'Non spécifiée',
      partenaire: commercial.partenaire || 'Non spécifié',
      action: commercial.action || 'Saisie terrain',
      status: 'pending',
      notes: (notes ?? '').trim().slice(0, 1000),
      created_at: new Date().toISOString(),
      synced_to_sheets: false,
      sync_attempts: 0,
    };

    this.clients = [entry, ...this.clients];
    this.offlineQueue = [entry, ...this.offlineQueue];
    await this.persistCache();

    if (typeof navigator === 'undefined' || navigator.onLine) void this.syncOfflineQueue();
    return { success: true, entry };
  }

  public async syncOfflineQueue(): Promise<{ syncedCount: number; errors: string[] }> {
    if (this.syncPromise) return this.syncPromise;

    this.syncPromise = this.performSync().finally(() => {
      this.syncPromise = null;
    });
    return this.syncPromise;
  }

  private async performSync(): Promise<{ syncedCount: number; errors: string[] }> {
    const queueSnapshot = this.currentUser
      ? this.offlineQueue.filter(item => item.commercial_id === this.currentUser?.id)
      : [];
    if (!queueSnapshot.length) return { syncedCount: 0, errors: [] };
    if (!isSupabaseConfigured || !this.currentUser) {
      return { syncedCount: 0, errors: ['Session Supabase absente : la file est conservée.'] };
    }

    const errors: string[] = [];
    let syncedCount = 0;

    for (const item of queueSnapshot) {
      const localIndex = this.clients.findIndex(client => client.id === item.id);
      const queueIndex = this.offlineQueue.findIndex(client => client.id === item.id);
      const nextItem = {
        ...item,
        status: 'syncing' as const,
        sync_attempts: (item.sync_attempts ?? 0) + 1,
      };
      if (localIndex >= 0) this.clients[localIndex] = nextItem;
      if (queueIndex >= 0) this.offlineQueue[queueIndex] = nextItem;

      let supabaseSynced = false;
      if (item.synced_at) {
        supabaseSynced = true;
      } else {
        const { error } = await supabase.from('clients').upsert({
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
          synced_to_sheets: false,
        }, { onConflict: 'id', ignoreDuplicates: true });

        if (!error) {
          supabaseSynced = true;
          syncedCount += 1;
        } else if (error.code === '23505') {
          const duplicateItem = {
            ...nextItem,
            status: 'duplicate_blocked' as const,
            sync_error: 'Ce numéro existe déjà sur le serveur.',
          };
          if (localIndex >= 0) this.clients[localIndex] = duplicateItem;
          this.offlineQueue = this.offlineQueue.filter(queueItem => queueItem.id !== item.id);
          this.incrementDuplicatesAvoided();
          continue;
        } else {
          const failedItem = {
            ...nextItem,
            status: 'failed' as const,
            sync_error: error.message,
          };
          if (localIndex >= 0) this.clients[localIndex] = failedItem;
          if (queueIndex >= 0) this.offlineQueue[queueIndex] = failedItem;
          errors.push(`Supabase: ${error.message}`);
          continue;
        }
      }

      if (supabaseSynced) {
        const syncedItem: ClientEntry = {
          ...nextItem,
          status: 'synced',
          synced_at: nextItem.synced_at ?? new Date().toISOString(),
          sync_error: undefined,
        };
        if (localIndex >= 0) this.clients[localIndex] = syncedItem;

        // Sheets is optional. It never masks a successful database write.
        if (this.settings.autoSyncGoogleSheets && this.settings.googleSheetsWebhookUrl && !item.synced_to_sheets) {
          try {
            await this.sendToGoogleSheets(syncedItem);
            syncedItem.synced_to_sheets = true;
          } catch (error) {
            syncedItem.sync_error = error instanceof Error ? error.message : 'Google Sheets indisponible.';
            errors.push(`Google Sheets: ${syncedItem.sync_error}`);
          }
        }

        if (localIndex >= 0) this.clients[localIndex] = syncedItem;
        if (syncedItem.synced_to_sheets || !this.settings.autoSyncGoogleSheets || !this.settings.googleSheetsWebhookUrl) {
          this.offlineQueue = this.offlineQueue.filter(queueItem => queueItem.id !== item.id);
        } else if (queueIndex >= 0) {
          this.offlineQueue[queueIndex] = syncedItem;
        }
      }
    }

    await this.persistCache();
    return { syncedCount, errors };
  }

  public async syncClientsToGoogleSheets(items: ClientEntry[]): Promise<void> {
    if (!this.settings.googleSheetsWebhookUrl) throw new Error('Aucun webhook Google Sheets configuré.');
    const response = await fetch(this.settings.googleSheetsWebhookUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(items),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }

  private async sendToGoogleSheets(item: ClientEntry): Promise<void> {
    await this.syncClientsToGoogleSheets([item]);
  }

  public getDuplicatesAvoidedCount(): number {
    return this.duplicatesAvoided;
  }

  public incrementDuplicatesAvoided(): void {
    this.duplicatesAvoided += 1;
    void writeCache(CACHE_KEYS.DUPLICATES, this.duplicatesAvoided);
  }

  public async clearLocalCache(): Promise<void> {
    this.commercials = [];
    this.clients = [];
    this.offlineQueue = [];
    this.currentUser = null;
    this.duplicatesAvoided = 0;
    await clearCache();
  }

  public async discardQueueItem(id: string): Promise<void> {
    this.offlineQueue = this.offlineQueue.filter(item => item.id !== id);
    await writeCache(CACHE_KEYS.QUEUE, this.offlineQueue);
  }
}

export const storage = StorageService.getInstance();
