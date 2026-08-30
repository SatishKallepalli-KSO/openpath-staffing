# Database

- Local default: SQLite at `apps/api/data/openpath.db`
- Production: Neon Free Postgres via `DATABASE_URL` (pooled, `sslmode=require`)

Neon project: `openpath-staffing` (`still-star-62841437`), org `org-falling-bird-44330402`, region `aws-us-west-2`. GitHub and Render use the name `saventra-technologies`. The Neon project name was left as created.

Create or copy the **pooled** connection string and set it on Render as `DATABASE_URL`. Do not commit the password.

```bash
neonctl connection-string \
  --project-id still-star-62841437 \
  --org-id org-falling-bird-44330402 \
  --database-name neondb \
  --role-name neondb_owner \
  --pooled
```

Create a Neon project, copy the pooled connection string, and paste it into the Render service env as `DATABASE_URL`.

```bash
neonctl connection-string --pooled
```

Tables: `users`, `resumes`, `jobs`, `applications`, `activity`. Resume **files** are not stored on disk. Parsed text lives in `resumes.raw_text`.
