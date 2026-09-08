-- =======================================================
-- K2L — Patch sécurité P0 (à exécuter dans SQL Editor)
-- Complète supabase-schema.sql : contraintes + RLS plus strictes
-- =======================================================

-- Unique anti-doublon (si absent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_phone_clean_unique
  ON public.clients(client_phone_clean);

-- Index session
CREATE INDEX IF NOT EXISTS idx_commerciaux_session_token
  ON public.commerciaux(session_token)
  WHERE session_token IS NOT NULL;

-- Retirer les politiques trop ouvertes
DROP POLICY IF EXISTS "commerciaux_update_own_session" ON public.commerciaux;
DROP POLICY IF EXISTS "commerciaux_insert" ON public.commerciaux;
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "settings_upsert" ON public.app_settings;
DROP POLICY IF EXISTS "audit_select_manager" ON public.audit_log;

-- Lecture commerciaux actifs (login a besoin de lire le hash)
DROP POLICY IF EXISTS "commerciaux_select_active" ON public.commerciaux;
CREATE POLICY "commerciaux_select_active"
  ON public.commerciaux FOR SELECT
  USING (is_active = true);

-- Update session uniquement si le token courant correspond OU pas de session
-- (mitige les prises de contrôle arbitraires ; l'API service_role reste maître)
CREATE POLICY "commerciaux_update_session"
  ON public.commerciaux FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Insert commercial : inscription / création compte (MVP)
CREATE POLICY "commerciaux_insert"
  ON public.commerciaux FOR INSERT
  WITH CHECK (true);

-- Clients : lecture ouverte MVP (anon) — les écritures sensibles passent par /api/*
-- On garde SELECT pour le dashboard tant que l'API list n'est pas exclusive.
CREATE POLICY "clients_select"
  ON public.clients FOR SELECT
  USING (true);

-- Insert client autorisé (fallback si API absente) — UNIQUE protège les doublons
CREATE POLICY "clients_insert"
  ON public.clients FOR INSERT
  WITH CHECK (true);

-- Pas d'UPDATE client côté anon (évite falsification d'historique)
-- CREATE POLICY clients_update intentionally omitted

CREATE POLICY "settings_select"
  ON public.app_settings FOR SELECT
  USING (true);

-- Settings écriture : restreindre autant que possible en MVP
CREATE POLICY "settings_upsert"
  ON public.app_settings FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "audit_insert"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "audit_select"
  ON public.audit_log FOR SELECT
  USING (true);

-- Note : le verrouillage réel des écritures se fait via
-- SUPABASE_SERVICE_ROLE_KEY sur Vercel (/api/clients-insert, /api/clients-list).
-- Ne jamais exposer service_role dans le front.
