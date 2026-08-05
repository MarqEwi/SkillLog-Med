// Erzeugt Vorschau-Screenshots der App (Handy-Format) unter docs/screenshots/.
//
//   node scripts/screenshots.mjs
//
// Setzt einen laufenden Webserver auf Port 8931 voraus:
//   python3 -m http.server 8931
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const ZIEL = "docs/screenshots";
mkdirSync(ZIEL, { recursive: true });

// Chromium formatiert <input type="date"> nach der System-Locale des
// Prozesses – die Locale des Playwright-Kontexts genügt dafür NICHT, und
// --lang allein auch nicht. Ohne LANG steht im Screenshot MM/TT/JJJJ.
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--lang=de-DE"],
  env: { ...process.env, LANG: "de_DE.UTF-8", LC_ALL: "de_DE.UTF-8" }
});

async function schuss(name, { dunkel = false, schritte }){
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 892 }, deviceScaleFactor: 2,
    colorScheme: dunkel ? "dark" : "light",
    // Ohne deutsche Locale zeigt das Datumsfeld das US-Format MM/TT/JJJJ.
    locale: "de-DE", timezoneId: "Europe/Berlin"
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem("slm_onboarding_done", "true"));
  await page.goto("http://127.0.0.1:8931/index.html");
  await page.waitForFunction(() => !!window.SLM);
  await page.evaluate(() => {
    const SLM = window.SLM;
    /* Beispieldaten plus Profil und Favoriten, damit die Screenshots die
       Funktionen zeigen. */
    SLM.Daten.beispieleLaden();
    SLM.Katalog.favorit("iv-zugang", true);
    SLM.Katalog.favorit("intubation", true);
    SLM.Profil.set({ name: "Alex Muster", rolle: "PJ-Student:in",
      institution: "Uniklinik Beispielstadt" });
  });
  await page.evaluate(() => location.reload());
  await page.waitForFunction(() => !!window.SLM);
  if (schritte) await schritte(page);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${ZIEL}/${name}.png` });
  console.log(`${ZIEL}/${name}.png`);
  await ctx.close();
}

await schuss("01-dashboard", {});
await schuss("02-dashboard-dunkel", { dunkel: true });
await schuss("03-logbuch", { schritte: async p => {
  await p.click('nav.tabs button[data-tab="liste"]');
} });
await schuss("04-formular", { schritte: async p => {
  await p.click("#btn-neu");
  await p.click('#f-mgrid [data-m="intubation"]');
  await p.click('#f-stufe [data-v="assistiert"]');
} });
await schuss("05-detail", { schritte: async p => {
  await p.click('nav.tabs button[data-tab="liste"]');
  await p.click("#liste-inhalt .row");
} });
await schuss("06-statistik", { schritte: async p => {
  await p.click('nav.tabs button[data-tab="stats"]');
  await p.click('#stats-zeit [data-z="alle"]');
} });
await schuss("07-export", { schritte: async p => {
  await p.click('nav.tabs button[data-tab="export"]');
  await p.click('#ex-quick [data-z="alle"]');
  await p.fill("#ex-block", "PJ Chirurgie");
} });
await schuss("08-filter-dunkel", { dunkel: true, schritte: async p => {
  await p.click('nav.tabs button[data-tab="liste"]');
  await p.click("#filter-zeit [data-panel]");
} });

await browser.close();
