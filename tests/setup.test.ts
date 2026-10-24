import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("local setup creates fresh private credentials and never overwrites an environment", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "paws-setup-test-"));
  const script = new URL("../scripts/setup-local.ts", import.meta.url).pathname;
  try {
    const create = Bun.spawn([process.execPath, script], {
      cwd: directory,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await create.exited).toBe(0);
    // Generated credential output deliberately remains private, never printed by this test.
    const output = await new Response(create.stdout).text();
    expect(output).toContain("Admin password:");
    const content = await readFile(path.join(directory, ".env"), "utf8");
    expect(content).toMatch(/^PUBLIC_API_URL=$/m);
    expect(content).toMatch(/^PAWS_FORM_ENABLED=false$/m);
    expect(content).toMatch(/^PAWS_FORM_EMAIL_DRY_RUN=true$/m);
    expect(content).toMatch(/^PAWS_ADMIN_PASSWORD_SHA256=[a-f0-9]{64}$/m);
    expect(content).toMatch(/^PAWS_SESSION_SECRET=[a-f0-9]{64}$/m);
    expect((await stat(path.join(directory, ".env"))).mode & 0o777).toBe(0o600);
    const overwrite = Bun.spawn([process.execPath, script], {
      cwd: directory,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await overwrite.exited).toBe(1);
    expect(await new Response(overwrite.stderr).text()).toContain(
      "refusing to overwrite",
    );
    expect(await readFile(path.join(directory, ".env"), "utf8")).toBe(content);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
