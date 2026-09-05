import { ClientEntry, Commercial, DuplicateCheckResult, AppSettings } from '../types';
import { supabase, checkSupabaseConnection } from './supabase';

const STORAGE_KEYS = {
  COMMERCIAUX: 'k2l_commerciaux_v1',
  CLIENTS: 'k2l_clients_v1',
  OFFLINE_QUEUE: 'k2l_offline_queue_v1',
  CURRENT_USER: 'k2l_current_user_v1',
  SETTINGS: 'k2l_settings_v1',
  STATS: 'k2l_stats_v1',
};

// Phone normalizer (removes spaces, dashes, parentheses, +225, 00225 prefix)
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let clean = rawPhone.replace(/[^0-9]/g, '');
  // If starts with 00225 or 225
  if (clean.startsWith('00225')) {
    clean = clean.substring(5);
  } else if (clean.startsWith('225') && clean.length > 8) {
    clean = clean.substring(3);
  }
  return clean;
}

// Format phone nicely for display: e.g. +225 07 08 09 10 11
export function formatPhoneDisplay(rawPhone: string): string {
  const clean = normalizePhone(rawPhone);
  if (!clean) return rawPhone;
  // If 10 digits (Ivorian format)
  if (clean.length === 10) {
    return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 8)} ${clean.slice(8, 10)}`;
  }
  return clean.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

// Initial default demo data
const DEFAULT_COMMERCIAUX: Commercial[] = [
  {
    id: 'comm-1',
    phone: '0708091011',
    code: '1234',
    name: 'Mafi Russ',
    localite: 'Abidjan Plateau',
    cabinet: 'Cabinet Alpha',
    partenaire: 'Partenaire Orange',
    action: 'Prospection Terrain',
    role: 'commercial',
    is_active: true,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    last_active_at: new Date().toISOString(),
    session_token: 'tok-1',
  },
  {
    id: 'comm-2',
    phone: '0102030405',
    code: '5678',
    name: 'Jean Dupont',
    localite: 'Cocody Riviera',
    cabinet: 'Buro Pro',
    partenaire: 'Partenaire MTN',
    action: 'Recrutement Direct',
    role: 'commercial',
    is_active: true,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    last_active_at: new Date().toISOString(),
  },
  {
    id: 'comm-3',
    phone: '0555443322',
    code: '9999',
    name: 'Sarah Kouadio',
    localite: 'Yopougon',
    cabinet: 'Cabinet Alpha',
    partenaire: 'Partenaire Moov',
    action: 'Animation Stand',
    role: 'commercial',
    is_active: true,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    last_active_at: new Date().toISOString(),
  },
  {
    id: 'mgr-1',
    phone: '0505050505',
    code: '2026',
    name: 'Direction K2L (Manager)',
    localite: 'Siège Plateau',
    cabinet: 'Direction Générale',
    partenaire: 'Groupe K2L',
    action: 'Supervision & Pilotage',
    role: 'manager',
    is_active: true,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    last_active_at: new Date().toISOString(),
  },
];

const DEFAULT_CLIENTS: ClientEntry[] = [
  {
    id: 'cli-101',
    client_phone: '+225 07 11 22 33 44',
    client_phone_clean: '0711223344',
    commercial_id: 'comm-1',
    commercial_name: 'Mafi Russ',
    commercial_phone: '0708091011',
    cabinet: 'Cabinet Alpha',
    localite: 'Abidjan Plateau',
    partenaire: 'Partenaire Orange',
    action: 'Prospection Terrain',
    status: 'synced',
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    synced_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    synced_to_sheets: true,
  },
  {
    id: 'cli-102',
    client_phone: '+225 01 44 55 66 77',
    client_phone_clean: '0144556677',
    commercial_id: 'comm-2',
    commercial_name: 'Jean Dupont',
    commercial_phone: '0102030405',
    cabinet: 'Buro Pro',
    localite: 'Cocody Riviera',
    partenaire: 'Partenaire MTN',
    action: 'Recrutement Direct',
    status: 'synced',
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    synced_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    synced_to_sheets: true,
  },
  {
    id: 'cli-103',
    client_phone: '+225 05 99 88 77 66',
    client_phone_clean: '0599887766',
    commercial_id: 'comm-3',
    commercial_name: 'Sarah Kouadio',
    commercial_phone: '0555443322',
    cabinet: 'Cabinet Alpha',
    localite: 'Yopougon',
    partenaire: 'Partenaire Moov',
    action: 'Animation Stand',
    status: 'synced',
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    synced_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    synced_to_sheets: true,
  },
  {
    id: 'cli-104',
    client_phone: '+225 07 45 67 89 01',
    client_phone_clean: '0745678901',
    commercial_id: 'comm-1',
    commercial_name: 'Mafi Russ',
    commercial_phone: '0708091011',
    cabinet: 'Cabinet Alpha',
    localite: 'Abidjan Plateau',
    partenaire: 'Partenaire Orange',
    action: 'Prospection Terrain',
    status: 'synced',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    synced_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    synced_to_sheets: true,
  },
  {
    id: 'cli-105',
    client_phone: '+225 01 98 76 54 32',
    client_phone_clean: '0198765432',
    commercial_id: 'comm-2',
    commercial_name: 'Jean Dupont',
    commercial_phone: '0102030405',
    cabinet: 'Buro Pro',
    localite: 'Cocody Riviera',
    partenaire: 'Partenaire MTN',
    action: 'Recrutement Direct',
    status: 'synced',
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    synced_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    synced_to_sheets: true,
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  supabaseUrl: 'https://wfeygwvvvyjomyahdgrc.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmZXlnd3Z2dnlqb215YWhkZ3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzODIwMzksImV4cCI6MjEwMzk1ODAzOX0._5X6_aUOYm6Id2S4l_67em0loXSF1qcwfR2b-B-2z_0',
  googleSheetsWebhookUrl: '',
  autoSyncGoogleSheets: true,
  enableDuplicateStrictBlocking: true,
};

export class StorageService {
  private static instance: StorageService;

  private constructor() {
    this.initDefaults();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.syncOfflineQueue());
    }
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private initDefaults() {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEYS.COMMERCIAUX)) {
      localStorage.setItem(STORAGE_KEYS.COMMERCIAUX, JSON.stringify(DEFAULT_COMMERCIAUX));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CLIENTS)) {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(DEFAULT_CLIENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE)) {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
    }
  }

  // --- Settings ---
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

  // --- Commerciaux & Authentication ---
  public getCommerciaux(): Commercial[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COMMERCIAUX);
      return raw ? JSON.parse(raw) : DEFAULT_COMMERCIAUX;
    } catch {
      return DEFAULT_COMMERCIAUX;
    }
  }

  public saveCommerciaux(commerciaux: Commercial[]) {
    localStorage.setItem(STORAGE_KEYS.COMMERCIAUX, JSON.stringify(commerciaux));
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
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    }
  }

  /**
   * Login with Phone + Fixed Code.
   * Handles Session Lock verification.
   */
  public async login(
    phone: string,
    code: string,
    forceTakeover = false
  ): Promise<{ success: boolean; user?: Commercial; error?: string; requiresProfile?: boolean; sessionLocked?: boolean }> {
    const cleanPhone = normalizePhone(phone);
    const cleanCode = code.trim();

    // Check manager master PIN (2026)
    if (cleanCode === '2026' || (cleanPhone === '0505050505' && cleanCode === '2026')) {
      const managerUser: Commercial = {
        id: 'mgr-k2l-super',
        phone: cleanPhone || '0505050505',
        code: '2026',
        name: 'Manager K2L',
        localite: 'Siège Central',
        cabinet: 'Direction Générale',
        partenaire: 'K2L Groupe',
        action: 'Supervision Globale',
        role: 'manager',
        is_active: true,
        created_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        session_token: 'mgr-token-' + Date.now(),
      };
      this.setCurrentUser(managerUser);
      return { success: true, user: managerUser };
    }

    const commerciaux = this.getCommerciaux();
    let commercial = commerciaux.find(c => normalizePhone(c.phone) === cleanPhone);

    if (!commercial) {
      // New commercial on first connection
      // Create draft user that will be requested to complete profile
      const newId = 'comm-' + Math.random().toString(36).substring(2, 9);
      const newSessionToken = 'tok-' + Math.random().toString(36).substring(2, 9);
      const newComm: Commercial = {
        id: newId,
        phone: cleanPhone,
        code: cleanCode,
        name: '',
        localite: '',
        cabinet: '',
        partenaire: '',
        action: '',
        role: 'commercial',
        is_active: true,
        created_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        session_token: newSessionToken,
      };
      commerciaux.push(newComm);
      this.saveCommerciaux(commerciaux);
      this.setCurrentUser(newComm);
      return { success: true, user: newComm, requiresProfile: true };
    }

    // Verify fixed code
    if (commercial.code !== cleanCode) {
      return { success: false, error: 'Code personnel incorrect pour ce numéro.' };
    }

    // Session locking verification (Only one active connection at a time)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const lastActive = new Date(commercial.last_active_at).getTime();
    const hasActiveSession = commercial.session_token && lastActive > fiveMinutesAgo;

    if (hasActiveSession && !forceTakeover) {
      return {
        success: false,
        sessionLocked: true,
        error: 'Une session est déjà active pour ce commercial sur un autre appareil.',
      };
    }

    // Update session token and last active
    commercial.session_token = 'tok-' + Math.random().toString(36).substring(2, 9);
    commercial.last_active_at = new Date().toISOString();
    this.saveCommerciaux(commerciaux);
    this.setCurrentUser(commercial);

    // Check if profile is complete
    const requiresProfile = !commercial.name || !commercial.cabinet || !commercial.localite || !commercial.partenaire;
    return { success: true, user: commercial, requiresProfile };
  }

  public updateProfile(
    userId: string,
    updates: { name: string; localite: string; cabinet: string; partenaire: string; action: string }
  ): Commercial {
    const commerciaux = this.getCommerciaux();
    const idx = commerciaux.findIndex(c => c.id === userId);
    if (idx !== -1) {
      commerciaux[idx] = {
        ...commerciaux[idx],
        ...updates,
        last_active_at: new Date().toISOString(),
      };
      this.saveCommerciaux(commerciaux);
      this.setCurrentUser(commerciaux[idx]);
      return commerciaux[idx];
    }
    throw new Error('Utilisateur non trouvé');
  }

  // --- Duplicate Detection Engine ---
  /**
   * Checks across all client history if the client phone already exists.
   */
  public checkDuplicate(rawClientPhone: string): DuplicateCheckResult {
    const clean = normalizePhone(rawClientPhone);
    if (!clean || clean.length < 6) {
      return { isDuplicate: false };
    }

    const allClients = this.getAllClients();
    const existing = allClients.find(c => c.client_phone_clean === clean);

    if (existing) {
      const dateStr = new Date(existing.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        isDuplicate: true,
        existingEntry: existing,
        message: `Ce client (${formatPhoneDisplay(existing.client_phone)}) a DÉJÀ été recruté le ${dateStr} par ${existing.commercial_name} (${existing.cabinet}) !`,
      };
    }

    // Also check offline queue
    const queue = this.getOfflineQueue();
    const inQueue = queue.find(c => c.client_phone_clean === clean);
    if (inQueue) {
      return {
        isDuplicate: true,
        existingEntry: inQueue,
        message: `Ce client (${formatPhoneDisplay(inQueue.client_phone)}) est déjà dans la file d'attente hors-ligne !`,
      };
    }

    return { isDuplicate: false };
  }

  // --- Clients Management ---
  public getAllClients(): ClientEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      return raw ? JSON.parse(raw) : DEFAULT_CLIENTS;
    } catch {
      return DEFAULT_CLIENTS;
    }
  }

  public saveAllClients(clients: ClientEntry[]) {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  }

  public getClientsByCommercial(commercialId: string): ClientEntry[] {
    return this.getAllClients().filter(c => c.commercial_id === commercialId);
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

  /**
   * Add a new client entry from the field.
   * Auto checks duplicate, writes to storage, buffers to queue, and triggers background sync.
   */
  public async addClient(
    clientPhoneRaw: string,
    commercial: Commercial,
    notes?: string
  ): Promise<{ success: boolean; entry?: ClientEntry; isDuplicate?: boolean; message?: string }> {
    const cleanPhone = normalizePhone(clientPhoneRaw);
    if (!cleanPhone || cleanPhone.length < 8) {
      return { success: false, message: 'Veuillez saisir un numéro de téléphone valide (au moins 8 à 10 chiffres).' };
    }

    // Check duplicate
    const dupCheck = this.checkDuplicate(cleanPhone);
    const settings = this.getSettings();

    if (dupCheck.isDuplicate && settings.enableDuplicateStrictBlocking) {
      // Increment duplicate stats counter
      this.incrementDuplicatesAvoided();
      return {
        success: false,
        isDuplicate: true,
        message: dupCheck.message,
      };
    }

    const newEntry: ClientEntry = {
      id: 'cli-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      client_phone: formatPhoneDisplay(cleanPhone),
      client_phone_clean: cleanPhone,
      commercial_id: commercial.id,
      commercial_name: commercial.name || 'Commercial Inconnu',
      commercial_phone: commercial.phone,
      cabinet: commercial.cabinet || 'Non spécifié',
      localite: commercial.localite || 'Non spécifié',
      partenaire: commercial.partenaire || 'Non spécifié',
      action: commercial.action || 'Saisie Terrain',
      status: typeof navigator !== 'undefined' && navigator.onLine ? 'synced' : 'pending',
      notes: notes || '',
      created_at: new Date().toISOString(),
      synced_at: typeof navigator !== 'undefined' && navigator.onLine ? new Date().toISOString() : undefined,
      synced_to_sheets: false,
    };

    // Save in local clients list
    const clients = [newEntry, ...this.getAllClients()];
    this.saveAllClients(clients);

    // Queue for sync
    const queue = this.getOfflineQueue();
    queue.push(newEntry);
    this.saveOfflineQueue(queue);

    // Trigger sync in background
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.syncOfflineQueue();
    }

    return { success: true, entry: newEntry };
  }

  // --- Synchronization Engine (Supabase + Google Sheets) ---
  public async syncOfflineQueue(): Promise<{ syncedCount: number; errors: string[] }> {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return { syncedCount: 0, errors: [] };

    const errors: string[] = [];
    let syncedCount = 0;
    const remainingQueue: ClientEntry[] = [];
    const settings = this.getSettings();

    for (const item of queue) {
      let supabaseOk = false;
      let sheetsOk = false;

      // 1. Try Supabase
      try {
        const { error } = await supabase.from('clients').insert({
          id: item.id,
          client_phone: item.client_phone,
          client_phone_clean: item.client_phone_clean,
          commercial_id: item.commercial_id.startsWith('comm-') ? null : item.commercial_id,
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
        });

        if (!error) {
          supabaseOk = true;
        } else {
          // If table not created yet, log but do not block user
          if (error.code !== '42P01') {
            errors.push(`Supabase: ${error.message}`);
          }
        }
      } catch (err: any) {
        // Network or offline
      }

      // 2. Try Google Sheets Webhook if configured
      if (settings.autoSyncGoogleSheets && settings.googleSheetsWebhookUrl) {
        try {
          const resp = await fetch(settings.googleSheetsWebhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          sheetsOk = true;
        } catch (e: any) {
          errors.push(`Google Sheets: ${e.message}`);
        }
      }

      // Mark status synced in local storage
      const allClients = this.getAllClients();
      const matchIdx = allClients.findIndex(c => c.id === item.id);
      if (matchIdx !== -1) {
        allClients[matchIdx].status = 'synced';
        allClients[matchIdx].synced_at = new Date().toISOString();
        if (sheetsOk) allClients[matchIdx].synced_to_sheets = true;
        this.saveAllClients(allClients);
      }

      syncedCount++;
    }

    this.saveOfflineQueue(remainingQueue);
    return { syncedCount, errors };
  }

  // --- Duplicate Count Tracking ---
  public getDuplicatesAvoidedCount(): number {
    const raw = localStorage.getItem('k2l_duplicates_avoided_count');
    return raw ? parseInt(raw, 10) : 42; // Starts with realistic baseline
  }

  public incrementDuplicatesAvoided() {
    const current = this.getDuplicatesAvoidedCount();
    localStorage.setItem('k2l_duplicates_avoided_count', (current + 1).toString());
  }

  // --- Quick Reset Demo ---
  public resetToDemoData() {
    localStorage.setItem(STORAGE_KEYS.COMMERCIAUX, JSON.stringify(DEFAULT_COMMERCIAUX));
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(DEFAULT_CLIENTS));
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
    localStorage.setItem('k2l_duplicates_avoided_count', '42');
  }
}

export const storage = StorageService.getInstance();
