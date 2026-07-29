# CBHS Secure Logs

Local-first Next.js application for behavioral health providers to manage CBHS daily logs, weekly summaries, behavior libraries, electronic sign-off, audit events, and weekly PDF exports.

## Setup

1. Copy `.env.example` to `.env`.
2. Replace `NEXTAUTH_SECRET`, `INITIAL_ADMIN_PASSWORD`, and `SQLCIPHER_KEY`.
3. Install dependencies: `npm.cmd install`.
4. Create the database: `npm.cmd run prisma:migrate -- --name init`.
5. Seed the first Super Admin: `npm.cmd run prisma:seed`.
6. Start locally: `npm.cmd run dev`.

## Security Notes

- Passwords are hashed with bcrypt round 12.
- Sessions expire after 15 minutes and the client enforces idle logout.
- Server actions perform RBAC checks before sensitive writes.
- Signed daily CBHS entries are locked and used as source material for weekly summaries.
- Weekly summaries can be saved as drafts, signed with password re-authentication, and exported as CBHS-style weekly PDF packets.
- Audit logs are append-only through application code and do not have update/delete UI.
- Prisma uses SQLite locally. For PHI, run the database on an encrypted volume or a SQLCipher-enabled SQLite deployment and store `SQLCIPHER_KEY` outside source control.

## AWS Lightsail Deployment

The `deploy/lightsail-user-data.sh` script provisions a single-node pilot deployment for `zbhs.zagolseniorscare.com`:

- Ubuntu Lightsail instance
- Node.js/Next.js app service
- SQLite database under `/opt/zbhs/data`
- Caddy reverse proxy with automatic HTTPS
- temporary Super Admin credentials in `/root/zbhs-admin-credentials.txt`

For production PHI, harden the host before use: encrypted backups, restricted SSH, log retention, AWS BAA, OS patching, least-privilege IAM, and a documented recovery process.
