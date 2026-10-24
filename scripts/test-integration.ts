import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, rm, mkdir, readdir, symlink, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";
import sharp from "sharp";
import { startApi } from "../server/paws-api";
import { applySchema, seedDemo } from "./db";
import { assertLocalDatabase } from "../server/config";
import { demoDogs } from "../src/data/demoDogs";

// Never silently reuse DATABASE_URL: tests require a dedicated, empty test database.
const connectionString = process.env.TEST_DATABASE_URL || "";
assertLocalDatabase(connectionString);
if (!/^\/paws_test_[a-z0-9_]+$/.test(new URL(connectionString).pathname))
  throw new Error(
    "TEST_DATABASE_URL must name a disposable paws_test_* local database, not the application database.",
  );
const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });
const projectRoot = await mkdtemp(path.join(tmpdir(), "paws-api-test-"));
const password = randomBytes(32).toString("base64url");
const env = {
  DATABASE_URL: connectionString,
  PAWS_ADMIN_EMAIL: "admin@example.invalid",
  PAWS_ADMIN_PASSWORD_SHA256: createHash("sha256")
    .update(password)
    .digest("hex"),
  PAWS_SESSION_SECRET: randomBytes(32).toString("hex"),
  PAWS_PROJECT_ROOT: projectRoot,
  PAWS_PUBLIC_API_URL: "http://127.0.0.1:3314",
  PORT: "0",
};
let api: Awaited<ReturnType<typeof startApi>> | undefined;
let assertions = 0;
function eq(actual: unknown, expected: unknown) {
  assert.deepEqual(actual, expected);
  assertions++;
}
try {
  const tables = await pool.query(
    "select tablename from pg_tables where schemaname='public'",
  );
  eq(tables.rows, []);
  await assert.rejects(startApi(env), /db:setup/);
  assertions++;
  await applySchema(connectionString);
  await applySchema(connectionString);
  eq(await seedDemo(connectionString), demoDogs.length);
  eq(await seedDemo(connectionString), 0);
  api = await startApi(env);
  const origin = api.server.url.origin;
  let token = "";
  const request = async (
    route: string,
    method = "GET",
    body?: unknown,
    auth = false,
    extraHeaders: Record<string, string> = {},
  ) => {
    const headers = {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(auth ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    };
    const response = await fetch(origin + route, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      headers: response.headers,
      body: (await response.json()) as any,
    };
  };
  eq((await request("/health")).body, {
    ok: true,
    formsEnabled: false,
    emailDryRun: true,
  });
  const all = await request("/dogs?includeAdopted=true");
  eq(all.body.dogs.length, demoDogs.length);
  eq(
    (await request("/dogs")).body.dogs.length,
    demoDogs.filter((dog) => !dog.is_adopted).length,
  );
  eq((await request("/dogs", "POST", { name: "Test" })).status, 401);
  eq(
    (
      await request("/auth/login", "POST", {
        email: env.PAWS_ADMIN_EMAIL,
        password: "wrong",
      })
    ).status,
    401,
  );
  eq(
    (await request("/auth/login", "POST", { email: [], password: null }))
      .status,
    400,
  );
  eq(
    (
      await request("/forms/submit", "POST", {
        kind: "contact",
        name: "Demo",
        email: "demo@example.invalid",
      })
    ).status,
    503,
  );
  eq(
    (
      await request("/dogs", "GET", undefined, false, {
        Origin: "https://untrusted.example.invalid",
      })
    ).status,
    403,
  );
  eq(
    (
      await request("/dogs", "GET", undefined, false, {
        Origin: "http://localhost:4321",
      })
    ).headers.get("access-control-allow-origin"),
    "http://localhost:4321",
  );
  const login = await request("/auth/login", "POST", {
    email: env.PAWS_ADMIN_EMAIL,
    password,
  });
  eq(login.status, 200);
  token = login.body.token;
  assert.equal(typeof token, "string");
  assertions++;
  const seededId = demoDogs[0].id;
  eq(
    (
      await request(
        `/dogs/${seededId}`,
        "PUT",
        { age: "Edited local age" },
        true,
      )
    ).status,
    200,
  );
  eq(await seedDemo(connectionString), 0);
  eq((await request(`/dogs/${seededId}`)).body.dog.age, "Edited local age");
  for (const invalid of [
    { name: "🐾" },
    { name: 42 },
    { name: "Test", is_adopted: "false" },
    { name: "Test", traits: { energia: 9 } },
    { name: "Test", photo_url: "https://remote.example.invalid/photo.jpg" },
  ]) {
    eq((await request("/dogs", "POST", invalid, true)).status, 400);
  }
  const created = await request(
    "/dogs",
    "POST",
    {
      name: "Test Comet",
      size: "small-medium",
      sex: "male",
      age: "Nasceu em 2023",
      description: "Acolhimento: Família de exemplo",
      traits: { energia: 2, receio: 1, carente: true },
    },
    true,
  );
  eq(created.status, 201);
  const id = created.body.dog.id;
  eq(
    (await request(`/dogs/${id}`, "PUT", { name: "Unauthorized" })).status,
    401,
  );
  eq((await request(`/dogs/${id}`, "DELETE")).status, 401);
  eq((await request(`/dogs/${id}/photos`, "POST")).status, 401);
  eq((await request(`/dogs/${id}/photos/photo-01.jpg`, "DELETE")).status, 401);
  eq(
    (
      await request("/dogs", "POST", { name: "Forged token" }, false, {
        Authorization: `Bearer ${token}tampered`,
      })
    ).status,
    401,
  );
  const malformed = await fetch(origin + "/dogs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{broken",
  });
  eq(malformed.status, 400);
  eq((await request(`/dogs/${id}`)).body.dog.traits, {
    energia: 2,
    receio: 1,
    carente: true,
  });
  eq(
    (await request("/dogs", "POST", { name: "Test Cómét" }, true)).status,
    409,
  );
  eq(
    (await request(`/dogs/${id}`, "PUT", { is_adopted: true }, true)).body.dog
      .is_adopted,
    true,
  );
  eq((await request(`/dogs/${id}`)).body.dog.is_adopted, true);
  eq(
    (await request("/dogs")).body.dogs.some((dog: any) => dog.id === id),
    false,
  );
  eq(
    (
      await request(
        `/dogs/${id}`,
        "PUT",
        { is_adopted: false, sex: null },
        true,
      )
    ).body.dog.sex,
    null,
  );
  eq((await request(`/dogs/${id}`)).body.dog.is_adopted, false);
  const png = await sharp({
    create: { width: 32, height: 24, channels: 3, background: "#ab5632" },
  })
    .png()
    .toBuffer();
  const upload = async (content: Uint8Array, type = "image/png") => {
    const form = new FormData();
    form.append(
      "photos",
      new File([new Uint8Array(content).buffer], "../../arbitrary.png", {
        type,
      }),
    );
    const response = await fetch(`${origin}/dogs/${id}/photos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return { status: response.status, body: (await response.json()) as any };
  };
  eq((await upload(new TextEncoder().encode("not an image"))).status, 400);
  eq((await upload(new Uint8Array(5 * 1024 * 1024 + 1))).status, 400);
  const uploaded = await upload(new Uint8Array(png));
  eq(uploaded.status, 200);
  eq(uploaded.body.dog.photos.length, 1);
  const imagePath = new URL(uploaded.body.uploaded[0]).pathname;
  const image = await fetch(origin + imagePath);
  eq(image.status, 200);
  eq(image.headers.get("content-type"), "image/jpeg");
  const imageBuffer = Buffer.from(await image.arrayBuffer());
  eq((await sharp(imageBuffer).metadata()).width, 32);
  const photoRows = await pool.query(
    "select filename from dog_photos where dog_id=$1",
    [id],
  );
  eq(photoRows.rows, [{ filename: "photo-01.jpg" }]);
  eq(
    (await request(`/dogs/${id}`, "PUT", { name: "Test Nova" }, true)).status,
    200,
  );
  const renamed = (await request(`/dogs/${id}`)).body.dog;
  eq(
    new URL(renamed.photos[0]).pathname,
    "/images/dogs/test-nova/photo-01.jpg",
  );
  eq((await fetch(origin + imagePath)).status, 404);
  eq((await fetch(origin + "/images/dogs/test-nova/photo-01.jpg")).status, 200);
  eq(
    (
      await request(
        `/dogs/${id}/photos/photo-01.jpg`,
        "DELETE",
        undefined,
        true,
      )
    ).body.dog.photos,
    [],
  );
  eq((await fetch(origin + "/images/dogs/test-nova/photo-01.jpg")).status, 404);
  eq(
    (
      await pool.query(
        "select count(*)::integer as count from dog_photos where dog_id=$1",
        [id],
      )
    ).rows[0].count,
    0,
  );
  await upload(new Uint8Array(png));
  eq((await request(`/dogs/${id}`, "DELETE", undefined, true)).status, 200);
  eq((await request(`/dogs/${id}`)).status, 404);
  eq(
    (
      await pool.query(
        "select count(*)::integer as count from dogs where id=$1",
        [id],
      )
    ).rows[0].count,
    0,
  );
  eq((await readdir(path.join(projectRoot, "archive/dog-photos"))).length, 1);
  // A directory symlink cannot redirect media writes outside the owned storage root.
  const linkDog = (await request("/dogs", "POST", { name: "Test Link" }, true))
    .body.dog;
  const outside = path.join(projectRoot, "outside");
  await mkdir(outside);
  await symlink(
    outside,
    path.join(projectRoot, "storage/dog-photos/test-link"),
  );
  eq(
    (await request(`/dogs/${linkDog.id}`, "DELETE", undefined, true)).status,
    400,
  );
  eq((await readdir(outside)).length, 0);
  await unlink(path.join(projectRoot, "storage/dog-photos/test-link"));
  eq(
    (await request(`/dogs/${linkDog.id}`, "DELETE", undefined, true)).status,
    200,
  );
  // Reopen a fresh API instance against the same DB: prove persistence, not just an in-memory response.
  await api.stop();
  api = await startApi({ ...env, PAWS_FORM_ENABLED: "true" });
  const formResponse = await fetch(api.server.url.origin + "/forms/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "contact",
      locale: "en",
      name: "Fictional tester",
      email: "tester@example.invalid",
      message: "Local test only",
    }),
  });
  eq(formResponse.status, 201);
  const submission = (await formResponse.json()) as any;
  eq(submission.emailSent, false);
  eq(submission.dryRun, true);
  eq(
    (
      await pool.query(
        "select name,email_sent,email_dry_run from form_submissions where id=$1",
        [submission.submissionId],
      )
    ).rows,
    [{ name: "Fictional tester", email_sent: false, email_dry_run: true }],
  );
  const persisted = await fetch(
    api.server.url.origin + "/dogs?includeAdopted=true",
  );
  eq(((await persisted.json()) as any).dogs.length, demoDogs.length);
  console.log(
    `PASS: ${assertions} integration assertions; clean schema twice, seed twice, HTTP auth/CRUD/traits/status/photos/rename/archive/symlink protection, PostgreSQL persistence, disabled forms and opt-in dry-run storage. No email transport invoked.`,
  );
} finally {
  if (api) await api.stop();
  await pool.end();
  await rm(projectRoot, { recursive: true, force: true });
}
