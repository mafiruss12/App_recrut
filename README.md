# K2L Suivi Recrutement

Plateforme web et mobile installable pour piloter les recrutements terrain K2L.

## Espaces

- `/` : accueil public.
- `/commercial` : saisie terrain, mode offline et historique personnel.
- `/admin` : espace Boss/Manager d’une organisation.
- `/super-admin` : console propriétaire de la plateforme.

Les accès sont séparés par rôle et par organisation :

- `commercial` : ses propres saisies ;
- `admin` : les commerciaux et clients de son organisation ;
- `super_admin` : toutes les organisations et tous les administrateurs.

## Architecture

- React + Vite + TypeScript.
- Supabase Auth pour les sessions.
- Supabase PostgreSQL comme source de vérité.
- RLS multi-organisation.
- IndexedDB comme cache local et file offline.
- Service worker PWA pour l’installation web/mobile.
- Edge Functions Supabase pour créer les comptes et générer les codes commerciaux.
- Google Sheets comme intégration de reporting optionnelle.

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

Variables frontend :

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

La clé `service_role` ne doit jamais être ajoutée au frontend ou au dépôt.

## Mise en place Supabase

1. Sauvegarder la base existante.
2. Appliquer `src/lib/supabase-schema.sql` dans le SQL Editor.
3. Créer le premier compte `super_admin` dans Supabase Auth.
4. Lier son UUID à une ligne `public.commerciaux` avec `role = 'super_admin'`.
5. Déployer les fonctions Supabase :

```bash
supabase functions deploy provision-commercial
supabase functions deploy provision-admin
supabase secrets set CODE_PEPPER="une-valeur-secrete-longue"
```

Les fonctions utilisent automatiquement `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` du projet Supabase. La service-role key reste uniquement côté Edge Function.

Exemple de liaison du premier super administrateur :

```sql
update public.commerciaux
set user_id = '<AUTH_USER_UUID>', role = 'super_admin', organization_id = null
where phone = '+2250708091011';
```

## Codes commerciaux

Un Boss ou un Super Administrateur crée le commercial depuis son espace. L’Edge Function :

- génère un code aléatoire de 8 chiffres ;
- crée le compte Supabase Auth ;
- crée le profil dans l’organisation ;
- conserve uniquement une empreinte du code ;
- retourne le code une seule fois à l’administrateur.

Le code reste fixe jusqu’à sa régénération. Il ne doit jamais être stocké dans un document public.

## Tests et build

```bash
npm run lint
npm test
npm run build
npm audit
```

Le build génère le manifest et le service worker PWA.

## Google Sheets

Le webhook est optionnel et réservé aux administrateurs. Pour des données sensibles, l’appel Google Sheets doit être déplacé dans une Edge Function afin de ne pas exposer le webhook aux appareils terrain.
