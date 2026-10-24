import { describe, expect, test } from "bun:test";
import { readConfig } from "../server/config";
import { randomBytes, createHash } from "node:crypto";

const configured = () => ({
  DATABASE_URL: "postgresql://paws:unused@127.0.0.1:5432/paws_local",
  PAWS_ADMIN_EMAIL: "admin@example.invalid",
  PAWS_ADMIN_PASSWORD_SHA256: createHash("sha256")
    .update(randomBytes(32))
    .digest("hex"),
  PAWS_SESSION_SECRET: randomBytes(32).toString("hex"),
});

describe("safe optional backend configuration", () => {
  test("missing setup gives actionable configuration errors", () => {
    expect(() => readConfig({})).toThrow("DATABASE_URL");
    expect(() =>
      readConfig({ DATABASE_URL: configured().DATABASE_URL }),
    ).toThrow("PAWS_ADMIN_EMAIL");
  });
  test("email and public forms stay disabled by default", () => {
    const config = readConfig(configured());
    expect(config.formEnabled).toBe(false);
    expect(config.formEmailDryRun).toBe(true);
    expect(config.publicApiUrl).toBe("http://127.0.0.1:3314");
    expect(config.allowedOrigins).toEqual([
      "http://localhost:4321",
      "http://127.0.0.1:4321",
    ]);
  });
  test("remote databases and malformed auth are rejected", () => {
    expect(() =>
      readConfig({
        ...configured(),
        DATABASE_URL: "postgresql://paws@db.example.invalid/paws",
      }),
    ).toThrow("local PostgreSQL");
    expect(() =>
      readConfig({ ...configured(), PAWS_ADMIN_PASSWORD_SHA256: "not-a-hash" }),
    ).toThrow("64 hexadecimal");
    expect(() =>
      readConfig({ ...configured(), PAWS_SESSION_SECRET: "short" }),
    ).toThrow("32");
  });
  test("email needs an explicit opt-in and complete SMTP configuration", () => {
    expect(() =>
      readConfig({ ...configured(), PAWS_FORM_EMAIL_DRY_RUN: "false" }),
    ).toThrow("SMTP");
    expect(() =>
      readConfig({ ...configured(), PAWS_FORM_ENABLED: "yes" }),
    ).toThrow("true or false");
  });
});
