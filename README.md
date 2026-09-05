# K2L Suivi Recrutement

Application PWA de saisie terrain et de supervision des recrutements K2L.

## Architecture

- React + Vite + TypeScript pour l’interface.
- Supabase Auth pour les sessions.
- Supabase PostgreSQL comme source de vérité.
- IndexedDB comme cache local et file offline.
- Google Sheets comme destination de reporting optionnelle.

Le navigateur ne contient jamais de clé Supabase service-role et aucune donnée de démonstration n’est créée automatiquement.

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

Renseigner dans `.env.local` :

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

La clé `service_role` ne doit jamais être ajoutée à `.env.local`, au frontend ou au dépôt.

## Base Supabase

1. Créer les utilisateurs dans **Supabase Auth** avec l’authentification téléphone/password activée.
2. Appliquer `src/lib/supabase-schema.sql` dans le SQL Editor après sauvegarde des données existantes.
3. Pour chaque utilisateur, créer ou mettre à jour son profil dans `public.commerciaux` et renseigner son `user_id` avec l’UUID de `auth.users`.
4. Donner `role = 'manager'` uniquement aux comptes Direction.
5. Vérifier qu’aucun compte actif n’est dépourvu de `user_id`.

Exemple de liaison réalisée par un administrateur :

```sql
update public.commerciaux
set user_id = '<AUTH_USER_UUID>', phone = '+2250708091011'
where phone = '0708091011';
```

Les codes historiques de démonstration ne sont plus supportés.

## Tests et build

```bash
npm run lint
npm test
npm run build
```

Le build génère le service worker PWA et le manifest.

## Google Sheets

La synchronisation Google Sheets est optionnelle. Le webhook doit être une URL HTTPS Google Apps Script. Le script de réception se trouve dans `src/lib/google-sheets-script.js`.

Pour une exploitation sensible, il est recommandé de déplacer l’appel Google Sheets dans une Supabase Edge Function afin de ne pas exposer le webhook aux appareils terrain.

## Sécurité

- Les politiques RLS Supabase refusent les accès anonymes.
- Les données client ne sont pas stockées dans `localStorage`.
- Les données offline sont conservées dans IndexedDB et restent un cache local, jamais une frontière d’autorisation.
- Les doublons sont bloqués côté navigateur pour l’UX et côté PostgreSQL par contrainte unique.
- Les exports utilisent un CSV compatible Excel et protègent contre l’injection de formules.
