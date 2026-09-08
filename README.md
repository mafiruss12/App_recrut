# K2L Services – Suivi Recrutement

Application PWA professionnelle de suivi de recrutement terrain.

## Stack
- React 19 + TypeScript + Vite
- Tailwind CSS
- Supabase (PostgreSQL + RLS)
- PWA (installable)
- Export Excel / PDF
- Sync Google Sheets (webhook)

## Déploiement
1. Exécuter `src/lib/supabase-schema.sql` dans le SQL Editor Supabase
2. Configurer les variables d’environnement si besoin
3. `bun install` / `npm install`
4. `bun run build` puis déployer sur Vercel

## Accès
- **Commercial** : `/` — téléphone + code personnel
- **Direction** : `/boss` — code Direction

## Sécurité
Voir `SECURITY.md`. Régénérer immédiatement toute clé ayant été exposée.
