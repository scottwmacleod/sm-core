// Checks tooling/analytics/sm-posthog.js against a fake browser.
//
//   node scripts/test-posthog.mjs
//
// Part of `npm run check`. No dependencies.
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const file = pathToFileURL(
  resolve(dirname(fileURLToPath(import.meta.url)), "../tooling/analytics/sm-posthog.js"),
);
const failures = [];
const check = (name, ok) => ok || failures.push(name);
let n = 0;

// A fresh copy of the module (it keeps per-page state) in a fresh fake browser.
async function page({ nav = {}, storage = {}, flagsReply, ready = "complete" } = {}) {
  const listeners = {};
  const appended = [];
  const fetches = [];
  const idles = [];
  const ls = { ...storage };
  globalThis.window = globalThis;
  Object.defineProperty(globalThis, "navigator", {
    value: nav,
    configurable: true,
    writable: true,
  });
  globalThis.localStorage = {
    getItem: (k) => ls[k] ?? null,
    setItem: (k, v) => {
      ls[k] = v;
    },
  };
  globalThis.document = {
    readyState: ready,
    head: { append: (el) => appended.push(el) },
    createElement: () => ({}),
  };
  globalThis.addEventListener = (type, fn) => {
    (listeners[type] ??= []).push(fn);
  };
  globalThis.removeEventListener = (type, fn) => {
    listeners[type] = (listeners[type] ?? []).filter((f) => f !== fn);
  };
  globalThis.requestIdleCallback = (fn) => idles.push(fn);
  globalThis.fetch = async (url, init) => {
    fetches.push({ url, body: JSON.parse(init.body) });
    return { ok: true, json: async () => flagsReply ?? { flags: {} } };
  };
  delete globalThis.posthog;
  const mod = await import(`${file.href}?${n++}`);
  const settle = () => new Promise((r) => setTimeout(r, 0));
  return { mod, listeners, appended, fetches, idles, ls, settle };
}

// readFlags turns the /flags v2 answer into variant values.
{
  const { mod } = await page();
  const v = mod.readFlags({
    flags: {
      a: { enabled: true, variant: "test" },
      b: { enabled: true, variant: null },
      c: { enabled: false },
    },
  });
  check(
    "readFlags maps variants, booleans and disabled flags",
    v.a === "test" && v.b === true && v.c === false,
  );
  check("readFlags tolerates an empty answer", Object.keys(mod.readFlags(undefined)).length === 0);
}

// Opted-out visitors get nothing.
for (const nav of [{ globalPrivacyControl: true }, { doNotTrack: "1" }]) {
  const p = await page({ nav });
  p.mod.startPostHog({ token: "phc_x", product: "site" });
  p.idles.forEach((f) => f());
  check(`opted out (${Object.keys(nav)[0]}): no queue`, globalThis.posthog === undefined);
  check(`opted out (${Object.keys(nav)[0]}): no script`, p.appended.length === 0);
  check(`opted out (${Object.keys(nav)[0]}): flag is undefined`, p.mod.flag("a") === undefined);
  p.mod.capture("x"); // must not throw
}

// A normal page: queue now, script only once idle, product registered.
{
  const p = await page();
  p.mod.startPostHog({ token: "phc_x", product: "rollin" });
  check("queue exists straight away", Array.isArray(globalThis.posthog));
  check(
    "product registered",
    globalThis.posthog.some(([m, a]) => m === "register" && a.product === "rollin"),
  );
  check("no script before idle", p.appended.length === 0);
  check("no early flags request without flags: true", p.fetches.length === 0);
  p.mod.capture("rolled", { dice: 2 });
  check(
    "capture is queued",
    globalThis.posthog.some(([m, e]) => m === "capture" && e === "rolled"),
  );
  p.idles.forEach((f) => f());
  await p.settle();
  check(
    "script loads once idle",
    p.appended.length === 1 && p.appended[0].src === "/_sm/static/array.js",
  );
  const [token, config] = globalThis.posthog._i[0] ?? [];
  check("init is queued with the token", token === "phc_x");
  check("no cookies", config?.persistence === "localStorage");
  check("inputs masked in replay", config?.session_recording?.maskAllInputs === true);
  check("api host is the proxy", config?.api_host === "/_sm");
  check("exceptions captured", config?.capture_exceptions === true);
  check("web vitals captured", config?.capture_performance?.web_vitals === true);
  p.listeners.pointerdown?.forEach((f) => f());
  await p.settle();
  check("script loads only once", p.appended.length === 1);
}

// A tap before idle loads the script.
{
  const p = await page({ ready: "loading" });
  p.mod.startPostHog({ token: "phc_x", product: "site" });
  p.listeners.pointerdown.forEach((f) => f());
  await p.settle();
  check("first tap loads the script", p.appended.length === 1);
}

// Experiments: early flags with PostHog's own id, bootstrapped, exposure once.
{
  const saved = { ph_phc_x_posthog: JSON.stringify({ distinct_id: "visitor-1" }) };
  const p = await page({
    storage: saved,
    flagsReply: { flags: { hero: { enabled: true, variant: "test" } } },
  });
  let heard;
  p.mod.onFlags((v) => {
    heard = v;
  });
  p.mod.startPostHog({ token: "phc_x", product: "site", flags: true });
  check("flags fetched early", p.fetches[0]?.url === "/_sm/flags/?v=2");
  check("flags fetched for PostHog's own id", p.fetches[0]?.body.distinct_id === "visitor-1");
  await p.settle();
  await p.settle();
  check("onFlags hears fresh values", heard?.hero === "test");
  check("flag returns the variant", p.mod.flag("hero") === "test");
  p.mod.flag("hero");
  const exposures = globalThis.posthog.filter(
    ([m, e]) => m === "capture" && e === "$feature_flag_called",
  );
  check(
    "exposure recorded once per page",
    exposures.length === 1 && exposures[0][2].$feature_flag_response === "test",
  );
  check("values cached for the next visit", JSON.parse(p.ls.sm_ph_flags).hero === "test");
  p.idles.forEach((f) => f());
  await p.settle();
  const config = globalThis.posthog._i[0]?.[1];
  check("SDK bootstrapped with the id", config?.bootstrap.distinctID === "visitor-1");
  check("SDK bootstrapped with the flags", config?.bootstrap.featureFlags.hero === "test");
}

// The next visit renders the cached variant before PostHog answers.
{
  const p = await page({ storage: { sm_ph_flags: JSON.stringify({ hero: "test" }) } });
  p.mod.startPostHog({ token: "phc_x", product: "site", flags: true });
  check("cached variant available synchronously", p.mod.flag("hero") === "test");
}

// Errors before PostHog loads are queued, then left to PostHog once it has loaded.
{
  const p = await page({ ready: "loading" });
  p.mod.startPostHog({ token: "phc_x", product: "site" });
  const boom = new Error("boom");
  p.listeners.error.forEach((f) => f({ error: boom }));
  p.listeners.unhandledrejection.forEach((f) => f({ reason: "nope" }));
  const queued = globalThis.posthog.filter(([m]) => m === "captureException");
  check("early error queued", queued[0]?.[1] === boom);
  check("early rejection queued", queued[1]?.[1] === "nope");
  p.mod.captureException(boom, { where: "boundary" });
  check(
    "captureException is queued with properties",
    globalThis.posthog.at(-1)?.[2]?.where === "boundary",
  );
  const q = globalThis.posthog;
  globalThis.posthog = { captureException: () => {} }; // PostHog has loaded
  p.listeners.error.forEach((f) => f({ error: boom }));
  check(
    "no early capture once PostHog has loaded",
    q.filter(([m]) => m === "captureException").length === 3,
  );
}

if (failures.length) {
  console.error(`sm-posthog: ${failures.length} failed\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("sm-posthog: all checks passed");
