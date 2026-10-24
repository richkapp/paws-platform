import path from "node:path";

export type Environment = Record<string, string | undefined>;

export function readConfig(env: Environment = process.env) {
  const required = (name: string) => {
    const value = env[name]?.trim();
    if (!value)
      throw new Error(
        `${name} is required. See .env.example and docs/backend.md; generate local credentials with bun run setup:local.`,
      );
    return value;
  };
  const bool = (name: string, fallback: boolean) => {
    const value = env[name]?.trim();
    if (!value) return fallback;
    if (value !== "true" && value !== "false")
      throw new Error(`${name} must be true or false`);
    return value === "true";
  };
  const databaseUrl = required("DATABASE_URL");
  assertLocalDatabase(databaseUrl);
  const adminEmail = required("PAWS_ADMIN_EMAIL").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail))
    throw new Error("PAWS_ADMIN_EMAIL must be an email address");
  const adminPasswordSha256 = required("PAWS_ADMIN_PASSWORD_SHA256");
  if (!/^[a-fA-F0-9]{64}$/.test(adminPasswordSha256))
    throw new Error(
      "PAWS_ADMIN_PASSWORD_SHA256 must contain 64 hexadecimal characters",
    );
  const sessionSecret = required("PAWS_SESSION_SECRET");
  if (sessionSecret.length < 32)
    throw new Error(
      "PAWS_SESSION_SECRET must contain at least 32 characters; use bun run setup:local",
    );
  const port = Number(env.PORT || 3314);
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error("PORT must be an integer from 0 to 65535");
  const publicApiUrl = (
    env.PAWS_PUBLIC_API_URL || `http://127.0.0.1:${port}`
  ).replace(/\/$/, "");
  const apiUrl = new URL(publicApiUrl);
  if (
    !["http:", "https:"].includes(apiUrl.protocol) ||
    apiUrl.username ||
    apiUrl.password ||
    apiUrl.search ||
    apiUrl.hash ||
    apiUrl.pathname !== "/"
  )
    throw new Error(
      "PAWS_PUBLIC_API_URL must be an HTTP(S) origin without a path",
    );
  const allowedOrigins = (
    env.PAWS_ALLOWED_ORIGINS || "http://localhost:4321,http://127.0.0.1:4321"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  for (const origin of allowedOrigins) {
    if (new URL(origin).origin !== origin || !/^https?:\/\//.test(origin))
      throw new Error(
        "PAWS_ALLOWED_ORIGINS must contain exact HTTP(S) origins, not wildcards or paths",
      );
  }
  const smtpPort = Number(env.PAWS_FORM_SMTP_PORT || 587);
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535)
    throw new Error("PAWS_FORM_SMTP_PORT must be a valid port");
  const formEmailDryRun = bool("PAWS_FORM_EMAIL_DRY_RUN", true);
  const smtp = {
    host: env.PAWS_FORM_SMTP_HOST?.trim() || "",
    port: smtpPort,
    secure: bool("PAWS_FORM_SMTP_SECURE", false),
    user: env.PAWS_FORM_SMTP_USER || "",
    password: env.PAWS_FORM_SMTP_PASSWORD || "",
    from: env.PAWS_FORM_FROM_EMAIL?.trim() || "",
    recipient: env.PAWS_FORM_RECIPIENT_EMAIL?.trim() || "",
  };
  if (!formEmailDryRun && (!smtp.host || !smtp.from || !smtp.recipient))
    throw new Error(
      "Email delivery needs explicit SMTP host, PAWS_FORM_FROM_EMAIL and PAWS_FORM_RECIPIENT_EMAIL; otherwise keep PAWS_FORM_EMAIL_DRY_RUN=true",
    );
  for (const address of [smtp.from, smtp.recipient].filter(Boolean)) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
      throw new Error(
        "Form email addresses must be single valid email addresses",
      );
  }
  return {
    databaseUrl,
    adminEmail,
    adminPasswordSha256: adminPasswordSha256.toLowerCase(),
    sessionSecret,
    port,
    publicApiUrl,
    allowedOrigins,
    projectRoot: path.resolve(env.PAWS_PROJECT_ROOT || process.cwd()),
    formEnabled: bool("PAWS_FORM_ENABLED", false),
    formEmailDryRun,
    smtp,
  };
}

export function assertLocalDatabase(connectionString: string): void {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL URL for local PostgreSQL",
    );
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.search ||
    url.hash ||
    !/^\/[a-zA-Z0-9_]+$/.test(url.pathname)
  ) {
    throw new Error(
      "DATABASE_URL must target local PostgreSQL (localhost/127.0.0.1/::1), a named database, and no query overrides. Do not use a production database.",
    );
  }
}
