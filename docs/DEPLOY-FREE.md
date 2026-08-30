# Free deploy: Render + Neon

Same pattern as murali-transport: Render Free Docker web service + Neon Free Postgres.

## Render

1. Push this repo to GitHub (already at https://github.com/SatishKallepalli-KSO/saventra-technologies).
2. Open: https://render.com/deploy?repo=https://github.com/SatishKallepalli-KSO/saventra-technologies
3. Set `ADMIN_PIN` (8+ characters). `JWT_SECRET` is generated.
4. Set `DATABASE_URL` to the Neon **pooled** URL (see [DATABASE.md](./DATABASE.md)).
5. Health: `https://saventra-technologies.onrender.com/healthz`

Without `DATABASE_URL` the container falls back to SQLite on the local disk. That data disappears when Render sleeps or rebuilds. Use Neon for anything you want to keep.

## Local

```bash
npm install
npm run dev:api
npm run dev
```

Optional live jobs:

```bash
export ADZUNA_APP_ID=...
export ADZUNA_APP_KEY=...
```

## Custom domain later

Add the hostname under Render Custom Domains, then CNAME it to `saventra-technologies.onrender.com`. Set `APP_URL` to the public https origin.
