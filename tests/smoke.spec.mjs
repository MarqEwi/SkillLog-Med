// Grundprüfung: Die App lädt fehlerfrei, zeigt sinnvolle Startzustände und
// belegt im localStorage ausschließlich eigene Schlüssel.
import { test, expect } from "@playwright/test";
import { appOeffnen } from "./helfer.mjs";

test("lädt ohne Konsolenfehler und zeigt den leeren Zustand", async ({ page }) => {
  const fehler = [];
  page.on("console", m => { if (m.type() === "error") fehler.push(m.text()); });
  page.on("pageerror", e => fehler.push("PAGEERROR: " + e.message));

  await appOeffnen(page);

  expect(fehler).toEqual([]);
  await expect(page).toHaveTitle(/SkillLog Med/);
  await expect(page.locator("#view-home")).toHaveClass(/active/);
  await expect(page.locator("#home-inhalt")).toContainText("Noch keine Einträge vorhanden");
  await expect(page.locator("#btn-neu")).toBeVisible();
});

test("Kurzeinführung erscheint beim ersten Start und danach nicht mehr", async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForFunction(() => !!window.SLM);
  await expect(page.locator("#modal-onboarding")).toHaveClass(/open/);

  await page.click("#ob-next");
  await page.click("#ob-next");
  await page.click("#ob-next");
  await expect(page.locator("#modal-onboarding")).not.toHaveClass(/open/);

  await page.reload();
  await page.waitForFunction(() => !!window.SLM);
  await expect(page.locator("#modal-onboarding")).not.toHaveClass(/open/);
});

test("belegt nur localStorage-Schlüssel mit dem Präfix slm_", async ({ page }) => {
  await appOeffnen(page);
  await page.click("#btn-settings");
  await page.click("#s-beispiele");
  await expect(page.locator("#modal-settings")).not.toHaveClass(/open/);

  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.length).toBeGreaterThan(0);
  const fremd = keys.filter(k => !k.startsWith("slm_"));
  expect(fremd).toEqual([]);
});

test("Beispieldaten füllen Dashboard, Logbuch und Statistik", async ({ page }) => {
  await appOeffnen(page);
  await page.click("#btn-settings");
  await page.click("#s-beispiele");

  const anzahl = await page.evaluate(() => window.SLM.Daten.alle().length);
  expect(anzahl).toBeGreaterThan(10);

  await expect(page.locator("#home-inhalt .hero")).toContainText("Einträge");
  await expect(page.locator("#home-inhalt")).toContainText("Zuletzt dokumentiert");

  await page.click('nav.tabs button[data-tab="liste"]');
  await expect(page.locator("#liste-inhalt .row").first()).toBeVisible();

  await page.click('nav.tabs button[data-tab="stats"]');
  await page.click('#stats-zeit [data-z="alle"]');
  await expect(page.locator("#stats-inhalt .bars").first()).toBeVisible();
});

test("Datenschutz-Hinweis ist sichtbar (keine Patientenakte)", async ({ page }) => {
  await appOeffnen(page);
  await expect(page.locator("#home-inhalt")).toContainText("keine Patientenakte");
  await page.click("#btn-neu");
  await expect(page.locator("#view-form")).toContainText("keine Patientenakte");
});
