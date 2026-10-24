import { afterEach, beforeAll, beforeEach, expect, spyOn, test } from "bun:test";
import { shelter } from "../src/config/shelter";
import type {
  FormSubmissionPayload,
  submitFormSubmission,
} from "../src/lib/formSubmission";

// Synthetic HTTP responses exercise the client contract, not persistence or SMTP.
const payload: FormSubmissionPayload = {
  kind: "contact",
  locale: "en",
  source: "contract-test",
  pageUrl: "https://shelter.example.invalid/contact",
  name: "Demo Visitor",
  email: "visitor@example.invalid",
  message: "Synthetic contact request",
};

let submit: typeof submitFormSubmission;
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">>;
let previousEnabled: boolean;

beforeAll(async () => {
  const previousApiUrl = process.env.PUBLIC_API_URL;
  const modulePath = require.resolve("../src/lib/formSubmission.ts");
  const previousModule = require.cache[modulePath];
  try {
    process.env.PUBLIC_API_URL = "https://api.example.invalid/";
    // Bun caches ESM across test files, including query-string imports. Load a
    // fresh environment snapshot, then restore the other tests' cached module.
    delete require.cache[modulePath];
    submit = (await import(modulePath)).submitFormSubmission;
  } finally {
    if (previousModule) require.cache[modulePath] = previousModule;
    else delete require.cache[modulePath];
    if (previousApiUrl === undefined) delete process.env.PUBLIC_API_URL;
    else process.env.PUBLIC_API_URL = previousApiUrl;
  }
});

beforeEach(() => {
  previousEnabled = shelter.forms.enabled;
  shelter.forms.enabled = true;
  fetchSpy = spyOn(globalThis, "fetch").mockRejectedValue(
    new Error("Unexpected network request in form contract test"),
  );
});

afterEach(() => {
  shelter.forms.enabled = previousEnabled;
  fetchSpy.mockRestore();
});

const submissionId = "24a930de-6c52-48de-a199-5a21c05e01c7";
const delivered = { ok: true, submissionId, emailSent: true, dryRun: false };

test("disabled forms do not fetch even when an API is configured", async () => {
  shelter.forms.enabled = false;

  expect(await submit(payload)).toEqual({ status: "disabled" });
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("explicitly skipping the backend does not fetch or report sent", async () => {
  expect(await submit(payload, { skipBackend: true })).toEqual({
    status: "fallback",
    error: "Backend unavailable",
  });
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("an enabled form without an API does not fetch or report sent", async () => {
  // A fresh runtime prevents cached import.meta.env values from another mode.
  const child = Bun.spawn([process.execPath, "--no-env-file", "--eval", `
    const { shelter } = await import("./src/config/shelter.ts");
    const { submitFormSubmission } = await import("./src/lib/formSubmission.ts");
    shelter.forms.enabled = true;
    let fetchCalls = 0;
    globalThis.fetch = async () => { fetchCalls++; throw new Error("Unexpected fetch"); };
    const result = await submitFormSubmission(${JSON.stringify(payload)});
    console.log(JSON.stringify({ result, fetchCalls }));
  `], {
    cwd: new URL("../", import.meta.url).pathname,
    env: { ...process.env, PUBLIC_API_URL: "" },
    stdout: "pipe",
    stderr: "pipe",
  });

  expect(await child.exited).toBe(0);
  expect(JSON.parse(await new Response(child.stdout).text())).toEqual({
    result: { status: "fallback", error: "Backend unavailable" },
    fetchCalls: 0,
  });
});

test("confirmed storage and email delivery report sent without dry-run", async () => {
  fetchSpy.mockResolvedValue(Response.json(delivered, { status: 201 }));

  expect(await submit(payload)).toEqual({ status: "sent", submissionId, dryRun: false });
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  expect(fetchSpy).toHaveBeenCalledWith("https://api.example.invalid/forms/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: expect.any(AbortSignal),
  });
});

test("confirmed stored dry-run preserves the UI flag and does not claim email delivery", async () => {
  fetchSpy.mockResolvedValue(Response.json({
    ok: true, submissionId, emailSent: false, dryRun: true,
  }, { status: 201 }));

  expect(await submit(payload)).toEqual({ status: "sent", submissionId, dryRun: true });
});

test.each([
  ["empty object", {}],
  ["ambiguous ok", { ok: true }],
  ["ignored honeypot", { ok: true, ignored: true }],
  ["null", null],
  ["array", []],
  ["string", "ok"],
  ["boolean", true],
  ["number", 1],
  ["missing ok", { submissionId, emailSent: true, dryRun: false }],
  ["false ok", { ...delivered, ok: false }],
  ["string ok", { ...delivered, ok: "true" }],
  ["numeric ok", { ...delivered, ok: 1 }],
  ["missing ID", { ok: true, emailSent: true, dryRun: false }],
  ["null ID", { ...delivered, submissionId: null }],
  ["numeric ID", { ...delivered, submissionId: 123 }],
  ["object ID", { ...delivered, submissionId: {} }],
  ["empty ID", { ...delivered, submissionId: "" }],
  ["blank ID", { ...delivered, submissionId: "  " }],
  ["missing email result", { ok: true, submissionId, dryRun: false }],
  ["string email result", { ...delivered, emailSent: "true" }],
  ["numeric email result", { ...delivered, emailSent: 1 }],
  ["failed email without dry-run", { ...delivered, emailSent: false }],
  ["missing delivery mode", { ok: true, submissionId, emailSent: true }],
  ["string delivery mode", { ...delivered, dryRun: "false" }],
  ["conflicting delivered and dry-run", { ...delivered, dryRun: true }],
  ["dry-run without email result", { ok: true, submissionId, dryRun: true }],
  ["dry-run with ambiguous email result", { ...delivered, emailSent: null, dryRun: true }],
] satisfies [string, unknown][])(
  "malformed 2xx response (%s) is not reported as sent",
  async (_label, body) => {
    fetchSpy.mockResolvedValue(Response.json(body, { status: 201 }));

    expect(await submit(payload)).toMatchObject({
      status: "fallback",
      error: "Backend returned 201",
    });
  },
);

test.each([
  ["invalid JSON", new Response("not JSON", { status: 200 })],
  ["empty 204", new Response(null, { status: 204 })],
])("malformed success body (%s) is not reported as sent", async (_label, response) => {
  fetchSpy.mockResolvedValue(response);

  expect(await submit(payload)).toMatchObject({ status: "fallback" });
});

test("an email error preserves the stored submission ID without reporting sent", async () => {
  fetchSpy.mockResolvedValue(Response.json({
    ok: false, submissionId, emailSent: false, error: "Email delivery failed",
  }, { status: 503 }));

  expect(await submit(payload)).toEqual({
    status: "fallback",
    error: "Email delivery failed",
    submissionId,
  });
});

test("an HTTP failure cannot be overridden by a success-shaped body", async () => {
  fetchSpy.mockResolvedValue(Response.json(delivered, { status: 500 }));

  expect(await submit(payload)).toEqual({
    status: "fallback",
    error: "Backend returned 500",
    submissionId,
  });
});

test("a network failure does not report sent", async () => {
  fetchSpy.mockRejectedValue(new TypeError("Synthetic network failure"));

  expect(await submit(payload)).toEqual({ status: "fallback", error: "Synthetic network failure" });
});

test("a non-Error rejection does not report sent", async () => {
  fetchSpy.mockRejectedValue("Synthetic rejection");

  expect(await submit(payload)).toEqual({ status: "fallback", error: "Network error" });
});

test("a timed-out request is aborted and does not report sent", async () => {
  let requestSignal: AbortSignal | null | undefined;
  const abortableFetch: typeof fetch = Object.assign(
    (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
      new Promise<Response>((_resolve, reject) => {
        requestSignal = init?.signal;
        requestSignal?.addEventListener("abort", () => {
          reject(new DOMException("Synthetic request aborted", "AbortError"));
        }, { once: true });
      }),
    { preconnect: globalThis.fetch.preconnect },
  );
  fetchSpy.mockImplementationOnce(abortableFetch);

  expect(await submit(payload)).toEqual({ status: "fallback", error: "Backend request timed out" });
  expect(requestSignal?.aborted).toBe(true);
}, 15000);
