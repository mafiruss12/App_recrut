export type UserRole = 'commercial' | 'superviseur' | 'manager' | 'admin';

export interface Commercial {
  id: string;
  phone: string;
  email?: string | null;
  code?: string;
  name: string;
  localite: string;
  cabinet: string;
  partenaire: string;
  action: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_active_at: string;
  session_token?: string;
  profile_completed?: boolean;
  superviseur_id?: string | null;
  superviseur_name?: string | null;
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

/** Droits dérivés du rôle */
export function canAccessBossPortal(role: UserRole): boolean {
  return role === 'manager' || role === 'admin' || role === 'superviseur';
}

export function canManageAccounts(role: UserRole): boolean {
  return role === 'manager' || role === 'admin';
}

export function canSeeAllClients(role: UserRole): boolean {
  return role === 'manager' || role === 'admin';
}

export function canConfigureApp(role: UserRole): boolean {
  return role === 'admin';
}
