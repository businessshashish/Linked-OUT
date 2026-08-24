# LinkedOut MVP

Functional MVP for the LinkedOut workplace-exit intelligence concept.

## Start locally

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Then open:

http://localhost:3000

## Seed logins

Admin:
- Email: admin@linkedout.local
- Password: ChangeMe123!

Employer demo:
- Email: employer@acme.example
- Password: Demo123!

Change the admin password before any public deployment.


## macOS prerequisites

- Node.js 22 or 24 LTS recommended
- Docker Desktop installed and running

If your prompt already ends in `linkedout %`, do not run `cd linkedout` again.

After installing Docker Desktop, verify it with:

```bash
docker --version
docker compose version
```
