// Native Zweige: Diese Fehlerklasse ist im Browser unsichtbar, weil die
// Web-Wege (a.download, window.print) klaglos funktionieren, während die
// WebView sie still ignoriert. Deshalb wird hier die App-Umgebung
// nachgestellt und geprüft, dass die Capacitor-Plugins wirklich aufgerufen
// werden.
import { test, expect } from "@playwright/test";
import { appOeffnen, eintragAnlegen, capacitorMock } from "./helfer.mjs";

test.beforeEach(async ({ page }) => {
  await appOeffnen(page, { vorher: capacitorMock });
});

function base64Decode(data){
  return Buffer.from(data, "base64");
}

test("PDF-Bericht läuft über Filesystem und Share, Datei ist ein PDF", async ({ page }) => {
  await eintragAnlegen(page, { massnahme: "iv-zugang", datum: "2026-03-10" });
  await page.click('nav.tabs button[data-tab="export"]');
  await page.click('#ex-quick [data-z="alle"]');
  await page.click("#ex-pdf");
  await page.waitForFunction(() => window.__calls.some(c => c.name === "Share.share"));

  const calls = await page.evaluate(() => window.__calls);
  const write = calls.find(c => c.name === "Filesystem.writeFile");
  const uri = calls.find(c => c.name === "Filesystem.getUri");
  const share = calls.find(c => c.name === "Share.share");

  expect(write).toBeTruthy();
  expect(write.arg.path).toMatch(/^skilllog-med-bericht-\d{8}\.pdf$/);
  // Ohne Bundler gibt es kein Directory-Enum: der String "CACHE" ist Pflicht.
  expect(write.arg.directory).toBe("CACHE");
  expect(uri.arg.directory).toBe("CACHE");
  expect(share.arg.files[0]).toBe("file:///cache/" + write.arg.path);

  const pdf = base64Decode(write.arg.data);
  expect(pdf.slice(0, 8).toString("latin1")).toContain("%PDF-1.4");
  expect(pdf.toString("latin1")).toContain("%%EOF");
});

test("CSV-Export schreibt Kopfzeile und Daten mit BOM", async ({ page }) => {
  await eintragAnlegen(page, { massnahme: "blutentnahme", datum: "2026-03-10", zeit: "07:45" });
  await page.click('nav.tabs button[data-tab="export"]');
  await page.click('#ex-quick [data-z="alle"]');
  await page.click("#ex-csv");
  await page.waitForFunction(() => window.__calls.some(c => c.name === "Share.share"));

  const calls = await page.evaluate(() => window.__calls);
  const write = calls.find(c => c.name === "Filesystem.writeFile");
  expect(write.arg.path).toMatch(/^skilllog-med-eintraege-\d{8}\.csv$/);
  const text = base64Decode(write.arg.data).toString("utf8");
  expect(text.charCodeAt(0)).toBe(0xFEFF);              /* BOM für Excel */
  expect(text).toContain("Datum;Uhrzeit;Maßnahme;Kompetenzstufe");
  expect(text).toContain("2026-03-10;07:45;Blutentnahme;durchgeführt");
});

test("Datensicherung läuft in der App über das Teilen-Menü", async ({ page }) => {
  await eintragAnlegen(page, { massnahme: "reanimation" });
  await page.click('nav.tabs button[data-tab="export"]');
  await page.click("#ex-backup");
  await page.waitForFunction(() => window.__calls.some(c => c.name === "Share.share"));

  const calls = await page.evaluate(() => window.__calls);
  const write = calls.find(c => c.name === "Filesystem.writeFile");
  expect(write.arg.path).toMatch(/^skilllog-med-sicherung-\d{8}\.json$/);
  const obj = JSON.parse(base64Decode(write.arg.data).toString("utf8"));
  expect(obj.app).toBe("SkillLog Med");
  expect(obj.eintraege).toHaveLength(1);
  expect(Array.isArray(obj.katalog)).toBe(true);        /* Stammdaten gehören in die Sicherung */
  expect(Array.isArray(obj.orte)).toBe(true);
});

test("In der App: Druckansicht versteckt, PDF-Knopf heißt teilen", async ({ page }) => {
  await page.click('nav.tabs button[data-tab="export"]');
  await expect(page.locator("#ex-druck")).toBeHidden();
  await expect(page.locator("#ex-pdf-label")).toHaveText("PDF-Bericht erstellen / teilen");
});

test("Zurück-Taste: Dialog → Ansicht → Hinweis → beenden", async ({ page }) => {
  const back = () => page.evaluate(() => window.__listener.backButton());

  /* 1. Offener Dialog wird geschlossen. */
  await page.click("#btn-settings");
  await back();
  await expect(page.locator("#modal-settings")).not.toHaveClass(/open/);

  /* 2. Tiefere Ansicht geht eine Ebene zurück. */
  await page.click('nav.tabs button[data-tab="liste"]');
  await back();
  await expect(page.locator("#view-home")).toHaveClass(/active/);

  /* 3. Auf der Startseite: erst Hinweis, dann exitApp. */
  await back();
  let calls = await page.evaluate(() => window.__calls.filter(c => c.name === "App.exitApp"));
  expect(calls).toHaveLength(0);
  await expect(page.locator("#toast")).toContainText("erneut");
  await back();
  calls = await page.evaluate(() => window.__calls.filter(c => c.name === "App.exitApp"));
  expect(calls).toHaveLength(1);
});
