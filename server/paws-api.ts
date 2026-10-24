import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { mkdir, readdir, rename, lstat, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import pg from "pg";
import nodemailer from "nodemailer";
import { readConfig, type Environment } from "./config";

const { Pool } = pg;

const DOG_SIZES = [
  "small",
  "small-medium",
  "medium",
  "medium-large",
  "large",
] as const;
type DogSize = (typeof DOG_SIZES)[number];
type DogTraits = Record<string, unknown>;

type DogRow = {
  id: string;
  name: string;
  size: DogSize;
  sex: "male" | "female" | null;
  age: string | null;
  description: string | null;
  photo_url: string | null;
  is_adopted: boolean;
  traits: DogTraits | null;
  created_at: string;
  updated_at: string;
};

type DogPayload = {
  name?: string;
  size?: DogSize;
  sex?: "male" | "female" | null | "";
  age?: string;
  description?: string;
  photo_url?: string;
  is_adopted?: boolean;
  traits?: DogTraits;
};

const FORM_SUBMISSION_KINDS = [
  "contact",
  "sponsorship",
  "visit",
  "adoption_interest",
  "volunteer",
  "supply_donation",
  "foster_home",
] as const;
type FormSubmissionKind = (typeof FORM_SUBMISSION_KINDS)[number];

type FormSubmissionPayload = {
  kind?: string;
  locale?: string;
  source?: string;
  pageUrl?: string;
  contextLabel?: string;
  contextValue?: string;
  name?: string;
  email?: string;
  phone?: string;
  preferredTime?: string;
  amount?: string;
  business?: string;
  contributionMethod?: string;
  workTypes?: string[] | string;
  supplyTypes?: string[] | string;
  fosterDetails?: Record<string, unknown>;
  message?: string;
  website?: string;
};

type NormalizedFormSubmission = {
  kind: FormSubmissionKind;
  locale: "pt" | "en";
  source: string;
  pageUrl: string;
  contextLabel: string;
  contextValue: string;
  name: string;
  email: string;
  phone: string;
  preferredTime: string;
  amount: string;
  business: string;
  contributionMethod: string;
  workTypes: string;
  supplyTypes: string;
  fosterDetails: Record<string, string | string[]>;
  message: string;
  payload: Record<string, unknown>;
};

export async function startApi(env: Environment = process.env) {
  const config = readConfig(env);
  const {
    port: PORT,
    databaseUrl: DATABASE_URL,
    adminEmail: ADMIN_EMAIL,
    adminPasswordSha256: ADMIN_PASSWORD_SHA256,
    sessionSecret: SESSION_SECRET,
    publicApiUrl: PUBLIC_API_URL,
    projectRoot: PROJECT_ROOT,
    allowedOrigins: ALLOWED_ORIGINS,
    formEmailDryRun: FORM_EMAIL_DRY_RUN,
  } = config;
  // Runtime uploads are separate from the versioned demo assets.
  const DOG_IMAGES_ROOT = path.join(PROJECT_ROOT, "storage", "dog-photos");
  // Photos of deleted dogs are moved here (outside public/) so a new dog with the same name starts clean.
  const DOG_IMAGES_ARCHIVE = path.join(PROJECT_ROOT, "archive", "dog-photos");
  const {
    recipient: FORM_RECIPIENT_EMAIL,
    from: FORM_FROM_EMAIL,
    host: FORM_SMTP_HOST,
    port: FORM_SMTP_PORT,
    user: FORM_SMTP_USER,
    password: FORM_SMTP_PASSWORD,
    secure: FORM_SMTP_SECURE,
  } = config.smtp;

  const loginFailures = new Map<string, number[]>();

  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 8,
    connectionTimeoutMillis: 5000,
  });
  class BadRequest extends Error {}
  let mutationQueue: Promise<unknown> = Promise.resolve();
  function mutate(action: () => Promise<Response>): Promise<Response> {
    const next = mutationQueue.then(action);
    mutationQueue = next.catch(() => undefined);
    return next;
  }

  async function safePath(
    root: string,
    ...segments: string[]
  ): Promise<string> {
    const target = path.resolve(root, ...segments);
    if (target !== root && !target.startsWith(root + path.sep))
      throw new BadRequest("Invalid media path");
    // Reject symlinks at every component, including a configured storage root.
    const relative = path.relative(PROJECT_ROOT, target);
    if (relative.startsWith("..") || path.isAbsolute(relative))
      throw new BadRequest("Invalid media path");
    let current = PROJECT_ROOT;
    for (const segment of ["", ...relative.split(path.sep)]) {
      current = path.join(current, segment);
      try {
        if ((await lstat(current)).isSymbolicLink())
          throw new BadRequest("Symlinks are not allowed in media storage");
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }
    }
    return target;
  }

  async function readJson(request: Request): Promise<Record<string, unknown>> {
    if (!request.headers.get("content-type")?.includes("application/json"))
      throw new BadRequest("Content-Type must be application/json");
    const body = await request.text();
    if (Buffer.byteLength(body) > 65536)
      throw new BadRequest("JSON payload is too large (64 KiB maximum)");
    let value: unknown;
    try {
      value = JSON.parse(body);
    } catch {
      throw new BadRequest("Invalid JSON payload");
    }
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new BadRequest("JSON payload must be an object");
    return value as Record<string, unknown>;
  }

  function toSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function base64Url(input: string | Buffer): string {
    return Buffer.from(input).toString("base64url");
  }

  function sha256(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
  }

  function constantTimeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  function signToken(email: string): string {
    const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = base64Url(
      JSON.stringify({
        sub: email,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14,
      }),
    );
    const signature = createHmac("sha256", SESSION_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");
    return `${header}.${payload}.${signature}`;
  }

  function verifyToken(token: string): boolean {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [header, payload, signature] = parts;
    const expected = createHmac("sha256", SESSION_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");
    if (!constantTimeEqual(signature, expected)) return false;

    try {
      const decoded = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8"),
      );
      return (
        decoded.sub === ADMIN_EMAIL &&
        Number(decoded.exp) > Math.floor(Date.now() / 1000)
      );
    } catch {
      return false;
    }
  }

  function corsHeaders(origin: string | null): HeadersInit {
    return {
      ...(origin && ALLOWED_ORIGINS.includes(origin)
        ? { "Access-Control-Allow-Origin": origin }
        : {}),
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      Vary: "Origin",
    };
  }

  function json(
    data: unknown,
    init: ResponseInit = {},
    origin: string | null = null,
  ): Response {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...corsHeaders(origin),
        ...(init.headers ?? {}),
      },
    });
  }

  function error(
    message: string,
    status = 400,
    origin: string | null = null,
  ): Response {
    return json({ error: message }, { status }, origin);
  }

  function requireAuth(
    request: Request,
    origin: string | null,
  ): Response | null {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    return token && verifyToken(token)
      ? null
      : error("Unauthorized", 401, origin);
  }

  async function listPhotoFiles(slug: string): Promise<string[]> {
    try {
      const dir = await safePath(DOG_IMAGES_ROOT, slug);
      const files = await readdir(dir);
      return files
        .filter((file) => /^photo-\d+\.jpg$/.test(file))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  }

  function photoUrl(slug: string, filename: string): string {
    const pathname = `/images/dogs/${encodeURIComponent(slug)}/${encodeURIComponent(filename)}`;
    return PUBLIC_API_URL ? `${PUBLIC_API_URL}${pathname}` : pathname;
  }

  async function serializeDog(row: DogRow) {
    const slug = toSlug(row.name);
    const files = await listPhotoFiles(slug);
    const photos = files.map((file) => photoUrl(slug, file));
    return {
      id: row.id,
      name: row.name,
      size: row.size,
      sex: row.sex,
      age: row.age ?? "",
      description: row.description ?? "",
      photo_url: photos[0] ?? row.photo_url ?? "",
      photos,
      is_adopted: row.is_adopted,
      traits: row.traits ?? {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async function serializeDogs(rows: DogRow[]) {
    return Promise.all(rows.map(serializeDog));
  }

  function cleanPayload(
    input: DogPayload,
    existing?: DogRow,
  ): Required<DogPayload> {
    for (const key of [
      "name",
      "size",
      "age",
      "description",
      "photo_url",
    ] as const) {
      if (input[key] !== undefined && typeof input[key] !== "string")
        throw new BadRequest(`${key} must be a string`);
    }
    if (input.is_adopted !== undefined && typeof input.is_adopted !== "boolean")
      throw new BadRequest("is_adopted must be a boolean");
    if (
      input.traits !== undefined &&
      (!input.traits ||
        typeof input.traits !== "object" ||
        Array.isArray(input.traits))
    )
      throw new BadRequest("traits must be an object");
    const name = (input.name ?? existing?.name ?? "").trim();
    const size = input.size ?? existing?.size ?? "medium";
    const sex =
      input.sex === "" || input.sex === null
        ? null
        : (input.sex ?? existing?.sex ?? null);

    if (!name || name.length > 100 || !toSlug(name))
      throw new BadRequest(
        "Name must contain 1–100 characters and produce a nonempty Latin-letter/number slug",
      );
    if (!(DOG_SIZES as readonly string[]).includes(size))
      throw new BadRequest("Invalid size");
    if (sex !== null && !["male", "female"].includes(sex))
      throw new BadRequest("Invalid sex");
    if (
      (input.age?.length ?? 0) > 100 ||
      (input.description?.length ?? 0) > 12000
    )
      throw new BadRequest("Age or description is too long");
    if (
      input.photo_url !== undefined &&
      input.photo_url !== "" &&
      (!/^\/images\/[a-zA-Z0-9/_-]+\.(svg|jpg|jpeg|png|webp)$/.test(
        input.photo_url,
      ) ||
        input.photo_url.includes(".."))
    )
      throw new BadRequest("photo_url must be a local /images/ asset path");
    if (JSON.stringify(input.traits ?? {}).length > 4096)
      throw new BadRequest("traits are too large");
    const traits = input.traits ?? {};
    for (const [key, value] of Object.entries(traits)) {
      if (key === "energia" && ![1, 2, 3].includes(value as number))
        throw new BadRequest("energia must be 1, 2 or 3");
      if (key === "receio" && ![0, 1, 2, 3].includes(value as number))
        throw new BadRequest("receio must be 0, 1, 2 or 3");
      if (
        ["carente", "fuga", "padrinho"].includes(key) &&
        typeof value !== "boolean"
      )
        throw new BadRequest(`${key} must be a boolean`);
      if (
        ["aves", "criancas"].includes(key) &&
        !["sim", "nao"].includes(value as string)
      )
        throw new BadRequest(`${key} must be sim or nao`);
    }

    return {
      name,
      size,
      sex,
      age: input.age ?? existing?.age ?? "",
      description: input.description ?? existing?.description ?? "",
      photo_url: input.photo_url ?? existing?.photo_url ?? "",
      is_adopted: input.is_adopted ?? existing?.is_adopted ?? false,
      traits:
        input.traits &&
        typeof input.traits === "object" &&
        !Array.isArray(input.traits)
          ? input.traits
          : (existing?.traits ?? {}),
    };
  }

  async function getDogRow(id: string): Promise<DogRow | null> {
    const result = await pool.query<DogRow>(
      "select * from dogs where id = $1",
      [id],
    );
    return result.rows[0] ?? null;
  }

  async function ensureSchema(): Promise<void> {
    try {
      await pool.query(
        "select id, slug, name, size, sex, age, description, photo_url, is_adopted, traits, created_at, updated_at from dogs limit 0",
      );
      await pool.query(
        "select dog_id, filename, sort_order from dog_photos limit 0",
      );
      await pool.query(
        "select id, payload, email_sent, email_error, email_dry_run from form_submissions limit 0",
      );
    } catch (err) {
      await pool.end();
      const code = (err as NodeJS.ErrnoException).code || "database error";
      throw new Error(
        `Cannot open the clean local Paws schema (${code}). Check local PostgreSQL, DATABASE_URL and run bun run db:setup, then bun run db:seed. See docs/backend.md.`,
      );
    }
  }

  function cleanFormString(value: unknown, maxLength = 500): string {
    if (typeof value !== "string") return "";
    return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
  }

  function cleanMultiline(value: unknown, maxLength = 3000): string {
    if (typeof value !== "string") return "";
    return value
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim()
      .slice(0, maxLength);
  }

  function cleanMultiSelectValues(value: unknown, maxItems = 12): string {
    const rawItems = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",")
        : [];
    return rawItems
      .map((item) => cleanFormString(item, 120))
      .filter(Boolean)
      .slice(0, maxItems)
      .join(", ");
  }

  function cleanStructuredDetails(
    value: unknown,
    maxKeys = 40,
  ): Record<string, string | string[]> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      maxKeys,
    );
    const cleaned: Record<string, string | string[]> = {};

    for (const [rawKey, rawValue] of entries) {
      const key = cleanFormString(rawKey, 80);
      if (!key) continue;

      if (Array.isArray(rawValue)) {
        const values = rawValue
          .map((item) => cleanFormString(item, 180))
          .filter(Boolean)
          .slice(0, 20);
        if (values.length > 0) cleaned[key] = values;
        continue;
      }

      const scalar =
        typeof rawValue === "string" ||
        typeof rawValue === "number" ||
        typeof rawValue === "boolean"
          ? cleanFormString(String(rawValue), 500)
          : "";
      if (scalar) cleaned[key] = scalar;
    }

    return cleaned;
  }

  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function normalizeFormSubmission(
    input: FormSubmissionPayload,
  ): NormalizedFormSubmission | "bot" {
    if (cleanFormString(input.website, 200)) return "bot";

    const kind = cleanFormString(input.kind, 40) as FormSubmissionKind;
    if (!(FORM_SUBMISSION_KINDS as readonly string[]).includes(kind))
      throw new Error("Invalid form type");

    const normalized: NormalizedFormSubmission = {
      kind,
      locale: cleanFormString(input.locale, 5) === "en" ? "en" : "pt",
      source: cleanFormString(input.source, 80),
      pageUrl: cleanFormString(input.pageUrl, 500),
      contextLabel: cleanFormString(input.contextLabel, 80),
      contextValue: cleanFormString(input.contextValue, 160),
      name: cleanFormString(input.name, 160),
      email: cleanFormString(input.email, 200).toLowerCase(),
      phone: cleanFormString(input.phone, 80),
      preferredTime: cleanFormString(input.preferredTime, 120),
      amount: cleanFormString(input.amount, 80),
      business: cleanFormString(input.business, 120),
      contributionMethod: cleanFormString(input.contributionMethod, 160),
      workTypes: cleanMultiSelectValues(input.workTypes),
      supplyTypes: cleanMultiSelectValues(input.supplyTypes),
      fosterDetails: cleanStructuredDetails(input.fosterDetails),
      message: cleanMultiline(input.message, 3000),
      payload: {},
    };

    normalized.payload = {
      kind: normalized.kind,
      locale: normalized.locale,
      source: normalized.source,
      pageUrl: normalized.pageUrl,
      contextLabel: normalized.contextLabel,
      contextValue: normalized.contextValue,
      name: normalized.name,
      email: normalized.email,
      phone: normalized.phone,
      preferredTime: normalized.preferredTime,
      amount: normalized.amount,
      business: normalized.business,
      contributionMethod: normalized.contributionMethod,
      workTypes: normalized.workTypes,
      supplyTypes: normalized.supplyTypes,
      fosterDetails: normalized.fosterDetails,
      message: normalized.message,
    };

    if (!normalized.name) throw new Error("Name is required");
    if (!normalized.email || !isValidEmail(normalized.email))
      throw new Error("Valid email is required");

    if (normalized.kind === "sponsorship") {
      if (!normalized.amount) throw new Error("Monthly amount is required");
      if (!normalized.business) throw new Error("Business status is required");
      if (!normalized.contributionMethod)
        throw new Error("Contribution method is required");
    }

    if (normalized.kind === "visit" && !normalized.preferredTime) {
      throw new Error("Preferred visit time is required");
    }

    if (normalized.kind === "volunteer") {
      if (!normalized.preferredTime)
        throw new Error("Preferred volunteer time is required");
      if (!normalized.workTypes)
        throw new Error("At least one volunteer work type is required");
    }

    if (normalized.kind === "supply_donation") {
      if (!normalized.preferredTime)
        throw new Error("Preferred drop-off time is required");
      if (!normalized.supplyTypes)
        throw new Error("At least one supply donation type is required");
    }

    if (
      normalized.kind === "foster_home" &&
      Object.keys(normalized.fosterDetails).length === 0
    ) {
      throw new Error("Foster home details are required");
    }

    if (normalized.kind === "adoption_interest" && !normalized.contextValue) {
      throw new Error("Dog name is required");
    }

    return normalized;
  }

  function formSubject(submission: NormalizedFormSubmission): string {
    if (submission.kind === "sponsorship")
      return "Novo pedido de apadrinhamento mensal";

    if (submission.kind === "adoption_interest")
      return `Interesse em adoção — ${submission.contextValue}`;
    if (submission.kind === "volunteer") return "Novo pedido de voluntariado";
    if (submission.kind === "supply_donation")
      return "Novo pedido de donativo em espécie";
    if (submission.kind === "foster_home")
      return "Novo pedido de família de acolhimento temporário";
    if (submission.kind === "contact") return "Novo pedido de contacto";
    return `Pedido de visita — ${submission.contextValue || "Abrigo Paws"}`;
  }

  function formatStructuredDetails(
    details: Record<string, string | string[]>,
  ): string[] {
    return Object.entries(details).map(([key, value]) => {
      const rendered = Array.isArray(value) ? value.join(", ") : value;
      return `${key}: ${rendered}`;
    });
  }

  function formBody(submission: NormalizedFormSubmission): string {
    const label =
      submission.kind === "adoption_interest"
        ? "Cão"
        : submission.kind === "visit"
          ? submission.contextLabel || "Visita"
          : submission.kind === "volunteer"
            ? "Voluntariado"
            : submission.kind === "supply_donation"
              ? "Donativo em espécie"
              : submission.kind === "foster_home"
                ? "Família FAT"
                : "Origem";
    const lines = [
      `Novo pedido recebido através do site Paws.`,
      "",
      `Tipo: ${submission.kind}`,
      label && submission.contextValue
        ? `${label}: ${submission.contextValue}`
        : "",
      `Nome: ${submission.name || "Não indicado"}`,
      `Email: ${submission.email || "Não indicado"}`,
      `Telefone: ${submission.phone || "Não indicado"}`,
      submission.preferredTime
        ? `Dia/hora pretendidos: ${submission.preferredTime}`
        : "",
      submission.workTypes
        ? `Tipo(s) de voluntariado: ${submission.workTypes}`
        : "",
      submission.supplyTypes
        ? `Tipo(s) de donativo em espécie: ${submission.supplyTypes}`
        : "",
      submission.kind === "foster_home"
        ? "Detalhes da família de acolhimento:"
        : "",
      ...(submission.kind === "foster_home"
        ? formatStructuredDetails(submission.fosterDetails)
        : []),
      submission.amount
        ? `Contributo mensal pretendido: ${submission.amount}`
        : "",
      submission.business ? `Empresa: ${submission.business}` : "",
      submission.contributionMethod
        ? `Forma preferida para contribuir: ${submission.contributionMethod}`
        : "",
      `Mensagem: ${submission.message || "Não indicada"}`,
      "",
      `Página: ${submission.pageUrl || "Não indicada"}`,
      `Fonte: ${submission.source || "Não indicada"}`,
      `Idioma: ${submission.locale}`,
    ].filter(Boolean);
    return lines.join("\n");
  }

  function smtpConfigured(): boolean {
    return Boolean(FORM_SMTP_HOST && FORM_FROM_EMAIL && FORM_RECIPIENT_EMAIL);
  }

  async function sendSubmissionEmail(
    submission: NormalizedFormSubmission,
  ): Promise<{ sent: boolean; dryRun: boolean; error?: string }> {
    if (FORM_EMAIL_DRY_RUN) return { sent: false, dryRun: true };
    if (!smtpConfigured())
      return {
        sent: false,
        dryRun: false,
        error: "Email delivery is not configured",
      };

    try {
      const transporter = nodemailer.createTransport({
        host: FORM_SMTP_HOST,
        port: FORM_SMTP_PORT,
        secure: FORM_SMTP_SECURE,
        auth:
          FORM_SMTP_USER || FORM_SMTP_PASSWORD
            ? {
                user: FORM_SMTP_USER,
                pass: FORM_SMTP_PASSWORD,
              }
            : undefined,
      });
      await transporter.sendMail({
        from: FORM_FROM_EMAIL,
        to: FORM_RECIPIENT_EMAIL,
        replyTo: submission.email || undefined,
        subject: formSubject(submission),
        text: formBody(submission),
      });
      return { sent: true, dryRun: false };
    } catch (err) {
      console.error("form email delivery failed", err);
      return {
        sent: false,
        dryRun: false,
        error: err instanceof Error ? err.message : "Email delivery failed",
      };
    }
  }

  async function insertFormSubmission(
    submission: NormalizedFormSubmission,
  ): Promise<string> {
    const id = randomUUID();
    await pool.query(
      `insert into form_submissions (
      id, kind, locale, source, page_url, context_label, context_value, name, email, phone,
      preferred_time, amount, business, contribution_method, message, payload
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        id,
        submission.kind,
        submission.locale,
        submission.source,
        submission.pageUrl,
        submission.contextLabel,
        submission.contextValue,
        submission.name,
        submission.email,
        submission.phone,
        submission.preferredTime,
        submission.amount,
        submission.business,
        submission.contributionMethod,
        submission.message,
        submission.payload,
      ],
    );
    return id;
  }

  async function markFormEmailResult(
    id: string,
    result: { sent: boolean; dryRun: boolean; error?: string },
  ): Promise<void> {
    await pool.query(
      "update form_submissions set email_sent = $1, email_error = $2, email_dry_run = $3 where id = $4",
      [result.sent, result.error ?? null, result.dryRun, id],
    );
  }

  async function handleFormSubmit(
    request: Request,
    origin: string | null,
  ): Promise<Response> {
    if (!config.formEnabled)
      return error(
        "Public submissions are disabled. Configure PAWS_FORM_ENABLED explicitly to enable local storage.",
        503,
        origin,
      );
    const now = Date.now();
    formRequests = formRequests.filter((time) => now - time < 60000);
    if (formRequests.length >= 10)
      return error("Too many form submissions; try again later", 429, origin);
    formRequests.push(now);
    const payload = (await readJson(request)) as FormSubmissionPayload;

    let submission: NormalizedFormSubmission | "bot";
    try {
      submission = normalizeFormSubmission(payload);
    } catch (err) {
      return error(
        err instanceof Error ? err.message : "Invalid form submission",
        400,
        origin,
      );
    }

    if (submission === "bot") {
      return json({ ok: true, ignored: true }, {}, origin);
    }

    const id = await insertFormSubmission(submission);
    const mail = await sendSubmissionEmail(submission);
    await markFormEmailResult(id, mail);

    if (!mail.sent && !mail.dryRun) {
      return json(
        {
          ok: false,
          submissionId: id,
          emailSent: false,

          error: mail.error ?? "Email delivery failed",
        },
        { status: 503 },
        origin,
      );
    }

    return json(
      { ok: true, submissionId: id, emailSent: mail.sent, dryRun: mail.dryRun },
      { status: 201 },
      origin,
    );
  }

  async function handleListDogs(url: URL, origin: string | null) {
    const includeAdopted = url.searchParams.get("includeAdopted") === "true";
    const result = includeAdopted
      ? await pool.query<DogRow>("select * from dogs order by name asc")
      : await pool.query<DogRow>(
          "select * from dogs where is_adopted = false order by name asc",
        );
    return json({ dogs: await serializeDogs(result.rows) }, {}, origin);
  }

  async function handleGetDog(id: string, origin: string | null) {
    const row = await getDogRow(id);
    if (!row) return error("Dog not found", 404, origin);
    return json({ dog: await serializeDog(row) }, {}, origin);
  }

  async function archivePhotoFolder(slug: string): Promise<void> {
    if (!slug) return;
    const from = await safePath(DOG_IMAGES_ROOT, slug);
    if (
      !(await lstat(from).then(
        () => true,
        () => false,
      ))
    )
      return;
    await safePath(DOG_IMAGES_ARCHIVE);
    await mkdir(DOG_IMAGES_ARCHIVE, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await rename(
      from,
      await safePath(DOG_IMAGES_ARCHIVE, `${slug}-${stamp}-${randomUUID()}`),
    );
  }

  async function slugTaken(name: string, exceptId?: string): Promise<boolean> {
    const slug = toSlug(name);
    const result = await pool.query<{ id: string; name: string }>(
      "select id, name from dogs",
    );
    return result.rows.some(
      (row) => row.id !== exceptId && toSlug(row.name) === slug,
    );
  }

  async function handleCreateDog(request: Request, origin: string | null) {
    const payload = cleanPayload((await readJson(request)) as DogPayload);
    if (await slugTaken(payload.name))
      return error("Duplicate name", 409, origin);
    // A leftover folder from an earlier dog with this name must not become this dog's photos.
    await archivePhotoFolder(toSlug(payload.name));
    const result = await pool.query<DogRow>(
      `insert into dogs (name, size, sex, age, description, photo_url, is_adopted, traits, slug, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     returning *`,
      [
        payload.name,
        payload.size,
        payload.sex,
        payload.age,
        payload.description,
        payload.photo_url,
        payload.is_adopted,
        JSON.stringify(payload.traits),
        toSlug(payload.name),
      ],
    );
    return json(
      { dog: await serializeDog(result.rows[0]) },
      { status: 201 },
      origin,
    );
  }

  async function handleUpdateDog(
    id: string,
    request: Request,
    origin: string | null,
  ) {
    const existing = await getDogRow(id);
    if (!existing) return error("Dog not found", 404, origin);
    const payload = cleanPayload(
      (await readJson(request)) as DogPayload,
      existing,
    );
    const oldSlug = toSlug(existing.name);
    const newSlug = toSlug(payload.name);
    if (oldSlug !== newSlug) {
      if (!newSlug || (await slugTaken(payload.name, id)))
        return error("Duplicate name", 409, origin);
      // Photos live in a folder named after the dog: move it so a rename keeps them.
      const from = await safePath(DOG_IMAGES_ROOT, oldSlug);
      const to = await safePath(DOG_IMAGES_ROOT, newSlug);
      const exists = async (dir: string) =>
        lstat(dir).then(
          () => true,
          () => false,
        );
      await archivePhotoFolder(newSlug); // leftover from an earlier dog; no current dog uses it (checked above)
      if (await exists(from)) await rename(from, to);
    }
    const result = await pool.query<DogRow>(
      `update dogs
     set name = $1, size = $2, sex = $3, age = $4, description = $5, photo_url = $6, is_adopted = $7, traits = $8, slug = $10, updated_at = now()
     where id = $9
     returning *`,
      [
        payload.name,
        payload.size,
        payload.sex,
        payload.age,
        payload.description,
        payload.photo_url,
        payload.is_adopted,
        JSON.stringify(payload.traits),
        id,
        newSlug,
      ],
    );
    return json({ dog: await serializeDog(result.rows[0]) }, {}, origin);
  }

  async function handleDeleteDog(id: string, origin: string | null) {
    const existing = await getDogRow(id);
    if (!existing) return error("Dog not found", 404, origin);
    await archivePhotoFolder(toSlug(existing.name));
    await pool.query("delete from dogs where id = $1", [id]);
    return json({ ok: true }, {}, origin);
  }

  function nextPhotoNumber(files: string[]): number {
    const numbers = files
      .map((file) => file.match(/^photo-(\d+)\./i)?.[1])
      .filter(Boolean)
      .map((value) => Number(value));
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return max + 1;
  }

  async function handleUploadPhotos(
    id: string,
    request: Request,
    origin: string | null,
  ) {
    const dog = await getDogRow(id);
    if (!dog) return error("Dog not found", 404, origin);

    const form = await request.formData();
    const files = form
      .getAll("photos")
      .filter((item): item is File => item instanceof File);
    if (files.length === 0 || files.length > 8)
      return error("Upload between 1 and 8 photos", 400, origin);
    if (
      files.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    )
      return error(
        "Photos must be JPEG, PNG or WebP, at most 5 MiB each",
        400,
        origin,
      );
    const processed: Buffer[] = [];
    for (const file of files) {
      try {
        processed.push(
          await sharp(Buffer.from(await file.arrayBuffer()), {
            limitInputPixels: 40000000,
          })
            .rotate()
            .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 82 })
            .toBuffer(),
        );
      } catch {
        return error("Invalid or oversized image", 400, origin);
      }
    }

    const slug = toSlug(dog.name);
    const dir = await safePath(DOG_IMAGES_ROOT, slug);
    await mkdir(dir, { recursive: true });

    let currentFiles = await listPhotoFiles(slug);
    const uploaded: string[] = [];

    for (const buffer of processed) {
      const photoNumber = nextPhotoNumber(currentFiles);
      const filename = `photo-${String(photoNumber).padStart(2, "0")}.jpg`;
      const destination = await safePath(DOG_IMAGES_ROOT, slug, filename);
      await Bun.write(destination, buffer);
      await pool.query(
        `insert into dog_photos (dog_id, filename, sort_order)
       values ($1, $2, $3)
       on conflict (dog_id, filename) do update set sort_order = excluded.sort_order`,
        [id, filename, photoNumber],
      );
      uploaded.push(photoUrl(slug, filename));
      currentFiles = [...currentFiles, filename];
    }

    const first = (await listPhotoFiles(slug))[0];
    if (first) {
      await pool.query(
        "update dogs set photo_url = $1, updated_at = now() where id = $2",
        [photoUrl(slug, first), id],
      );
    }

    const updated = await getDogRow(id);
    return json(
      { dog: updated ? await serializeDog(updated) : null, uploaded },
      {},
      origin,
    );
  }

  async function handleDeletePhoto(
    id: string,
    filename: string,
    origin: string | null,
  ) {
    const dog = await getDogRow(id);
    if (!dog) return error("Dog not found", 404, origin);
    if (!/^photo-\d+\.(jpe?g|png|webp)$/i.test(filename))
      return error("Invalid filename", 400, origin);

    const slug = toSlug(dog.name);
    await unlink(await safePath(DOG_IMAGES_ROOT, slug, filename)).catch(
      (err) => {
        if (err.code !== "ENOENT") throw err;
      },
    );
    await pool.query(
      "delete from dog_photos where dog_id = $1 and filename = $2",
      [id, filename],
    );

    const first = (await listPhotoFiles(slug))[0];
    await pool.query(
      "update dogs set photo_url = $1, updated_at = now() where id = $2",
      [first ? photoUrl(slug, first) : "", id],
    );

    const updated = await getDogRow(id);
    return json(
      { dog: updated ? await serializeDog(updated) : null },
      {},
      origin,
    );
  }

  async function serveImage(
    slug: string,
    filename: string,
    origin: string | null,
  ) {
    if (
      !/^[a-z0-9-]+$/.test(slug) ||
      !/^photo-\d+\.(jpe?g|png|webp)$/i.test(filename)
    ) {
      return error("Invalid image path", 400, origin);
    }
    const file = Bun.file(await safePath(DOG_IMAGES_ROOT, slug, filename));
    if (!(await file.exists())) return error("Image not found", 404, origin);
    const type = filename.endsWith(".webp")
      ? "image/webp"
      : filename.endsWith(".png")
        ? "image/png"
        : "image/jpeg";
    return new Response(file, {
      headers: {
        ...corsHeaders(origin),
        "Content-Type": type,
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  await ensureSchema();
  let formRequests: number[] = [];

  let server: ReturnType<typeof Bun.serve>;
  try {
    server = Bun.serve({
      port: PORT,
      hostname: "127.0.0.1",
      maxRequestBodySize: 42 * 1024 * 1024,
      async fetch(request) {
        const origin = request.headers.get("origin");
        if (origin && !ALLOWED_ORIGINS.includes(origin))
          return error("Origin not allowed", 403);
        if (request.method === "OPTIONS")
          return new Response(null, {
            status: 204,
            headers: corsHeaders(origin),
          });

        try {
          const url = new URL(request.url);
          const parts = url.pathname.split("/").filter(Boolean);

          if (url.pathname === "/health" && request.method === "GET")
            return json(
              {
                ok: true,
                formsEnabled: config.formEnabled,
                emailDryRun: FORM_EMAIL_DRY_RUN,
              },
              {},
              origin,
            );
          if (url.pathname === "/forms/submit" && request.method === "POST")
            return await handleFormSubmit(request, origin);

          if (url.pathname === "/auth/login" && request.method === "POST") {
            // A single bounded bucket avoids trusting user-supplied proxy headers.
            const ip = "local";
            const now = Date.now();
            const recent = (loginFailures.get(ip) ?? []).filter(
              (t) => now - t < 15 * 60 * 1000,
            );
            if (recent.length >= 10)
              return error("Too many attempts", 429, origin);
            const body = (await readJson(request)) as {
              email?: string;
              password?: string;
            };
            if (
              typeof body.email !== "string" ||
              typeof body.password !== "string"
            )
              return error("Email and password must be strings", 400, origin);
            const email = (body.email ?? "").trim().toLowerCase();
            const passwordHash = sha256(body.password ?? "");
            if (
              email !== ADMIN_EMAIL.toLowerCase() ||
              !constantTimeEqual(passwordHash, ADMIN_PASSWORD_SHA256)
            ) {
              loginFailures.set(ip, [...recent, now]);
              return error("Invalid login", 401, origin);
            }
            loginFailures.delete(ip);
            return json({ token: signToken(ADMIN_EMAIL) }, {}, origin);
          }

          if (url.pathname === "/dogs" && request.method === "GET")
            return await handleListDogs(url, origin);
          if (url.pathname === "/dogs" && request.method === "POST") {
            const authError = requireAuth(request, origin);
            return (
              authError ??
              (await mutate(() => handleCreateDog(request, origin)))
            );
          }

          if (parts[0] === "dogs" && parts[1]) {
            const id = parts[1];
            if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id))
              return error("Invalid dog ID", 400, origin);
            if (parts.length === 2 && request.method === "GET")
              return await handleGetDog(id, origin);
            if (parts.length === 2 && request.method === "PUT") {
              const authError = requireAuth(request, origin);
              return (
                authError ??
                (await mutate(() => handleUpdateDog(id, request, origin)))
              );
            }
            if (parts.length === 2 && request.method === "DELETE") {
              const authError = requireAuth(request, origin);
              return (
                authError ?? (await mutate(() => handleDeleteDog(id, origin)))
              );
            }
            if (
              parts[2] === "photos" &&
              parts.length === 3 &&
              request.method === "POST"
            ) {
              const authError = requireAuth(request, origin);
              return (
                authError ??
                (await mutate(() => handleUploadPhotos(id, request, origin)))
              );
            }
            if (
              parts[2] === "photos" &&
              parts[3] &&
              parts.length === 4 &&
              request.method === "DELETE"
            ) {
              const authError = requireAuth(request, origin);
              return (
                authError ??
                (await mutate(() =>
                  handleDeletePhoto(id, decodeURIComponent(parts[3]), origin),
                ))
              );
            }
          }

          if (
            parts[0] === "images" &&
            parts[1] === "dogs" &&
            parts[2] &&
            parts[3] &&
            parts.length === 4 &&
            request.method === "GET"
          ) {
            return await serveImage(
              decodeURIComponent(parts[2]),
              decodeURIComponent(parts[3]),
              origin,
            );
          }

          return error("Not found", 404, origin);
        } catch (err) {
          if (err instanceof BadRequest || err instanceof URIError)
            return error(err.message, 400, origin);
          if ((err as NodeJS.ErrnoException).code === "23505")
            return error("Duplicate dog name", 409, origin);
          console.error(
            "API request failed",
            (err as NodeJS.ErrnoException).code || "unexpected error",
          );
          return error("Internal server error", 500, origin);
        }
      },
    });
  } catch (err) {
    await pool.end();
    throw new Error(
      `Cannot bind the loopback API port (${PORT}); choose an unused PORT and matching PAWS_PUBLIC_API_URL. ${(err as NodeJS.ErrnoException).code || ""}`,
    );
  }
  return {
    server,
    async stop() {
      await server.stop(true);
      await mutationQueue;
      await pool.end();
    },
  };
}

if (import.meta.main) {
  try {
    const api = await startApi();
    console.log(
      `Paws API listening on ${api.server.url.origin} (loopback only)`,
    );
    const shutdown = async () => {
      await api.stop();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error(err instanceof Error ? err.message : "API startup failed");
    process.exit(1);
  }
}
