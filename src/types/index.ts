export type UserRole = 'super_admin' | 'admin' | 'manager' | 'commercial';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface Commercial {
  id: string;
  user_id?: string;
  organization_id?: string | null;
  phone: string;
  name: string;
  localite: string;
  cabinet: string;
  partenaire: string;
  action: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_active_at: string;
}

export type ClientStatus = 'synced' | 'pending' | 'syncing' | 'failed' | 'duplicate_blocked';

export interface ClientEntry {
  id: string;
  organization_id?: string | null;
  client_phone: string;
  client_phone_clean: string;
  commercial_id: string;
  commercial_name: string;
  commercial_phone: string;
  cabinet: string;
  localite: string;
  partenaire: string;
  action: string;
  status: ClientStatus;
  notes?: string;
  created_at: string;
  synced_at?: string;
  synced_to_sheets?: boolean;
  sync_error?: string;
  sync_attempts?: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingEntry?: ClientEntry;
  message?: string;
}

export interface SyncStats {
  totalClients: number;
  duplicatesAvoided: number;
  activeCommerciaux: number;
  pendingSyncCount: number;
  isOnline: boolean;
  supabaseConnected: boolean;
  sheetsConnected: boolean;
  lastSyncTime?: string;
}

export interface AppSettings {
  googleSheetsWebhookUrl: string;
  autoSyncGoogleSheets: boolean;
  enableDuplicateStrictBlocking: boolean;
}
