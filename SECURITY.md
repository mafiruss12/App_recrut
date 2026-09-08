# Sécurité – Application K2L Services Suivi Recrutement

## Actions obligatoires avant mise en production

1. **Régénérer toutes les clés exposées**
   - Clé `service_role` Supabase (jamais côté client)
   - Clé anon si elle a fuité publiquement
   - Tokens GitHub / Vercel collés dans des chats

2. **Exécuter le schéma SQL**
   - Ouvrir le SQL Editor de Supabase
   - Coller et exécuter `src/lib/supabase-schema.sql`
   - Vérifier que les tables et politiques RLS sont actives

3. **Créer le premier manager**
   - Via SQL (exemple) :
   ```sql
   -- Le code sera hashé côté application (SHA-256 avec salt)
   -- Pour un manager, utiliser le portail /boss avec un code Direction
   ```

4. **Codes Direction**
   - Actuels (à changer en production) : `K2L2026`, `BOSS2026`, `K2L@DIR`
   - Préférer stocker ces codes dans `app_settings` et les faire tourner

5. **RLS**
   - Les politiques actuelles permettent le fonctionnement avec auth custom.
   - Pour un niveau bancaire : migrer vers Supabase Auth (OTP téléphone) + Edge Functions.

6. **Sessions**
   - Commercial : 12 h, un seul appareil actif (token serveur)
   - Manager : 8 h côté navigateur

7. **Ne jamais**
   - Committer `.env` avec des secrets
   - Partager la clé `service_role`
   - Laisser des données de démo en production

## Correctifs P0–P3 (sept. 2026)

### P0 — Doublons offline
- `syncOfflineQueue` re-vérifie `client_phone_clean` sur le serveur avant insert.
- En cas de doublon : message clair, audit `duplicate_blocked_on_sync`, sortie de la file.

### P0 — API sécurisée (service_role)
Sur Vercel, définir :
- `SUPABASE_URL` (ou `VITE_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY` (**jamais** dans le front)

Routes :
- `POST /api/clients-insert` — insert + anti-doublon + session
- `GET /api/clients-list` — liste selon rôle
- `POST /api/sheets-proxy` — feedback HTTP réel Google Sheets

Exécuter aussi `src/lib/supabase-schema-secure.sql` dans le SQL Editor.

### P1 — Messages
Erreurs de sync en français métier (doublon / réseau / conservé hors-ligne).

### P2 — Pagination
Dashboard direction : pages de 50 lignes ; chargement clients par lots de 1000 (plafond 20 000).

### P3 — Vers auth forte
Prochaine étape recommandée : Supabase Auth OTP + Edge Functions exclusives pour login/insert.
