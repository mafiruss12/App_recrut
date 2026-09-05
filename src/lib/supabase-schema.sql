-- =======================================================
-- SCHEMA SQL POUR PROJET SUPABASE: wfeygwvvvyjomyahdgrc
-- APPLICATION: Suivi Recrutement K2L
-- =======================================================

-- 1. Table des Commerciaux & Gestionnaires
CREATE TABLE IF NOT EXISTS public.commerciaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(50) UNIQUE NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  localite VARCHAR(150),
  cabinet VARCHAR(150),
  partenaire VARCHAR(150),
  action VARCHAR(255),
  role VARCHAR(20) DEFAULT 'commercial', -- 'commercial' ou 'manager'
  is_active BOOLEAN DEFAULT true,
  session_token VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_active_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table des Clients recrutés
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_phone VARCHAR(50) NOT NULL,
  client_phone_clean VARCHAR(50) NOT NULL, -- Numéro normalisé sans espace ni indicatif pour détection instantanée
  commercial_id UUID REFERENCES public.commerciaux(id) ON DELETE SET NULL,
  commercial_name VARCHAR(255),
  commercial_phone VARCHAR(50),
  cabinet VARCHAR(150),
  localite VARCHAR(150),
  partenaire VARCHAR(150),
  action VARCHAR(255),
  status VARCHAR(30) DEFAULT 'synced', -- 'synced', 'pending', 'duplicate_blocked'
  notes TEXT,
  synced_to_sheets BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. Index pour recherche ultra-rapide des doublons sur tout l'historique
CREATE INDEX IF NOT EXISTS idx_clients_phone_clean ON public.clients(client_phone_clean);
CREATE INDEX IF NOT EXISTS idx_clients_commercial_id ON public.clients(commercial_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);

-- 4. Table des Paramètres Globaux et Synchronisation Google Sheets
CREATE TABLE IF NOT EXISTS public.app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5. Activer Row Level Security (RLS) avec politique ouverte pour l'application
ALTER TABLE public.commerciaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read/write on commerciaux" 
  ON public.commerciaux FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read/write on clients" 
  ON public.clients FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read/write on app_settings" 
  ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- 6. Insertion des données initiales par défaut
INSERT INTO public.commerciaux (phone, code, name, localite, cabinet, partenaire, action, role)
VALUES 
  ('0708091011', '1234', 'Mafi Russ', 'Abidjan Plateau', 'Cabinet Alpha', 'Partenaire Orange', 'Prospection Terrain', 'commercial'),
  ('0102030405', '5678', 'Jean Dupont', 'Cocody', 'Buro Pro', 'Partenaire MTN', 'Recrutement Direct', 'commercial'),
  ('0505050505', '2026', 'Directeur K2L', 'Siège Abidjan', 'Direction Générale', 'K2L Groupe', 'Supervision Globale', 'manager')
ON CONFLICT (phone) DO NOTHING;
