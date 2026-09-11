// Project cover screenshots → public/shots/<id>.jpg (1280×800, q82).
// JPEG rather than WebP: some browsers/extensions refused the extended-format WebP.
//
// Sources come from scripts/shots.config.json: a live URL is captured with the
// locally installed Chrome (puppeteer-core — nothing is downloaded, and this
// never runs as part of `npm run build`); { url, authEnv } captures a page
// behind HTTP Basic Auth with "user:pass" taken from that env var; a { file }
// entry is a local image rendered cover-fit into the same frame. An optional
// { form: { input, valueEnv, submit } } types a secret from env into a field
// (e.g. an admin token) before the shot — the value never touches the repo.
// { steps: [...] } runs simple interactions first: { wait: ms }, { click: css },
// { clickText: "label" }, { type: css, value | valueEnv }, { press: "Enter" },
// { hideText: "…" } (blank a transient banner for the shot). Existing files are skipped unless
// --force is passed. Afterwards src/data/shots.ts is regenerated from the
// files that exist, so the site picks the covers up automatically.
//
//   npm run shots            # capture missing covers
//   npm run shots -- --force # re-capture everything
//   npm run shots -- resite  # only these ids
//   CHROME_PATH=/path/to/chrome npm run shots

import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../public/shots");
const MANIFEST = resolve(__dirname, "../src/data/shots.ts");
const CONFIG = JSON.parse(readFileSync(resolve(__dirname, "shots.config.json"), "utf8"));

const WIDTH = 1280;
const HEIGHT = 800;
const QUALITY = 82;
const NAV_TIMEOUT = 45_000;
const SETTLE_MS = 1_500;

const argv = process.argv.slice(2);
const force = argv.includes("--force");
const only = argv.filter((a) => !a.startsWith("--"));

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  for (const bin of ["google-chrome", "chromium", "chromium-browser"]) {
    try {
      return execSync(`which ${bin}`, { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
    } catch {
      /* try next */
    }
  }
  throw new Error("No Chrome found. Set CHROME_PATH=/path/to/chrome.");
}

/** Best-effort: hide the usual cookie/consent banners before shooting. */
async function dismissBanners(page) {
  await page
    .evaluate(() => {
      const sel = [
        "[id*='cookie']",
        "[class*='cookie']",
        "[id*='consent']",
        "[class*='consent']",
        "[aria-label*='cookie' i]",
      ];
      for (const el of document.querySelectorAll(sel.join(","))) {
        const r = el.getBoundingClientRect();
        if (r.height > 40 && r.width > 200) el.style.display = "none";
      }
    })
    .catch(() => {});
}

/** Generic interaction steps run after navigation (see shots.config.json). */
async function runSteps(page, steps) {
  for (const step of steps) {
    if (step.wait) await new Promise((r) => setTimeout(r, step.wait));
    if (step.click) await page.click(step.click);
    if (step.clickText) {
      const ok = await page.evaluate((text) => {
        const el = [...document.querySelectorAll("button, a, [role=button], [role=tab]")].find((e) =>
          e.textContent.trim().includes(text),
        );
        if (el) el.click();
        return !!el;
      }, step.clickText);
      if (!ok) throw new Error(`clickText: nothing matches "${step.clickText}"`);
    }
    if (step.type) {
      const value = step.valueEnv ? process.env[step.valueEnv] : step.value;
      if (!value) throw new Error(`type: no value for ${step.type}`);
      await page.waitForSelector(step.type, { timeout: 10_000 });
      await page.type(step.type, value);
    }
    if (step.press) await page.keyboard.press(step.press);
    if (step.hideText) {
      // Hide the innermost element containing this text (e.g. a transient error banner).
      await page.evaluate((text) => {
        const all = [...document.querySelectorAll("body *")].filter((e) => e.textContent.includes(text));
        const innermost = all.filter((e) => ![...e.children].some((c) => c.textContent.includes(text)));
        for (const el of innermost) el.style.visibility = "hidden";
      }, step.hideText);
    }
  }
}

async function shootUrl(page, url, out, authEnv, form, steps) {
  if (authEnv) {
    const cred = process.env[authEnv];
    if (!cred) throw new Error(`env ${authEnv} not set (expected user:pass)`);
    const [username, ...rest] = cred.split(":");
    await page.authenticate({ username, password: rest.join(":") });
  }
  await page.goto(url, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT });
  if (form) {
    // { input, valueEnv, submit }: type a secret from env into a field and submit.
    const value = process.env[form.valueEnv];
    if (!value) throw new Error(`env ${form.valueEnv} not set`);
    await page.waitForSelector(form.input, { timeout: 10_000 });
    await page.type(form.input, value);
    if (form.submit) await page.click(form.submit);
    else await page.keyboard.press("Enter");
    await page.waitForNetworkIdle({ timeout: NAV_TIMEOUT }).catch(() => {});
  }
  if (steps) await runSteps(page, steps);
  await new Promise((r) => setTimeout(r, SETTLE_MS));
  await dismissBanners(page);
  await page.screenshot({ path: out, type: "jpeg", quality: QUALITY });
}

async function shootFile(page, file, out) {
  if (!existsSync(file)) throw new Error(`file not found: ${file}`);
  const html = join(tmpdir(), `shot-${Date.now()}.html`);
  writeFileSync(
    html,
    `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#0a0a0b}
img{display:block;width:${WIDTH}px;height:${HEIGHT}px;object-fit:cover;object-position:top}</style>
<img src="${pathToFileURL(file).href}">`,
  );
  await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: out, type: "jpeg", quality: QUALITY });
}

function writeManifest() {
  const ids = existsSync(OUT_DIR)
    ? readdirSync(OUT_DIR)
        .filter((f) => f.endsWith(".jpg"))
        .map((f) => f.replace(/\.jpg$/, ""))
        .sort()
    : [];
  const body = ids.map((id) => `  ${JSON.stringify(id)},`).join("\n");
  writeFileSync(
    MANIFEST,
    `/**
 * Quest ids that have a screenshot at /public/shots/<id>.jpg (${WIDTH}×${HEIGHT}, q${QUALITY}).
 * GENERATED by scripts/capture-shots.mjs (\`npm run shots\`) — do not edit by hand.
 */
export const SHOTS = new Set<string>([
${body}
]);
`,
  );
  console.log(`[shots] manifest: ${ids.length} cover(s) → src/data/shots.ts`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const entries = Object.entries(CONFIG).filter(
    ([id]) => !id.startsWith("_") && (only.length === 0 || only.includes(id)),
  );

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
  });

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  try {
    for (const [id, src] of entries) {
      const out = join(OUT_DIR, `${id}.jpg`);
      if (!force && existsSync(out)) {
        skipped++;
        continue;
      }
      const page = await browser.newPage();
      await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
      try {
        if (typeof src === "string") await shootUrl(page, src, out);
        else if (src.url) await shootUrl(page, src.url, out, src.authEnv, src.form, src.steps);
        else await shootFile(page, src.file, out);
        console.log(`[shots] ✓ ${id}`);
        ok++;
      } catch (err) {
        console.warn(`[shots] ✗ ${id}: ${err.message}`);
        failed++;
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  writeManifest();
  console.log(`[shots] done — ${ok} captured, ${skipped} skipped, ${failed} failed`);
}

main().catch((err) => {
  console.error(`[shots] fatal: ${err.message}`);
  process.exit(1);
});
