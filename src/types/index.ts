export interface Commercial {
  id: string;
  phone: string;
  code: string;
  name: string;
  localite: string;
  cabinet: string;
  partenaire: string;
  action: string;
  role: 'commercial' | 'manager';
  is_active: boolean;
  created_at: string;
  last_active_at: string;
  session_token?: string;
}

export interface ClientEntry {
  id: string;
  client_phone: string;
  client_phone_clean: string;
  commercial_id: string;
  commercial_name: string;
  commercial_phone: string;
  cabinet: string;
  localite: string;
  partenaire: string;
  action: string;
  status: 'synced' | 'pending' | 'duplicate_blocked';
  notes?: string;
  created_at: string;
  synced_at?: string;
  synced_to_sheets?: boolean;
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
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleSheetsWebhookUrl: string;
  autoSyncGoogleSheets: boolean;
  enableDuplicateStrictBlocking: boolean;
}
