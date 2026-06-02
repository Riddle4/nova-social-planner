# Nova Social Planner

MVP Next.js pour Nova, l'agent IA community manager connecté à Cosmo AI.

## Lancer en local

1. Copier `.env.example` vers `.env` et renseigner `DATABASE_URL`.
2. Installer les dépendances avec `npm install`.
3. Générer et migrer Prisma avec `npx prisma migrate dev --name init`.
4. Ajouter des données de démo avec `npm run prisma:seed`.
5. Lancer l'application avec `npm run dev`.

`OPENAI_API_KEY` est optionnel pour le MVP. Sans clé, les routes Nova retournent des réponses structurées de secours.

## Routes principales

- `/dashboard`
- `/calendar`
- `/posts`
- `/posts/[id]`
- `/services`
- `/events`
- `/media`
- `/nova`

## API Nova

- `POST /api/nova/strategy`
- `POST /api/nova/generate-post`

## Déploiement production

Stack prévue :

- GitHub : `https://github.com/Riddle4/nova-social-planner.git`
- Supabase : PostgreSQL cloud + Storage média
- Render : web service Node

### Variables Render

À renseigner dans Render :

- `DATABASE_URL` : connection string PostgreSQL Supabase avec SSL.
- `OPENAI_API_KEY` : clé API OpenAI.
- `SUPABASE_URL` : URL du projet Supabase, par exemple `https://xxxx.supabase.co`.
- `SUPABASE_SERVICE_ROLE_KEY` : clé service role Supabase, côté serveur uniquement.
- `SUPABASE_STORAGE_BUCKET` : `nova-media`.
- `AUTH_SECRET` : secret long et aléatoire pour signer la session.
- `NOVA_ACCESS_PASSWORD` : mot de passe d'accès à la plateforme.
- `META_ACCESS_TOKEN` : token Meta avec droits de publication sur la page Facebook et le compte Instagram Business.
- `META_GRAPH_VERSION` : `v24.0`.
- `NOVA_DEFAULT_COMPANY_ID` : `demo-company` pour conserver la même entreprise par défaut.
- `NOVA_TEXT_MODEL` : `gpt-5.5`.
- `NOVA_IMAGE_MODEL` : `gpt-image-1.5`.
- `NOVA_IMAGE_FALLBACK_MODEL` : `gpt-image-1`.

### Render Blueprint

Le fichier `render.yaml` configure :

- build : `npm ci && npm run db:deploy && npm run build`
- start : `npm run start`
- région : Frankfurt
- auto-deploy depuis la branche `main`

### Médias en production

Les uploads locaux dans `public/uploads` ne sont pas versionnés. En production, Nova utilise Supabase Storage quand les variables `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et `SUPABASE_STORAGE_BUCKET` sont configurées.

Pour migrer les médias locaux existants vers Supabase Storage :

```bash
DATABASE_URL="postgresql://..." \
SUPABASE_URL="https://xxxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="..." \
SUPABASE_STORAGE_BUCKET="nova-media" \
npm run storage:migrate
```
