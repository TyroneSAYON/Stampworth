# Deploy Stampworth Backend to DigitalOcean

This repository is a monorepo. The deployable server is the NestJS API in `backend/`.

Architecture target:

- DigitalOcean App Platform hosts the backend app.
- Supabase remains the database/auth/storage provider.
- The backend connects to Supabase using environment variables.

## Why "No components detected" happened

DigitalOcean scanned repository root and did not find an app marker before. This repo now includes:

- `Dockerfile` at root
- `.do/app.yaml` App Spec

Either one resolves auto-detection.

## Option A (Recommended): Deploy with App Spec

1. In DigitalOcean App Platform, choose **Create App**.
2. Select your GitHub repo.
3. Choose **App Spec** and point to `.do/app.yaml`.
4. Edit placeholders in the spec:
   - `TyroneSAYON/Stampworth` (or your fork)
   - `REPLACE_WITH_SUPABASE_URL`
   - `REPLACE_WITH_SUPABASE_ANON_KEY`
   - `REPLACE_WITH_SUPABASE_SERVICE_ROLE_KEY`
5. Deploy.

Do not commit real Supabase keys to git. Set the real values in the App Platform UI secrets.

Health check endpoint is `/api/health`.

## Option B: Deploy from UI without App Spec

1. Create a Web Service from the same repo.
2. Use Dockerfile build (detected from root).
3. Confirm port is `8080`.
4. Set runtime env vars:
   - `NODE_ENV=production`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy.

## Post-deploy checks

- Open `https://<your-app-domain>/api/health`
- Expect JSON health response.

## Notes

- `customerapp/` and `businessapp/` are Expo mobile apps and are not deployed as App Platform web services.
- Run SQL migrations in Supabase before production traffic.
- If any Supabase keys were accidentally committed before, rotate them in Supabase immediately.
