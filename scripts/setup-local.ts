import { createHash, randomBytes } from "node:crypto";
import { open, chmod } from "node:fs/promises";

// Creates only a new .env; never modifies a pre-existing environment.
const filename = ".env";
let handle;
try {
  handle = await open(filename, "wx", 0o600);
  const password = randomBytes(24).toString("base64url");
  const dbPassword = randomBytes(24).toString("base64url");
  await handle.writeFile(`# Generated for local use only. Do not commit or share this file.
PUBLIC_API_URL=
DATABASE_URL=postgresql://paws_local:${dbPassword}@127.0.0.1:5432/paws_local
PAWS_ADMIN_EMAIL=admin@example.invalid
PAWS_ADMIN_PASSWORD_SHA256=${createHash("sha256").update(password).digest("hex")}
PAWS_SESSION_SECRET=${randomBytes(32).toString("hex")}
PAWS_PUBLIC_API_URL=http://127.0.0.1:3314
PAWS_ALLOWED_ORIGINS=http://localhost:4321,http://127.0.0.1:4321
PAWS_PROJECT_ROOT=
PORT=3314
PAWS_FORM_ENABLED=false
PAWS_FORM_EMAIL_DRY_RUN=true
`);
  await handle.close();
  await chmod(filename, 0o600);
  console.log(
    "Created private .env. Keep these generated local credentials in your password manager:",
  );
  console.log(
    `Admin login: admin@example.invalid\nAdmin password: ${password}\nLocal PostgreSQL role password: ${dbPassword}`,
  );
  console.log(
    "Next create the paws_local role/database per docs/backend.md. PUBLIC_API_URL stays blank until you opt into the backend.",
  );
} catch (err) {
  if (handle) await handle.close().catch(() => {});
  console.error(
    (err as NodeJS.ErrnoException).code === "EEXIST"
      ? ".env already exists; refusing to overwrite. Edit it locally or move it aside yourself."
      : "Could not create .env; check directory permissions.",
  );
  process.exitCode = 1;
}
