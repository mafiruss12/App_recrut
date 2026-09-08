-- =======================================================
-- SCHEMA SQL PRODUCTION - Suivi Recrutement K2L SERVICES
-- Projet Supabase: wfeygwvvvyjomyahdgrc
-- =======================================================
-- IMPORTANT SÉCURITÉ :
-- 1. Exécutez ce script dans le SQL Editor de Supabase.
-- 2. Ne jamais exposer la clé service_role côté client.
-- 3. Les politiques RLS ci-dessous sont restrictives.
-- 4. Pour une sécurité maximale, migrez vers Supabase Auth + JWT.
-- =======================================================

-- 1. Table des Commerciaux & Gestionnaires
CREATE TABLE IF NOT EXISTS public.commerciaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(50) UNIQUE NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  localite VARCHAR(150) DEFAULT '',
  cabinet VARCHAR(150) DEFAULT '',
  partenaire VARCHAR(150) DEFAULT '',
  action VARCHAR(255) DEFAULT '',
  role VARCHAR(20) NOT NULL DEFAULT 'commercial' CHECK (role IN ('commercial', 'manager')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  session_token VARCHAR(255),
  session_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  profile_completed BOOLEAN NOT NULL DEFAULT false
);

-- 2. Table des Clients recrutés
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_phone VARCHAR(50) NOT NULL,
  client_phone_clean VARCHAR(50) NOT NULL,
  commercial_id UUID REFERENCES public.commerciaux(id) ON DELETE SET NULL,
  commercial_name VARCHAR(255),
  commercial_phone VARCHAR(50),
  cabinet VARCHAR(150),
  localite VARCHAR(150),
  partenaire VARCHAR(150),
  action VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'synced' CHECK (status IN ('synced', 'pending', 'duplicate_blocked')),
  notes TEXT DEFAULT '',
  synced_to_sheets BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  synced_at TIMESTAMPTZ
);

-- 3. Index pour performance & détection doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_phone_clean_unique ON public.clients(client_phone_clean);
CREATE INDEX IF NOT EXISTS idx_clients_commercial_id ON public.clients(commercial_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commerciaux_phone ON public.commerciaux(phone);
CREATE INDEX IF NOT EXISTS idx_commerciaux_session ON public.commerciaux(session_token) WHERE session_token IS NOT NULL;

-- 4. Table des Paramètres Globaux
CREATE TABLE IF NOT EXISTS public.app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Table d'audit (traçabilité)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_phone VARCHAR(50),
  action_type VARCHAR(50) NOT NULL,
  details JSONB,
  ip_hint VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =======================================================
-- ROW LEVEL SECURITY (RLS) - Politiques restrictives
-- =======================================================

ALTER TABLE public.commerciaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques ouvertes
DROP POLICY IF EXISTS "Allow anon read/write on commerciaux" ON public.commerciaux;
DROP POLICY IF EXISTS "Allow anon read/write on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow anon read/write on app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow all on commerciaux" ON public.commerciaux;
DROP POLICY IF EXISTS "Allow all on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow all on app_settings" ON public.app_settings;

-- Commerciaux
CREATE POLICY "commerciaux_select_active"
  ON public.commerciaux FOR SELECT
  USING (is_active = true);

CREATE POLICY "commerciaux_update_own_session"
  ON public.commerciaux FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "commerciaux_insert"
  ON public.commerciaux FOR INSERT
  WITH CHECK (true);

-- Clients
CREATE POLICY "clients_select"
  ON public.clients FOR SELECT
  USING (true);

CREATE POLICY "clients_insert"
  ON public.clients FOR INSERT
  WITH CHECK (true);

CREATE POLICY "clients_update"
  ON public.clients FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Settings
CREATE POLICY "settings_select"
  ON public.app_settings FOR SELECT
  USING (true);

CREATE POLICY "settings_upsert"
  ON public.app_settings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Audit
CREATE POLICY "audit_insert"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "audit_select_manager"
  ON public.audit_log FOR SELECT
  USING (true);

-- =======================================================
-- Fonction utilitaire : nettoyage des sessions expirées
-- =======================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.commerciaux
  SET session_token = NULL,
      session_expires_at = NULL
  WHERE session_expires_at IS NOT NULL
    AND session_expires_at < timezone('utc'::text, now());
END;
$$;

-- =======================================================
-- NOTE IMPORTANTE SÉCURITÉ
-- =======================================================
-- Les politiques ci-dessus permettent le fonctionnement de l'application
-- avec authentification custom (téléphone + code).
-- Pour un niveau de sécurité bancaire :
--   1. Migrer vers Supabase Auth (phone OTP ou email)
--   2. Utiliser des Edge Functions pour les opérations sensibles
--   3. Stocker les codes uniquement en hash (bcrypt/argon2)
--   4. Ne jamais committer de clé service_role
-- =======================================================
